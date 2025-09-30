# backend/routes/captcha.py
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
import random, string, io, base64, hashlib, traceback, json, os, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from sqlmodel import select
from backend.db import get_session
from backend.models import CaptchaRequest

router = APIRouter(prefix="/api")
CAPTCHA_CHARS = string.ascii_uppercase + "23456789"
CAPTCHA_LEN = 5

def hash_answer(s: str) -> str:
    return hashlib.sha256(s.strip().lower().encode()).hexdigest()

def random_text(n=CAPTCHA_LEN):
    return "".join(random.choice(CAPTCHA_CHARS) for _ in range(n))

def _measure_text(draw, font, text):
    if hasattr(font, "getbbox"):
        bbox = font.getbbox(text)
        return bbox[2] - bbox[0], bbox[3] - bbox[1]
    if hasattr(draw, "textbbox"):
        bbox = draw.textbbox((0,0), text, font=font)
        return bbox[2] - bbox[0], bbox[3] - bbox[1]
    if hasattr(font, "getsize"):
        return font.getsize(text)
    return (len(text) * 12, 24)

def _load_font(preferred_size: int):
    candidates = [
        "arial.ttf",
        "DejaVuSans.ttf",
        "DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
    ]
    for p in candidates:
        try:
            if os.path.exists(p):
                return ImageFont.truetype(p, preferred_size)
            else:
                # Pillow may find some fonts by name
                return ImageFont.truetype(p, preferred_size)
        except Exception:
            continue
    return ImageFont.load_default()

def _draw_quadratic_curve(draw, start, control, end, width=2, fill=(0,0,0,80)):
    # sample many points along a quadratic bezier and draw lines between them
    pts = []
    steps = 40
    for t in range(steps + 1):
        tt = t / steps
        x = (1-tt)**2 * start[0] + 2*(1-tt)*tt * control[0] + tt**2 * end[0]
        y = (1-tt)**2 * start[1] + 2*(1-tt)*tt * control[1] + tt**2 * end[1]
        pts.append((x,y))
    draw.line(pts, fill=fill, width=width)

def generate_captcha_image(text: str, size=(420,140)):
    w, h = size
    # base image (RGB)
    image = Image.new("RGB", (w, h), (250, 250, 250))
    draw = ImageDraw.Draw(image)

    # attempt to get a decent font
    font = _load_font(64)

    # light vertical banding background for texture
    for i in range(0, w, 8):
        col = 248 - ((i//8) % 6)
        draw.rectangle([(i,0),(i+8, h)], fill=(col, col, col))

    # random thin lines
    for i in range(8):
        start = (random.randint(0, w), random.randint(0, h))
        end = (random.randint(0, w), random.randint(0, h))
        draw.line([start, end], fill=(200,200,200), width=1)

    # space per character
    margin = 20
    avail = w - margin*2
    per = int(avail / max(len(text),1))

    # draw each char on its own transparent layer, rotate, shear-ish and paste
    for i, ch in enumerate(text):
        # create char image slightly wider than per to allow rotation overflow
        char_w = per + 40
        char_h = h
        char_img = Image.new("RGBA", (char_w, char_h), (0,0,0,0))
        cd = ImageDraw.Draw(char_img)

        # color for char (dark, but with some variance)
        base_gray = 18 + random.randint(0,40)
        fill = (base_gray, base_gray + random.randint(0,10), base_gray + random.randint(0,10), 255)

        # draw the character roughly centered in the char_img
        tw, th = _measure_text(cd, font, ch)
        cx = (char_w - tw) // 2 + random.randint(-6,6)
        cy = (char_h - th) // 2 + random.randint(-8,8)
        cd.text((cx, cy), ch, font=font, fill=fill)

        # draw a couple of small strokes over the character to add texture
        for _ in range(2):
            sx = random.randint(0, char_w-1)
            ey = random.randint(0, char_h-1)
            ex = random.randint(0, char_w-1)
            sy = random.randint(0, char_h-1)
            cd.line([(sx,sy),(ex,ey)], fill=(random.randint(80,140),)*3 + (120,), width=1)

        # rotate the char image by random angle
        angle = random.uniform(-28, 28)
        char_img = char_img.rotate(angle, resample=Image.BICUBIC, expand=1)

        # slight horizontal shear: create a new image and paste shifted rows (cheap approx)
        if random.random() < 0.6:
            shear_amount = random.uniform(-6, 6)
            # shifting via affine transform: (1, shear, 0, 0, 1, 0)
            # small shear proportional to width
            try:
                coeffs = (1, shear_amount/100.0, 0, 0, 1, 0)
                char_img = char_img.transform(char_img.size, Image.AFFINE, coeffs, resample=Image.BICUBIC)
            except Exception:
                pass

        # compute paste position on main image
        px = margin + i*per + random.randint(-6, 6)
        py = random.randint(-8, 8)

        # paste with alpha
        image.paste(char_img, (px, py), char_img)

    # draw several wavy/quadratic curves crossing the text
    for _ in range(4):
        start = (random.randint(0, int(w*0.2)), random.randint(0, h))
        end = (random.randint(int(w*0.8), w), random.randint(0, h))
        control = (random.randint(int(w*0.3), int(w*0.7)), random.randint(0, h))
        width = random.randint(2, 4)
        color = (random.randint(60,120),)*3 + (160,)
        _draw_quadratic_curve(draw, start, control, end, width=width, fill=(color[0], color[1], color[2], 200))

    # draw some arcs / ellipses
    for _ in range(3):
        box_w = random.randint(80, w//2)
        box_h = random.randint(30, h)
        x0 = random.randint(0, w - box_w)
        y0 = random.randint(0, max(0, h - box_h))
        bbox = [x0, y0, x0 + box_w, y0 + box_h]
        start_ang = random.randint(0, 360)
        end_ang = start_ang + random.randint(60, 300)
        draw.arc(bbox, start=start_ang, end=end_ang, fill=(random.randint(80,150),)*3, width=random.randint(1,3))

    # speckles / dots
    for _ in range(350):
        x = random.randint(0, w-1)
        y = random.randint(0, h-1)
        v = random.randint(60,220)
        draw.point((x,y), fill=(v, v, v))

    # minor blur / smooth to make it look natural (but not too soft)
    image = image.filter(ImageFilter.SMOOTH)

    return image

class CaptchaOut(BaseModel):
    token: str
    image: str

@router.get('/captcha', response_model=CaptchaOut)
def get_captcha():
    try:
        text = random_text()
        img = generate_captcha_image(text)
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        b64 = base64.b64encode(buf.getvalue()).decode()
        data_url = f'data:image/png;base64,{b64}'

        hashed = hash_answer(text)
        cr = CaptchaRequest(answer_hash=hashed, expires_at=datetime.now(timezone.utc) + timedelta(minutes=6))
        with get_session() as session:
            session.add(cr)
            session.commit()
            session.refresh(cr)
            token = cr.token

        return {'token': token, 'image': data_url}
    except Exception as e:
        tb = traceback.format_exc()
        print("=== /api/captcha ERROR ===")
        print(tb)
        payload = {"ok": False, "error": str(e), "traceback": tb}
        return Response(content=json.dumps(payload, ensure_ascii=False), media_type="application/json", status_code=500)

class VerifyIn(BaseModel):
    token: str
    answer: str

class VerifyOut(BaseModel):
    ok: bool
    reason: str | None = None

@router.post('/verify_captcha', response_model=VerifyOut)
def verify_captcha(data: VerifyIn):
    with get_session() as session:
        stmt = select(CaptchaRequest).where(CaptchaRequest.token == data.token)
        res = session.exec(stmt).first()
        if not res:
            raise HTTPException(status_code=400, detail='token not found or expired')
        if res.is_expired():
            session.delete(res)
            session.commit()
            return {'ok': False, 'reason': 'expired'}
        if res.answer_hash != hash_answer(data.answer):
            session.delete(res)
            session.commit()
            return {'ok': False, 'reason': 'wrong'}
        session.delete(res)
        session.commit()
        return {'ok': True, 'reason': None}

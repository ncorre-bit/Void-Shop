import traceback
import importlib
try:
    # импортируем приложение (backend/app.py)
    from backend.app import app
except Exception as e:
    print("ERROR importing app:")
    traceback.print_exc()
    raise SystemExit(1)

def nice_methods(route):
    try:
        m = getattr(route, "methods", None)
        if m:
            return ",".join(sorted([x for x in m if x != "HEAD"]))
    except Exception:
        return ""
    return ""

print("Registered routes in FastAPI app:")
print("="*60)
for r in app.routes:
    try:
        path = getattr(r, "path", getattr(r, "path_template", str(r)))
        name = getattr(r, "name", r.__class__.__name__)
        methods = nice_methods(r)
        endpoint = getattr(r, "endpoint", None)
        ep_name = getattr(endpoint, "__name__", str(endpoint))
        print(f"{path:40}  methods={methods:12}  name={name:30}  endpoint={ep_name}")
    except Exception:
        print("Failed to inspect route:", r)
        traceback.print_exc()
print("="*60)
print("If paths list is empty -> check that routers are actually included in backend.app")

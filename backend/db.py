# backend/db.py
from sqlmodel import SQLModel, create_engine, Session
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./voidshop.db')

# синхронный engine (удобно для dev и прост)
engine = create_engine(DATABASE_URL, echo=False, connect_args={'check_same_thread': False})

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    return Session(engine)

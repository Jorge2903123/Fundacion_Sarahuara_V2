import os
import secrets
import pymysql
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("DB_PORT", 3306)),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "sarahuaro_v2"),
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
}

JWT_SECRET = os.getenv("JWT_SECRET", secrets.token_urlsafe(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24
PBKDF2_ITERATIONS = 600000
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX = 10

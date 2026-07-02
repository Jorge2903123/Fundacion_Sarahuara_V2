import logging
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRY_HOURS, RATE_LIMIT_WINDOW, RATE_LIMIT_MAX
from database import _hash_password, get_db

log = logging.getLogger("sarahuaro")
router = APIRouter()
security = HTTPBearer(auto_error=False)

_attempts: dict[str, list[float]] = {}


class LoginRequest(BaseModel):
    username: str
    password: str


def _create_jwt(user_id: int, username: str, nombre: str, rol: str) -> str:
    jti = secrets.token_urlsafe(16)
    payload = {
        "jti": jti,
        "user_id": user_id,
        "username": username,
        "nombre": nombre,
        "rol": rol,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


def _is_token_blacklisted(jti: str) -> bool:
    try:
        conn = get_db()
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM token_blacklist WHERE token_jti = %s", (jti,))
            return cur.fetchone() is not None
    except Exception:
        return False
    finally:
        try:
            conn.close()
        except Exception:
            pass


def _verify_token(token: str) -> dict:
    payload = _decode_jwt(token)
    if _is_token_blacklisted(payload["jti"]):
        raise HTTPException(status_code=401, detail="Token revocado")
    return payload


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Token requerido")
    return _verify_token(credentials.credentials)


async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user["rol"] != "admin":
        raise HTTPException(status_code=403, detail="Se requiere rol de administrador")
    return current_user


async def get_any_user(current_user: dict = Depends(get_current_user)):
    if current_user["rol"] not in ("admin", "voluntario"):
        raise HTTPException(status_code=403, detail="Acceso denegado")
    return current_user


def _check_rate_limit(ip: str):
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW
    if ip in _attempts:
        _attempts[ip] = [t for t in _attempts[ip] if t > window_start]
        if len(_attempts[ip]) >= RATE_LIMIT_MAX:
            raise HTTPException(status_code=429, detail=f"Demasiados intentos. Espera {RATE_LIMIT_WINDOW} segundos")
    else:
        _attempts[ip] = []


def _log_auditoria(usuario_id: int, usuario_nombre: str, accion: str, detalle: str = ""):
    try:
        conn = get_db()
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO auditoria_log (usuario_id, usuario_nombre, accion, detalle) VALUES (%s, %s, %s, %s)",
                (usuario_id, usuario_nombre, accion, detalle),
            )
        conn.commit()
        conn.close()
    except Exception as e:
        log.error("Error al registrar auditoria: %s", e)


@router.post("/login")
def login(data: LoginRequest, request: Request):
    client_ip = request.client.host if request.client else "desconocida"
    _check_rate_limit(client_ip)

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, nombre, email, password_hash, password_salt, rol FROM usuarios WHERE email = %s AND activo = 1",
                (data.username,),
            )
            user = cur.fetchone()
            if not user:
                _attempts.setdefault(client_ip, []).append(time.time())
                log.warning("Login fallido: usuario no encontrado %s desde %s", data.username, client_ip)
                raise HTTPException(status_code=401, detail="Credenciales inválidas")

            pwd_hash = _hash_password(data.password, user["password_salt"])
            if pwd_hash != user["password_hash"]:
                _attempts.setdefault(client_ip, []).append(time.time())
                log.warning("Login fallido: contraseña incorrecta %s desde %s", data.username, client_ip)
                raise HTTPException(status_code=401, detail="Credenciales inválidas")

            _attempts[client_ip] = []
            token = _create_jwt(user["id"], user["email"], user["nombre"], user["rol"])
            log.info("Login exitoso: %s (%s) desde %s", user["email"], user["rol"], client_ip)
            _log_auditoria(user["id"], user["nombre"], "login", f"Login exitoso desde {client_ip}")
            return {"token": token, "username": user["email"], "nombre": user["nombre"], "rol": user["rol"]}
    finally:
        conn.close()


@router.post("/logout")
def logout(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Token requerido")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Formato de token inválido")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        jti = payload["jti"]
        conn = get_db()
        with conn.cursor() as cur:
            cur.execute(
                "INSERT IGNORE INTO token_blacklist (token_jti) VALUES (%s)", (jti,)
            )
        conn.commit()
        conn.close()
        log.info("Logout exitoso: usuario_id=%s", payload.get("user_id"))
        return {"mensaje": "Sesión cerrada exitosamente"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

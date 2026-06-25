import logging
import secrets
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from database import _hash_password, get_db
from auth import get_admin_user, _log_auditoria
from models import UsuarioCreate, UsuarioUpdate

log = logging.getLogger("sarahuaro")
router = APIRouter()


@router.get("/usuarios")
def listar_usuarios(admin: dict = Depends(get_admin_user)):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, nombre, email, rol, activo, created_at FROM usuarios ORDER BY id")
            rows = cur.fetchall()
            for row in rows:
                if isinstance(row.get("created_at"), datetime):
                    row["created_at"] = row["created_at"].isoformat()
            return rows
    finally:
        conn.close()


@router.post("/usuarios")
def crear_usuario(data: UsuarioCreate, admin: dict = Depends(get_admin_user)):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM usuarios WHERE email = %s", (data.email,))
            if cur.fetchone():
                raise HTTPException(status_code=409, detail="El email ya está registrado")

            salt = secrets.token_hex(32)
            pwd_hash = _hash_password(data.password, salt)
            cur.execute(
                "INSERT INTO usuarios (nombre, email, password_hash, password_salt, rol) VALUES (%s, %s, %s, %s, %s)",
                (data.nombre, data.email, pwd_hash, salt, data.rol),
            )
        conn.commit()
        new_id = cur.lastrowid
        log.info("Usuario creado: %s (rol=%s) id=%s", data.email, data.rol, new_id)
        _log_auditoria(admin["user_id"], admin["nombre"], "crear_usuario", f"id={new_id} email={data.email} rol={data.rol}")
        return {"mensaje": "Usuario creado exitosamente", "id": new_id}
    except HTTPException:
        raise
    except Exception as e:
        log.error("Error al crear usuario: %s", e)
        raise HTTPException(status_code=500, detail="Error al crear usuario")
    finally:
        conn.close()


@router.put("/usuarios/{usuario_id}")
def actualizar_usuario(usuario_id: int, data: UsuarioUpdate, admin: dict = Depends(get_admin_user)):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM usuarios WHERE id = %s", (usuario_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Usuario no encontrado")

            updates = []
            params = []
            if data.nombre is not None:
                updates.append("nombre = %s")
                params.append(data.nombre)
            if data.email is not None:
                cur.execute("SELECT id FROM usuarios WHERE email = %s AND id != %s", (data.email, usuario_id))
                if cur.fetchone():
                    raise HTTPException(status_code=409, detail="El email ya está registrado")
                updates.append("email = %s")
                params.append(data.email)
            if data.password is not None:
                salt = secrets.token_hex(32)
                pwd_hash = _hash_password(data.password, salt)
                updates.append("password_hash = %s")
                params.append(pwd_hash)
                updates.append("password_salt = %s")
                params.append(salt)
            if data.rol is not None:
                updates.append("rol = %s")
                params.append(data.rol)
            if data.activo is not None:
                updates.append("activo = %s")
                params.append(data.activo)

            if not updates:
                return {"mensaje": "Sin cambios"}

            params.append(usuario_id)
            cur.execute(f"UPDATE usuarios SET {', '.join(updates)} WHERE id = %s", params)
        conn.commit()
        log.info("Usuario actualizado: id=%s", usuario_id)
        _log_auditoria(admin["user_id"], admin["nombre"], "actualizar_usuario", f"id={usuario_id}")
        return {"mensaje": "Usuario actualizado exitosamente"}
    except HTTPException:
        raise
    except Exception as e:
        log.error("Error al actualizar usuario: %s", e)
        raise HTTPException(status_code=500, detail="Error al actualizar usuario")
    finally:
        conn.close()

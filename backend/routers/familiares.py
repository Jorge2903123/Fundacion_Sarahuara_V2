import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi import Header as FastAPIHeader
from database import get_db
from auth import get_current_user, get_admin_user, _log_auditoria
from models import FamiliarCreate, FamiliarUpdate

log = logging.getLogger("sarahuaro")
router = APIRouter()


@router.get("/familiares")
def listar_familiares(nino_id: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            if nino_id:
                cur.execute(
                    "SELECT id, nino_id, nombre, apellido, telefono, email, parentesco FROM familiares WHERE nino_id = %s ORDER BY nombre",
                    (nino_id,),
                )
            else:
                cur.execute(
                    "SELECT id, nino_id, nombre, apellido, telefono, email, parentesco FROM familiares ORDER BY nombre"
                )
            return cur.fetchall()
    finally:
        conn.close()


@router.post("/familiares")
def crear_familiar(data: FamiliarCreate, admin: dict = Depends(get_admin_user)):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM ninos WHERE id = %s AND activo = 1",
                (data.nino_id,),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Niño no encontrado")
            cur.execute(
                "INSERT INTO familiares (nino_id, nombre, apellido, telefono, email, parentesco) VALUES (%s, %s, %s, %s, %s, %s)",
                (data.nino_id, data.nombre, data.apellido, data.telefono, data.email, data.parentesco),
            )
        conn.commit()
        familiar_id = cur.lastrowid
        log.info("Familiar creado: id=%s nino_id=%s", familiar_id, data.nino_id)
        _log_auditoria(admin["user_id"], admin["nombre"], "crear_familiar", f"id={familiar_id} nino_id={data.nino_id}")
        return {"mensaje": "Familiar registrado exitosamente", "id": familiar_id}
    except HTTPException:
        raise
    finally:
        conn.close()


@router.put("/familiares/{familiar_id}")
def actualizar_familiar(familiar_id: int, data: FamiliarUpdate, admin: dict = Depends(get_admin_user)):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM familiares WHERE id = %s", (familiar_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Familiar no encontrado")

            updates = []
            params = []
            if data.nombre is not None:
                updates.append("nombre = %s")
                params.append(data.nombre)
            if data.apellido is not None:
                updates.append("apellido = %s")
                params.append(data.apellido)
            if data.telefono is not None:
                updates.append("telefono = %s")
                params.append(data.telefono)
            if data.email is not None:
                updates.append("email = %s")
                params.append(data.email)
            if data.parentesco is not None:
                updates.append("parentesco = %s")
                params.append(data.parentesco)
            if not updates:
                return {"mensaje": "Sin cambios"}

            params.append(familiar_id)
            cur.execute(f"UPDATE familiares SET {', '.join(updates)} WHERE id = %s", params)
        conn.commit()
        log.info("Familiar actualizado: id=%s", familiar_id)
        _log_auditoria(admin["user_id"], admin["nombre"], "actualizar_familiar", f"id={familiar_id}")
        return {"mensaje": "Familiar actualizado exitosamente"}
    except HTTPException:
        raise
    finally:
        conn.close()


@router.delete("/familiares/{familiar_id}")
def eliminar_familiar(familiar_id: int, admin: dict = Depends(get_admin_user)):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM familiares WHERE id = %s", (familiar_id,))
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Familiar no encontrado")
        conn.commit()
        log.info("Familiar eliminado: id=%s", familiar_id)
        _log_auditoria(admin["user_id"], admin["nombre"], "eliminar_familiar", f"id={familiar_id}")
        return {"mensaje": "Familiar eliminado exitosamente"}
    except HTTPException:
        raise
    finally:
        conn.close()

import logging
from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from auth import get_current_user, get_admin_user, _log_auditoria
from models import NinoCreate, NinoUpdate

log = logging.getLogger("sarahuaro")
router = APIRouter()


@router.post("/ninos")
def crear_nino(data: NinoCreate, admin: dict = Depends(get_admin_user)):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO ninos (nombre, apellido, fecha_nacimiento, alergias, observaciones) VALUES (%s, %s, %s, %s, %s)",
                (data.nombre, data.apellido, data.fecha_nacimiento, data.alergias, data.observaciones),
            )
        conn.commit()
        nino_id = cur.lastrowid
        log.info("Niño creado: %s %s (id=%s)", data.nombre, data.apellido, nino_id)
        _log_auditoria(admin["user_id"], admin["nombre"], "crear_nino", f"id={nino_id} nombre={data.nombre} {data.apellido}")
        return {"mensaje": "Niño registrado exitosamente", "id": nino_id}
    finally:
        conn.close()


@router.get("/ninos")
def listar_ninos(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, nombre, apellido, fecha_nacimiento, alergias, observaciones FROM ninos WHERE activo = 1 ORDER BY nombre"
            )
            rows = cur.fetchall()
            from datetime import date
            for row in rows:
                if isinstance(row.get("fecha_nacimiento"), date):
                    row["fecha_nacimiento"] = row["fecha_nacimiento"].isoformat()
            return rows
    finally:
        conn.close()


@router.put("/ninos/{nino_id}")
def actualizar_nino(nino_id: int, data: NinoUpdate, admin: dict = Depends(get_admin_user)):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE ninos SET nombre=%s, apellido=%s, fecha_nacimiento=%s, alergias=%s, observaciones=%s WHERE id=%s AND activo=1",
                (data.nombre, data.apellido, data.fecha_nacimiento, data.alergias, data.observaciones, nino_id),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Niño no encontrado")
        conn.commit()
        log.info("Niño actualizado: id=%s", nino_id)
        _log_auditoria(admin["user_id"], admin["nombre"], "actualizar_nino", f"id={nino_id}")
        return {"mensaje": "Niño actualizado exitosamente"}
    finally:
        conn.close()


@router.delete("/ninos/{nino_id}")
def eliminar_nino(nino_id: int, admin: dict = Depends(get_admin_user)):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE ninos SET activo=0 WHERE id=%s AND activo=1",
                (nino_id,),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Niño no encontrado")
        conn.commit()
        log.info("Niño eliminado (soft): id=%s", nino_id)
        _log_auditoria(admin["user_id"], admin["nombre"], "eliminar_nino", f"id={nino_id}")
        return {"mensaje": "Niño eliminado exitosamente"}
    finally:
        conn.close()

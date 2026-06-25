import logging
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from auth import get_admin_user, _log_auditoria
from models import DonativoCreate, DonativoUpdate

log = logging.getLogger("sarahuaro")
router = APIRouter()


@router.get("/donativos")
def listar_donativos(admin: dict = Depends(get_admin_user)):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, fecha, monto, descripcion, donante, created_at FROM donativos ORDER BY fecha DESC, id DESC")
            rows = cur.fetchall()
            for row in rows:
                if isinstance(row.get("fecha"), date):
                    row["fecha"] = row["fecha"].isoformat()
                if isinstance(row.get("created_at"), datetime):
                    row["created_at"] = row["created_at"].isoformat()
                row["monto"] = float(row["monto"])
            return rows
    finally:
        conn.close()


@router.post("/donativos")
def crear_donativo(data: DonativoCreate, admin: dict = Depends(get_admin_user)):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO donativos (fecha, monto, descripcion, donante) VALUES (%s, %s, %s, %s)",
                (data.fecha, data.monto, data.descripcion, data.donante),
            )
        conn.commit()
        donativo_id = cur.lastrowid
        log.info("Donativo creado: id=%s monto=%s", donativo_id, data.monto)
        _log_auditoria(admin["user_id"], admin["nombre"], "crear_donativo", f"id={donativo_id} monto={data.monto}")
        return {"mensaje": "Donativo registrado exitosamente", "id": donativo_id}
    finally:
        conn.close()


@router.put("/donativos/{donativo_id}")
def actualizar_donativo(donativo_id: int, data: DonativoUpdate, admin: dict = Depends(get_admin_user)):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM donativos WHERE id = %s", (donativo_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Donativo no encontrado")

            updates = []
            params = []
            if data.fecha is not None:
                updates.append("fecha = %s")
                params.append(data.fecha)
            if data.monto is not None:
                updates.append("monto = %s")
                params.append(data.monto)
            if data.descripcion is not None:
                updates.append("descripcion = %s")
                params.append(data.descripcion)
            if data.donante is not None:
                updates.append("donante = %s")
                params.append(data.donante)
            if not updates:
                return {"mensaje": "Sin cambios"}

            params.append(donativo_id)
            cur.execute(f"UPDATE donativos SET {', '.join(updates)} WHERE id = %s", params)
        conn.commit()
        log.info("Donativo actualizado: id=%s", donativo_id)
        _log_auditoria(admin["user_id"], admin["nombre"], "actualizar_donativo", f"id={donativo_id}")
        return {"mensaje": "Donativo actualizado exitosamente"}
    finally:
        conn.close()


@router.delete("/donativos/{donativo_id}")
def eliminar_donativo(donativo_id: int, admin: dict = Depends(get_admin_user)):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM donativos WHERE id = %s", (donativo_id,))
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Donativo no encontrado")
        conn.commit()
        log.info("Donativo eliminado: id=%s", donativo_id)
        _log_auditoria(admin["user_id"], admin["nombre"], "eliminar_donativo", f"id={donativo_id}")
        return {"mensaje": "Donativo eliminado exitosamente"}
    finally:
        conn.close()

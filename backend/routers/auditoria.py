import logging
from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from auth import get_admin_user, _log_auditoria

log = logging.getLogger("sarahuaro")
router = APIRouter()


@router.get("/auditoria")
def listar_auditoria(admin: dict = Depends(get_admin_user)):
    page = 0
    limit = 100
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, usuario_nombre, accion, detalle, created_at FROM auditoria_log ORDER BY id DESC LIMIT %s OFFSET %s",
                (limit, page * limit),
            )
            from datetime import datetime
            rows = cur.fetchall()
            for row in rows:
                if isinstance(row.get("created_at"), datetime):
                    row["created_at"] = row["created_at"].isoformat()
            return rows
    finally:
        conn.close()

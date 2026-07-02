import calendar
import logging
from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from database import get_db
from auth import get_current_user, get_admin_user, get_any_user, _log_auditoria
from models import AsistenciaCreate

log = logging.getLogger("sarahuaro")
router = APIRouter()


@router.post("/asistencias")
def registrar_asistencia(data: AsistenciaCreate, current_user: dict = Depends(get_current_user)):
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
                "INSERT IGNORE INTO asistencias (nino_id, fecha) VALUES (%s, %s)",
                (data.nino_id, data.fecha),
            )
            if cur.rowcount == 0:
                return {"mensaje": "La asistencia ya estaba registrada"}
        conn.commit()
        log.info("Asistencia registrada: nino_id=%s fecha=%s", data.nino_id, data.fecha)
        _log_auditoria(current_user["user_id"], current_user["nombre"], "registrar_asistencia", f"nino_id={data.nino_id} fecha={data.fecha}")
        return {"mensaje": "Asistencia registrada"}
    finally:
        conn.close()


@router.get("/asistencias/hoy")
def asistencias_hoy(current_user: dict = Depends(get_current_user)):
    hoy = date.today().isoformat()
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT nino_id FROM asistencias WHERE fecha = %s", (hoy,)
            )
            return [row["nino_id"] for row in cur.fetchall()]
    finally:
        conn.close()


@router.get("/ninos/{nino_id}/historial")
def historial_nino(nino_id: int, user: dict = Depends(get_any_user)):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT nombre, apellido FROM ninos WHERE id = %s AND activo = 1",
                (nino_id,),
            )
            nino = cur.fetchone()
            if not nino:
                raise HTTPException(status_code=404, detail="Niño no encontrado")

            cur.execute(
                "SELECT COUNT(*) AS total FROM asistencias WHERE nino_id = %s",
                (nino_id,),
            )
            total_asistencias = cur.fetchone()["total"]

            hoy = date.today()
            primer_dia_mes = hoy.replace(day=1)
            cur.execute(
                "SELECT COUNT(*) AS total FROM asistencias WHERE nino_id = %s AND fecha >= %s",
                (nino_id, primer_dia_mes),
            )
            asistencias_este_mes = cur.fetchone()["total"]

            inicio_semana = hoy - timedelta(days=hoy.weekday())
            cur.execute(
                "SELECT COUNT(*) AS total FROM asistencias WHERE nino_id = %s AND fecha >= %s",
                (nino_id, inicio_semana),
            )
            asistencias_esta_semana = cur.fetchone()["total"]

            cur.execute(
                "SELECT fecha FROM asistencias WHERE nino_id = %s ORDER BY fecha DESC LIMIT 10",
                (nino_id,),
            )
            ultimas_10_fechas = [row["fecha"].isoformat() if isinstance(row["fecha"], date) else row["fecha"] for row in cur.fetchall()]

            # --- Absences: weekdays without attendance in last 30 days ---
            treinta_atras = hoy - timedelta(days=30)
            cur.execute(
                "SELECT DISTINCT fecha FROM asistencias WHERE nino_id = %s AND fecha >= %s",
                (nino_id, treinta_atras),
            )
            asistencias_set = set()
            for row in cur.fetchall():
                f = row["fecha"]
                asistencias_set.add(f.isoformat() if isinstance(f, date) else f)

            ausencias_recientes = []
            dt = hoy
            while dt >= treinta_atras:
                if dt.weekday() < 5:
                    fs = dt.isoformat()
                    if fs not in asistencias_set:
                        ausencias_recientes.append(fs)
                dt -= timedelta(days=1)
            ausencias_recientes.sort(reverse=True)
            ausencias_recientes = ausencias_recientes[:10]

            # total weekdays this month
            total_dias_habiles_mes = sum(
                1 for d in range(1, calendar.monthrange(hoy.year, hoy.month)[1] + 1)
                if date(hoy.year, hoy.month, d).weekday() < 5
            )
            ausencias_este_mes = total_dias_habiles_mes - asistencias_este_mes

            return {
                "nombre": nino["nombre"],
                "apellido": nino["apellido"],
                "total_asistencias": total_asistencias,
                "asistencias_este_mes": asistencias_este_mes,
                "asistencias_esta_semana": asistencias_esta_semana,
                "ausencias_recientes": ausencias_recientes,
                "ausencias_este_mes": ausencias_este_mes,
                "ultimas_10_fechas": ultimas_10_fechas,
            }
    finally:
        conn.close()

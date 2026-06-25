import logging
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from auth import get_admin_user, _log_auditoria
from models import CostoCreate

log = logging.getLogger("sarahuaro")
router = APIRouter()


@router.post("/costos")
def guardar_costo(data: CostoCreate, admin: dict = Depends(get_admin_user)):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO costos (mes, anio, costo_total)
                   VALUES (%s, %s, %s)
                   ON DUPLICATE KEY UPDATE costo_total = %s""",
                (data.mes, data.anio, data.costo_total, data.costo_total),
            )
        conn.commit()
        log.info("Costo guardado: mes=%s anio=%s total=%s", data.mes, data.anio, data.costo_total)
        _log_auditoria(admin["user_id"], admin["nombre"], "guardar_costo", f"mes={data.mes} anio={data.anio} total={data.costo_total}")
        return {"mensaje": "Costo guardado exitosamente"}
    finally:
        conn.close()


@router.get("/reporte")
def reporte(mes: int, anio: int, admin: dict = Depends(get_admin_user)):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            if mes == 12:
                inicio = date(anio, mes, 1)
                fin = date(anio + 1, 1, 1)
            else:
                inicio = date(anio, mes, 1)
                fin = date(anio, mes + 1, 1)

            cur.execute(
                """SELECT COUNT(DISTINCT nino_id) AS total_ninos,
                          COUNT(*) AS total_asistencias
                   FROM asistencias
                   WHERE fecha >= %s AND fecha < %s""",
                (inicio, fin),
            )
            row = cur.fetchone()
            total_ninos_atendidos = row["total_ninos"]
            total_asistencias = row["total_asistencias"]

            cur.execute(
                "SELECT costo_total FROM costos WHERE mes = %s AND anio = %s",
                (mes, anio),
            )
            costo_row = cur.fetchone()
            costo_total = float(costo_row["costo_total"]) if costo_row and costo_row["costo_total"] is not None else 0

            costo_por_nino = round(costo_total / total_ninos_atendidos, 2) if total_ninos_atendidos > 0 else 0
            costo_por_comida = round(costo_total / total_asistencias, 2) if total_asistencias > 0 else 0

            cur.execute(
                "SELECT COALESCE(SUM(monto), 0) AS total FROM donativos WHERE fecha >= %s AND fecha < %s",
                (inicio, fin),
            )
            donativos_periodo = float(cur.fetchone()["total"])

            return {
                "mes": mes,
                "anio": anio,
                "total_ninos_atendidos": total_ninos_atendidos,
                "total_asistencias": total_asistencias,
                "costo_total": costo_total,
                "costo_por_nino": costo_por_nino,
                "costo_por_comida": costo_por_comida,
                "donativos_periodo": donativos_periodo,
            }
    finally:
        conn.close()


@router.get("/reporte/rango")
def reporte_rango(inicio: str, fin: str, admin: dict = Depends(get_admin_user)):
    try:
        fecha_inicio = datetime.strptime(inicio, "%Y-%m-%d").date()
        fecha_fin = datetime.strptime(fin, "%Y-%m-%d").date()
        if fecha_fin <= fecha_inicio:
            raise HTTPException(status_code=400, detail="La fecha fin debe ser posterior a la fecha inicio")
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido (use YYYY-MM-DD)")

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT COUNT(DISTINCT nino_id) AS total_ninos,
                          COUNT(*) AS total_asistencias
                   FROM asistencias
                   WHERE fecha >= %s AND fecha <= %s""",
                (fecha_inicio, fecha_fin),
            )
            row = cur.fetchone()
            total_ninos_atendidos = row["total_ninos"]
            total_asistencias = row["total_asistencias"]

            cur.execute(
                "SELECT COALESCE(SUM(monto), 0) AS total FROM donativos WHERE fecha >= %s AND fecha <= %s",
                (fecha_inicio, fecha_fin),
            )
            donativos_periodo = float(cur.fetchone()["total"])

            dias_laborales = sum(1 for d in range((fecha_fin - fecha_inicio).days + 1) if (fecha_inicio + timedelta(days=d)).weekday() < 5)
            promedio_diario = round(total_asistencias / dias_laborales, 1) if dias_laborales > 0 else 0

            cur.execute(
                """SELECT a.fecha, COUNT(*) AS total
                   FROM asistencias a
                   WHERE a.fecha >= %s AND a.fecha <= %s
                   GROUP BY a.fecha ORDER BY a.fecha""",
                (fecha_inicio, fecha_fin),
            )
            asistencias_por_dia = [
                {"fecha": r["fecha"].isoformat() if isinstance(r["fecha"], date) else r["fecha"], "total": r["total"]}
                for r in cur.fetchall()
            ]

            return {
                "inicio": inicio,
                "fin": fin,
                "dias_transcurridos": (fecha_fin - fecha_inicio).days + 1,
                "dias_laborales": dias_laborales,
                "total_ninos_atendidos": total_ninos_atendidos,
                "total_asistencias": total_asistencias,
                "promedio_diario": promedio_diario,
                "donativos_periodo": donativos_periodo,
            }
    finally:
        conn.close()

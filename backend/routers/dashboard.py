import logging
from datetime import date, timedelta
from fastapi import APIRouter, Depends
from database import get_db
from auth import get_admin_user

log = logging.getLogger("sarahuaro")
router = APIRouter()


@router.get("/dashboard")
def dashboard(admin: dict = Depends(get_admin_user)):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS total FROM ninos WHERE activo = 1")
            total_ninos_activos = cur.fetchone()["total"]

            hoy = date.today()
            hoy_str = hoy.isoformat()

            cur.execute(
                "SELECT COUNT(*) AS total FROM asistencias WHERE fecha = %s",
                (hoy_str,),
            )
            asistencias_hoy = cur.fetchone()["total"]

            primer_dia_mes = hoy.replace(day=1)
            cur.execute(
                "SELECT COUNT(*) AS total FROM asistencias WHERE fecha >= %s",
                (primer_dia_mes,),
            )
            asistencias_este_mes = cur.fetchone()["total"]

            inicio_anio = hoy.replace(month=1, day=1)
            cur.execute(
                "SELECT COUNT(*) AS total FROM asistencias WHERE fecha >= %s",
                (inicio_anio,),
            )
            asistencias_este_anio = cur.fetchone()["total"]

            cur.execute(
                "SELECT COALESCE(SUM(monto), 0) AS total FROM donativos"
            )
            total_donativos = float(cur.fetchone()["total"])

            hace_30 = hoy - timedelta(days=29)
            cur.execute(
                """SELECT fecha, COUNT(*) AS total FROM asistencias
                   WHERE fecha >= %s GROUP BY fecha ORDER BY fecha""",
                (hace_30,),
            )
            asistencias_por_dia = [
                {"fecha": row["fecha"].isoformat() if isinstance(row["fecha"], date) else row["fecha"], "total": row["total"]}
                for row in cur.fetchall()
            ]

            fecha_limite = hoy - timedelta(days=3)
            cur.execute(
                """SELECT n.id, n.nombre, n.apellido, MAX(a.fecha) AS ultima_asistencia
                   FROM ninos n
                   LEFT JOIN asistencias a ON n.id = a.nino_id
                   WHERE n.activo = 1
                   GROUP BY n.id, n.nombre, n.apellido
                   HAVING ultima_asistencia IS NULL OR ultima_asistencia < %s
                   ORDER BY ultima_asistencia ASC""",
                (fecha_limite,),
            )
            ninos_sin_asistir_3dias = [
                {
                    "id": row["id"],
                    "nombre": row["nombre"],
                    "apellido": row["apellido"],
                    "ultima_asistencia": row["ultima_asistencia"].isoformat() if row["ultima_asistencia"] and isinstance(row["ultima_asistencia"], date) else (row["ultima_asistencia"] or None),
                }
                for row in cur.fetchall()
            ]

            return {
                "total_ninos_activos": total_ninos_activos,
                "asistencias_hoy": asistencias_hoy,
                "asistencias_este_mes": asistencias_este_mes,
                "asistencias_este_anio": asistencias_este_anio,
                "total_donativos": total_donativos,
                "asistencias_por_dia": asistencias_por_dia,
                "ninos_sin_asistir_3dias": ninos_sin_asistir_3dias,
            }
    finally:
        conn.close()

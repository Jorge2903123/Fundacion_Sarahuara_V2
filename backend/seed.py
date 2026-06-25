"""Script para insertar 50 niños de prueba con asistencias."""
import random
from datetime import date, timedelta
from database import get_db, init_db, _hash_password
import secrets

NOMBRES = [
    "Santiago", "Mateo", "Sebastián", "Leonardo", "Emiliano", "Diego", "Daniel", "Gabriel",
    "Ángel", "David", "Valentina", "Sofía", "Regina", "María", "Ximena", "Camila", "Lucía",
    "Fernanda", "Paula", "Mía", "Juan", "Luis", "Carlos", "Jorge", "Miguel", "Alejandro",
    "Javier", "Manuel", "Ricardo", "Fernando", "Ana", "Claudia", "Rosa", "Laura", "Patricia",
    "Diana", "Elena", "Carmen", "Teresa", "Andrea", "Pablo", "Andrés", "Raúl", "Héctor",
    "Mario", "Sergio", "Pedro", "Francisco", "Julián", "Vicente",
]

APELLIDOS = [
    "Hernández", "García", "Martínez", "López", "González", "Rodríguez", "Pérez", "Sánchez",
    "Ramírez", "Cruz", "Flores", "Morales", "Ortiz", "Reyes", "Vázquez", "Torres", "Gómez",
    "Díaz", "Mendoza", "Ruiz", "Aguilar", "Castillo", "Moreno", "Chávez", "Romero", "Ramos",
    "Castro", "Muñoz", "Ortega", "Delgado", "Medina", "Velázquez", "Rivas", "Miranda", "Cortés",
    "Nava", "Rangel", "Campos", "Salazar", "Ponce", "Guerrero", "Soto", "Maldonado", "Navarro",
    "Espinoza", "Sandoval", "Paredes", "Solís", "Acosta", "Bautista",
]

ALERGIAS_POOL = ["", "", "", "", "Polen", "Lactosa", "Gluten", "Frutos secos", "Huevo", "Mariscos", ""]
OBS_POOL = ["", "", "", "", "Hermano también inscrito", "Requiere atención especial", "", "", ""]

random.seed(42)


def seed():
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS total FROM ninos WHERE activo = 1")
            if cur.fetchone()["total"] >= 50:
                print("Ya hay 50+ niños. No se insertan duplicados.")
                return

            ids = []
            used = set()
            for i in range(50):
                while True:
                    n = random.choice(NOMBRES)
                    a = random.choice(APELLIDOS)
                    if (n, a) not in used:
                        used.add((n, a))
                        break

                year = random.randint(2014, 2021)
                month = random.randint(1, 12)
                day = random.randint(1, 28)
                fn = date(year, month, day).isoformat()
                alergias = random.choice(ALERGIAS_POOL)
                obs = random.choice(OBS_POOL)

                cur.execute(
                    "INSERT INTO ninos (nombre, apellido, fecha_nacimiento, alergias, observaciones) VALUES (%s, %s, %s, %s, %s)",
                    (n, a, fn, alergias if alergias else None, obs if obs else None),
                )
                ids.append(cur.lastrowid)

            conn.commit()
            print(f"Insertados {len(ids)} niños.")

            hoy = date.today()
            inicio = hoy - timedelta(days=60)
            dias = [inicio + timedelta(days=d) for d in range((hoy - inicio).days + 1) if (inicio + timedelta(days=d)).weekday() < 5]

            total_asistencias = 0
            for dia in dias:
                presentes = random.sample(ids, random.randint(30, 48))
                for nid in presentes:
                    cur.execute(
                        "INSERT IGNORE INTO asistencias (nino_id, fecha) VALUES (%s, %s)",
                        (nid, dia.isoformat()),
                    )
                    total_asistencias += cur.rowcount
            conn.commit()
            print(f"Registradas ~{total_asistencias} asistencias en {len(dias)} días.")

            # Costos de ejemplo
            for mes in range(1, hoy.month + 1):
                anio = hoy.year if mes <= hoy.month else hoy.year - 1
                cur.execute(
                    """INSERT INTO costos (mes, anio, costo_total) VALUES (%s, %s, %s)
                       ON DUPLICATE KEY UPDATE costo_total = %s""",
                    (mes, anio, random.randint(8000, 15000), random.randint(8000, 15000)),
                )
            conn.commit()
            print("Costos de ejemplo insertados.")

            # Donativos de ejemplo
            for _ in range(10):
                d = random.choice(dias)
                cur.execute(
                    "INSERT INTO donativos (fecha, monto, descripcion, donante) VALUES (%s, %s, %s, %s)",
                    (d.isoformat(), random.randint(500, 5000), "Donativo voluntario", None),
                )
            conn.commit()
            print("Donativos de ejemplo insertados.")

    finally:
        conn.close()


if __name__ == "__main__":
    seed()

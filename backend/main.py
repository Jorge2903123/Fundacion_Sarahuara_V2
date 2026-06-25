import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)

app = FastAPI(title="Fundacion Sarahuaro API")

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from database import init_db, get_db
from auth import router as auth_router
from routers.ninos import router as ninos_router
from routers.asistencias import router as asistencias_router
from routers.dashboard import router as dashboard_router
from routers.reportes import router as reportes_router
from routers.donativos import router as donativos_router
from routers.familiares import router as familiares_router
from routers.usuarios import router as usuarios_router
from routers.auditoria import router as auditoria_router

app.include_router(auth_router)
app.include_router(ninos_router)
app.include_router(asistencias_router)
app.include_router(dashboard_router)
app.include_router(reportes_router)
app.include_router(donativos_router)
app.include_router(familiares_router)
app.include_router(usuarios_router)
app.include_router(auditoria_router)

init_db()

try:
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM token_blacklist WHERE expired_at < NOW() - INTERVAL 1 DAY")
    conn.commit()
    conn.close()
except Exception:
    pass

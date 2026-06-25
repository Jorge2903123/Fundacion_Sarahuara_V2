import logging
import secrets
import pymysql
from config import DB_CONFIG, PBKDF2_ITERATIONS

log = logging.getLogger("sarahuaro")


def get_db(database=None):
    config = DB_CONFIG.copy()
    if database is not None:
        config["database"] = database
    return pymysql.connect(**config)


def _hash_password(password: str, salt: str) -> str:
    import hashlib
    return hashlib.pbkdf2_hmac(
        "sha256",
        password.encode(),
        salt.encode(),
        PBKDF2_ITERATIONS,
    ).hex()


def init_db():
    import os
    db_name = os.getenv("DB_NAME", "sarahuaro_v2")
    try:
        conn = get_db(database=None)
    except Exception as e:
        log.error("No se pudo conectar a MySQL: %s", e)
        return
    try:
        with conn.cursor() as cur:
            cur.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}`")
        conn.commit()
    finally:
        conn.close()
    try:
        conn = get_db(database=db_name)
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS ninos (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    nombre VARCHAR(100) NOT NULL,
                    apellido VARCHAR(100) NOT NULL,
                    fecha_nacimiento DATE NOT NULL,
                    alergias TEXT,
                    observaciones TEXT,
                    activo TINYINT(1) NOT NULL DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS asistencias (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    nino_id INT NOT NULL,
                    fecha DATE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (nino_id) REFERENCES ninos(id),
                    UNIQUE KEY unique_asistencia (nino_id, fecha)
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS costos (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    mes INT NOT NULL,
                    anio INT NOT NULL,
                    costo_total DECIMAL(10,2) NOT NULL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_mes_anio (mes, anio)
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS usuarios (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    nombre VARCHAR(100) NOT NULL,
                    email VARCHAR(150) NOT NULL UNIQUE,
                    password_hash VARCHAR(255) NOT NULL,
                    password_salt VARCHAR(64) NOT NULL,
                    rol VARCHAR(20) NOT NULL DEFAULT 'voluntario',
                    activo TINYINT(1) NOT NULL DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS donativos (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    fecha DATE NOT NULL,
                    monto DECIMAL(10,2) NOT NULL,
                    descripcion VARCHAR(500) NOT NULL,
                    donante VARCHAR(200),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS auditoria_log (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    usuario_id INT NOT NULL,
                    usuario_nombre VARCHAR(150) NOT NULL,
                    accion VARCHAR(50) NOT NULL,
                    detalle TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_auditoria_created (created_at)
                )
            """)
            try:
                cur.execute("ALTER TABLE ninos ADD COLUMN alergias TEXT")
            except Exception:
                pass
            try:
                cur.execute("ALTER TABLE ninos ADD COLUMN observaciones TEXT")
            except Exception:
                pass
            cur.execute("""
                CREATE TABLE IF NOT EXISTS token_blacklist (
                    token_jti VARCHAR(64) PRIMARY KEY,
                    expired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_blacklist_expired (expired_at)
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS familiares (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    nino_id INT NOT NULL,
                    nombre VARCHAR(100) NOT NULL,
                    apellido VARCHAR(100) NOT NULL,
                    telefono VARCHAR(20),
                    email VARCHAR(150),
                    parentesco VARCHAR(50) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (nino_id) REFERENCES ninos(id) ON DELETE CASCADE
                )
            """)
            try:
                cur.execute("ALTER TABLE auditoria_log ADD CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)")
            except Exception:
                pass
            try:
                cur.execute("CREATE INDEX idx_asistencias_fecha ON asistencias(fecha)")
            except Exception:
                pass
            try:
                cur.execute("CREATE INDEX idx_donativos_fecha ON donativos(fecha)")
            except Exception:
                pass
            try:
                cur.execute("CREATE INDEX idx_auditoria_usuario_id ON auditoria_log(usuario_id)")
            except Exception:
                pass
            cur.execute("""
                SELECT id FROM usuarios WHERE email = %s AND activo = 1
            """, ("admin",))
            if not cur.fetchone():
                salt = secrets.token_hex(32)
                pwd_hash = _hash_password("admin123", salt)
                cur.execute(
                    "INSERT INTO usuarios (nombre, email, password_hash, password_salt, rol) VALUES (%s, %s, %s, %s, %s)",
                    ("Administrador", "admin", pwd_hash, salt, "admin"),
                )
                log.info("Usuario admin creado por defecto (admin / admin123)")
        conn.commit()
        log.info("Base de datos inicializada correctamente")
    except Exception as e:
        log.error("Error al inicializar tablas: %s", e)
    finally:
        conn.close()

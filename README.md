# Fundación Sarahuaro

Sistema web de gestión para fundación/comedor infantil. Permite registrar la asistencia diaria de niños, visualizar métricas en un dashboard y generar reportes mensuales de impacto.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + Recharts + React Router |
| Backend | Python 3.13 + FastAPI + Uvicorn |
| Base de datos | MySQL 8.0 |
| Infraestructura | Docker Compose |

## Requisitos

- Node.js 22+
- Python 3.13+
- MySQL 8.0 (o Docker)
- npm

## Desarrollo local

### Backend

```bash
cd backend
pip install -r requirements.txt
# configurar backend/.env con credenciales MySQL
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend corre en `http://localhost:5173` y el backend en `http://localhost:8000`.
Vite proxy automáticamente las rutas `/api` al backend.

## Docker (producción)

### Requisitos

- Docker + Docker Compose instalados en el servidor

### 1. Preparar secrets

```bash
cp .env.example .env
# Editar .env:
#   DB_PASSWORD  → contraseña para MySQL
#   JWT_SECRET   → string único (cambialo una vez y no lo toques más)
#   DOMAIN       → tu dominio (ej: fundacion.midominio.com) o déjalo vacío para HTTP
```

Si `DOMAIN` está configurado, Caddy obtiene SSL gratis de Let's Encrypt automáticamente.

### 2. Desplegar

```bash
docker compose up --build -d
```

### 3. Ver logs

```bash
docker compose logs -f
```

### 4. Detener

```bash
docker compose down
```

### Servicios

| Servicio | URL |
|---|---|
| Frontend | https://<tu-dominio> (o http://<ip>) |
| Backend | http://<ip-servidor>:8000 |
| MySQL | localhost:3307 |

### Notas

- `JWT_SECRET` debe ser fijo. Si cambia, todos los tokens existentes se invalidan.
- Los datos de MySQL persisten en un volumen Docker (`mysql_data`).
- Caddy maneja SSL automaticamente si configuras `DOMAIN`.
- Security headers (X-Content-Type-Options, X-Frame-Options, etc.) incluidos en Caddy.

## Linters

```bash
# Frontend
cd frontend
npm run lint
npm run format

# Backend
cd backend
black --check .
```

## Scripts disponibles

### Frontend
| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run preview` | Vista previa del build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

### Backend
| Comando | Descripción |
|---|---|
| `uvicorn main:app --reload` | Servidor de desarrollo |
| `black .` | Formatear código |

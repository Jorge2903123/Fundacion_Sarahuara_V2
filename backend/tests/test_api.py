"""Tests básicos para la API de Fundación Sarahuaro."""

from fastapi.testclient import TestClient
import sys
import os
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

mock_conn = MagicMock()
mock_cursor = MagicMock()
mock_cursor.__enter__.return_value = mock_cursor
mock_conn.cursor.return_value = mock_cursor

LOGIN_USER = {
    "id": 1,
    "nombre": "Administrador",
    "email": "admin",
    "password_hash": "0c41d29ec4c2c962b17ab5e2778273f5324dcfef271633b4820048a11c4dae77",
    "password_salt": "0000000000000000000000000000000000000000000000000000000000000000",
    "rol": "admin",
}

patcher_connect = patch("pymysql.connect", return_value=mock_conn)
patcher_connect.start()

from main import app

client = TestClient(app)

call_count = 0


def setup_function():
    global call_count
    call_count = 0
    mock_cursor.reset_mock()
    mock_cursor.rowcount = 1
    mock_cursor.lastrowid = 1
    mock_conn.reset_mock()

    def fetchone_side_effect(*args, **kwargs):
        global call_count
        call_count += 1
        # First fetchone call in login returns user, subsequent calls (blacklist check) return None
        if call_count <= 1:
            return LOGIN_USER
        return None

    mock_cursor.fetchone.side_effect = fetchone_side_effect
    mock_cursor.fetchall.return_value = []


def test_health_check():
    resp = client.get("/ninos")
    assert resp.status_code == 401


def test_login_fails_wrong_creds():
    mock_cursor.fetchone.side_effect = None
    mock_cursor.fetchone.return_value = None
    resp = client.post("/login", json={"username": "bad", "password": "bad"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Credenciales inválidas"


def test_login_success():
    mock_cursor.fetchone.side_effect = None
    mock_cursor.fetchone.return_value = LOGIN_USER
    resp = client.post("/login", json={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data
    assert data["username"] == "admin"
    assert data["rol"] == "admin"


def test_ninos_list_requires_auth():
    resp = client.get("/ninos")
    assert resp.status_code == 401


def test_ninos_list_with_token():
    mock_cursor.fetchone.side_effect = None
    mock_cursor.fetchone.return_value = LOGIN_USER
    login_resp = client.post("/login", json={"username": "admin", "password": "admin123"})
    token = login_resp.json()["token"]

    # After login, fetchone should return None for blacklist check
    def fetchone_after_login(*args, **kwargs):
        return None
    mock_cursor.fetchone.side_effect = fetchone_after_login
    mock_cursor.fetchall.return_value = [{"id": 1, "nombre": "Juan", "apellido": "Pérez"}]

    resp = client.get("/ninos", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_create_nino():
    mock_cursor.fetchone.side_effect = None
    mock_cursor.fetchone.return_value = LOGIN_USER
    login_resp = client.post("/login", json={"username": "admin", "password": "admin123"})
    token = login_resp.json()["token"]

    mock_cursor.fetchone.side_effect = lambda *a, **kw: None
    mock_cursor.lastrowid = 5
    resp = client.post(
        "/ninos",
        json={"nombre": "María", "apellido": "López", "fecha_nacimiento": "2020-05-10"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["id"] == 5


def test_voluntario_cant_create_nino():
    vol_user = {**LOGIN_USER, "rol": "voluntario"}
    mock_cursor.fetchone.side_effect = None
    mock_cursor.fetchone.return_value = vol_user
    login_resp = client.post("/login", json={"username": "admin", "password": "admin123"})
    token = login_resp.json()["token"]

    mock_cursor.fetchone.side_effect = lambda *a, **kw: None
    resp = client.post(
        "/ninos",
        json={"nombre": "Test", "apellido": "Test", "fecha_nacimiento": "2020-05-10"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403

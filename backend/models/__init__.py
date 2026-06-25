import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator


def _strip_str(v: str) -> str:
    return v.strip() if isinstance(v, str) else v


TELEFONO_REGEX = re.compile(r"^(\+52\d{10}|\d{10})$")


class LoginRequest(BaseModel):
    username: str
    password: str


class NinoCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    apellido: str = Field(min_length=1, max_length=100)
    fecha_nacimiento: str
    alergias: Optional[str] = None
    observaciones: Optional[str] = None

    @field_validator("nombre", "apellido")
    @classmethod
    def strip_strings(cls, v):
        return _strip_str(v)

    @field_validator("fecha_nacimiento")
    @classmethod
    def validate_date(cls, v):
        v = _strip_str(v)
        try:
            dt = datetime.strptime(v, "%Y-%m-%d")
            if dt > datetime.now():
                raise ValueError("La fecha de nacimiento no puede ser futura")
            return v
        except ValueError as e:
            if "futura" in str(e):
                raise ValueError("La fecha de nacimiento no puede ser futura")
            raise ValueError("fecha_nacimiento debe tener formato YYYY-MM-DD")


class NinoUpdate(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    apellido: str = Field(min_length=1, max_length=100)
    fecha_nacimiento: str
    alergias: Optional[str] = None
    observaciones: Optional[str] = None

    @field_validator("nombre", "apellido")
    @classmethod
    def strip_strings(cls, v):
        return _strip_str(v)

    @field_validator("fecha_nacimiento")
    @classmethod
    def validate_date(cls, v):
        v = _strip_str(v)
        try:
            dt = datetime.strptime(v, "%Y-%m-%d")
            if dt > datetime.now():
                raise ValueError("La fecha de nacimiento no puede ser futura")
            return v
        except ValueError as e:
            if "futura" in str(e):
                raise ValueError("La fecha de nacimiento no puede ser futura")
            raise ValueError("fecha_nacimiento debe tener formato YYYY-MM-DD")


class AsistenciaCreate(BaseModel):
    nino_id: int = Field(gt=0)
    fecha: str

    @field_validator("fecha")
    @classmethod
    def validate_date(cls, v):
        try:
            datetime.strptime(v, "%Y-%m-%d")
            return v
        except ValueError:
            raise ValueError("fecha debe tener formato YYYY-MM-DD")


class CostoCreate(BaseModel):
    mes: int = Field(ge=1, le=12)
    anio: int = Field(ge=2000, le=2100)
    costo_total: float = Field(ge=0)


class UsuarioCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=1, max_length=150)
    password: str = Field(min_length=4, max_length=100)
    rol: str = Field(default="voluntario", pattern="^(admin|voluntario)$")

    @field_validator("nombre", "email")
    @classmethod
    def strip_strings(cls, v):
        return _strip_str(v)


class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[str] = Field(None, min_length=1, max_length=150)
    password: Optional[str] = Field(None, min_length=4, max_length=100)
    rol: Optional[str] = Field(None, pattern="^(admin|voluntario)$")
    activo: Optional[int] = Field(None, ge=0, le=1)

    @field_validator("nombre", "email")
    @classmethod
    def strip_strings(cls, v):
        if v is None:
            return v
        return _strip_str(v)


class DonativoCreate(BaseModel):
    fecha: str
    monto: float = Field(gt=0)
    descripcion: str = Field(min_length=1, max_length=500)
    donante: Optional[str] = Field(None, max_length=200)

    @field_validator("descripcion", "donante")
    @classmethod
    def strip_strings(cls, v):
        if v is None:
            return v
        return _strip_str(v)

    @field_validator("fecha")
    @classmethod
    def validate_date(cls, v):
        try:
            datetime.strptime(v, "%Y-%m-%d")
            return v
        except ValueError:
            raise ValueError("fecha debe tener formato YYYY-MM-DD")


class DonativoUpdate(BaseModel):
    fecha: Optional[str] = None
    monto: Optional[float] = Field(None, gt=0)
    descripcion: Optional[str] = Field(None, min_length=1, max_length=500)
    donante: Optional[str] = Field(None, max_length=200)

    @field_validator("descripcion", "donante")
    @classmethod
    def strip_strings(cls, v):
        if v is None:
            return v
        return _strip_str(v)

    @field_validator("fecha")
    @classmethod
    def validate_date(cls, v):
        if v is None:
            return v
        try:
            datetime.strptime(v, "%Y-%m-%d")
            return v
        except ValueError:
            raise ValueError("fecha debe tener formato YYYY-MM-DD")


class FamiliarCreate(BaseModel):
    nino_id: int = Field(gt=0)
    nombre: str = Field(min_length=1, max_length=100)
    apellido: str = Field(min_length=1, max_length=100)
    telefono: str = Field(min_length=10, max_length=13)
    email: str = Field(min_length=1, max_length=150)
    parentesco: str = Field(min_length=1, max_length=50)

    @field_validator("nombre", "apellido", "telefono", "email", "parentesco")
    @classmethod
    def strip_strings(cls, v):
        return _strip_str(v)

    @field_validator("telefono")
    @classmethod
    def validate_telefono(cls, v):
        v = _strip_str(v)
        if not TELEFONO_REGEX.match(v):
            raise ValueError("Teléfono debe ser 10 dígitos o +52 seguido de 10 dígitos")
        return v


class FamiliarUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=100)
    apellido: Optional[str] = Field(None, min_length=1, max_length=100)
    telefono: Optional[str] = Field(None, min_length=10, max_length=13)
    email: Optional[str] = Field(None, min_length=1, max_length=150)
    parentesco: Optional[str] = Field(None, min_length=1, max_length=50)

    @field_validator("nombre", "apellido", "telefono", "email", "parentesco")
    @classmethod
    def strip_strings(cls, v):
        if v is None:
            return v
        return _strip_str(v)

    @field_validator("telefono")
    @classmethod
    def validate_telefono(cls, v):
        if v is None:
            return v
        v = _strip_str(v)
        if not TELEFONO_REGEX.match(v):
            raise ValueError("Teléfono debe ser 10 dígitos o +52 seguido de 10 dígitos")
        return v

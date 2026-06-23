from enum import Enum
from pydantic import BaseModel, Field, field_validator

class PondType(str, Enum):
    EARTHEN_POND = "Earthen Pond"
    CONCRETE_TANK = "Concrete Tank"
    FLOATING_CAGE = "Floating Cage"
    DESERT_TANK = "Desert Tank"
    LINED_POND = "Lined Pond"

class PondBase(BaseModel):
    type: PondType
    name: str | None = None
    size_sq_meters: float | None = Field(default=None, ge=0)
    stocking_density: float | None = Field(default=None, ge=0)

class PondCreate(PondBase):
    pass

class PondUpdate(BaseModel):
    type: PondType | None = None
    name: str | None = None
    size_sq_meters: float | None = Field(default=None, ge=0)
    stocking_density: float | None = Field(default=None, ge=0)

class PondResponse(PondBase):
    id: str
    farm_id: str

    model_config = {"from_attributes": True}

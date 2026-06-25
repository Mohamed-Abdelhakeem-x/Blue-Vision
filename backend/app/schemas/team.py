from pydantic import BaseModel, EmailStr, field_validator
from app.schemas.auth import validate_deliverable_email
from datetime import datetime

class InviteMemberRequest(BaseModel):
    email: str
    # E.g. "Farm Manager"
    role: str = "Farm Manager"

    @field_validator("email")
    @classmethod
    def check_email_deliverability(cls, v: str) -> str:
        return validate_deliverable_email(v)

class FarmMemberResponse(BaseModel):
    id: str
    user_id: str
    email: str
    full_name: str
    role: str
    joined_at: datetime
    
class TeamInvitationResponse(BaseModel):
    id: str
    email: str
    role: str
    status: str
    created_at: datetime
    expires_at: datetime

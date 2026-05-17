from pydantic import BaseModel, EmailStr
from datetime import datetime

class InviteMemberRequest(BaseModel):
    email: EmailStr
    # E.g. "Farm Manager"
    role: str = "Farm Manager"

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

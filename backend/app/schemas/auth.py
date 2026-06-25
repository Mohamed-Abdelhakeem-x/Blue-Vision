from pydantic import BaseModel, EmailStr, Field, field_validator
from email_validator import validate_email, EmailNotValidError
import re

def validate_deliverable_email(email: str) -> str:
    try:
        emailinfo = validate_email(email, check_deliverability=True)
        return emailinfo.normalized
    except EmailNotValidError as e:
        raise ValueError(str(e))


def validate_password_strength(password: str) -> str:
    """Validate password meets strength requirements."""
    issues = []
    if len(password) < 8:
        issues.append("at least 8 characters")
    if not re.search(r"[A-Z]", password):
        issues.append("at least one uppercase letter")
    if not re.search(r"[0-9]", password):
        issues.append("at least one number")
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?`~]", password):
        issues.append("at least one special character (!@#$%^&*...)")
    if issues:
        raise ValueError("Password must contain: " + ", ".join(issues))
    return password


class SignUpRequest(BaseModel):
    email: str
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=8, max_length=128)
    verification_code: str
    invite_token: str | None = None

    @field_validator("email")
    @classmethod
    def check_email_deliverability(cls, v: str) -> str:
        return validate_deliverable_email(v)

    @field_validator("password")
    @classmethod
    def check_password_strength(cls, v: str) -> str:
        return validate_password_strength(v)


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class EmailVerificationRequest(BaseModel):
    email: str
    purpose: str = "signup"

    @field_validator("email")
    @classmethod
    def check_email_deliverability(cls, v: str) -> str:
        return validate_deliverable_email(v)


class EmailVerificationConfirm(BaseModel):
    email: EmailStr
    code: str
    purpose: str = "signup"


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def check_password_strength(cls, v: str) -> str:
        return validate_password_strength(v)


class GoogleAuthRequest(BaseModel):
    token: str
    invite_token: str | None = None
    password: str | None = None
    full_name: str | None = None

    @field_validator("password")
    @classmethod
    def check_password_strength(cls, v: str | None) -> str | None:
        if v is not None:
            return validate_password_strength(v)
        return v


class GoogleCheckRequest(BaseModel):
    token: str


class GoogleCheckResponse(BaseModel):
    exists: bool
    email: str | None = None
    name: str | None = None


class InvitationInfoResponse(BaseModel):
    email: str
    farm_name: str
    role: str
    inviter_name: str

import logging
from email.message import EmailMessage

import aiosmtplib

from app.core.config import get_settings

logger = logging.getLogger(__name__)


async def send_verification_email(to_email: str, code: str, purpose: str = "signup") -> None:
    settings = get_settings()

    if not settings.smtp_server or not settings.smtp_username:
        logger.warning(f"SMTP not configured. Would have sent {code} to {to_email} for {purpose}.")
        return

    subject = "Verify your email - BlueVision"
    if purpose == "reset_password":
        subject = "Reset your password - BlueVision"
        body = f"""
        Hello,

        You requested a password reset for your BlueVision account.
        Your 6-digit verification code is: {code}

        This code will expire in 15 minutes.
        If you did not request this, please ignore this email.
        """
    else:
        body = f"""
        Hello,

        Thank you for signing up for BlueVision!
        Your 6-digit verification code is: {code}

        This code will expire in 15 minutes.
        """

    message = EmailMessage()
    message["From"] = settings.smtp_from_email or settings.smtp_username
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.smtp_server,
            port=settings.smtp_port,
            username=settings.smtp_username,
            password=settings.smtp_password,
            use_tls=False,
            start_tls=True,
        )
        logger.info(f"Verification email sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        raise

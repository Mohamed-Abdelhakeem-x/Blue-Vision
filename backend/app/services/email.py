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

async def send_team_invitation_email(to_email: str, token: str, inviter_name: str, farm_name: str, role: str) -> None:
    settings = get_settings()

    if not settings.smtp_server or not settings.smtp_username:
        logger.warning(f"SMTP not configured. Would have sent invite to {to_email} for {farm_name}.")
        return

    subject = f"You have been invited to join {farm_name} on BlueVision"
    # Assuming frontend is on localhost:3000 during dev, or from CORS origin
    frontend_url = settings.cors_origin_list[0] if settings.cors_origin_list else "http://localhost:3000"
    invite_link = f"{frontend_url}/register?invite_token={token}"
    
    body = f"""
    Hello,

    {inviter_name} has invited you to join their team as a {role} for the farm: {farm_name}.

    Click the link below to accept the invitation and set up your account:
    {invite_link}

    This invitation will expire in 7 days.
    If you did not expect this invitation, you can safely ignore this email.

    Welcome to BlueVision!
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
        logger.info(f"Team invitation email sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send team invite email to {to_email}: {e}")
        raise


async def send_welcome_email(to_email: str, full_name: str) -> None:
    settings = get_settings()

    if not settings.smtp_server or not settings.smtp_username:
        logger.warning(f"SMTP not configured. Would have sent welcome email to {to_email}.")
        return

    first_name = full_name.split()[0] if full_name else "there"
    subject = "Welcome to BlueVision \u2014 Let\u2019s Get Started \U0001F41F"
    dashboard_url = f"{settings.cors_origin_list[0] if settings.cors_origin_list else 'http://localhost:3000'}/dashboard"

    html_body = f"""\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

  <!-- Logo & Header -->
  <tr><td style="padding:32px 40px 24px;background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);border-radius:20px 20px 0 0;border:1px solid #1e293b;border-bottom:none;">
    <table role="presentation" width="100%"><tr>
      <td>
        <span style="font-size:28px;font-weight:900;letter-spacing:-0.5px;">
          <span style="color:#67e8f9;">Blue</span><span style="color:#e2e8f0;">Vision</span>
        </span>
        <p style="margin:6px 0 0;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#67e8f9;opacity:0.6;">See Deeper &middot; Act Faster</p>
      </td>
    </tr></table>
  </td></tr>

  <!-- Main Content -->
  <tr><td style="padding:36px 40px;background-color:#111827;border-left:1px solid #1e293b;border-right:1px solid #1e293b;">
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#f1f5f9;">Welcome aboard, {first_name}! &#127881;</h1>
    <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#94a3b8;">
      Thank you for joining BlueVision &mdash; the AI-powered platform built to help aquaculture teams monitor fish health, detect diseases early, and take action faster.
    </p>

    <!-- Feature Cards -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="padding:16px 20px;background-color:#0f172a;border:1px solid #1e293b;border-radius:14px;vertical-align:top;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#38bdf8;">&#128300; Scan</p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#94a3b8;">Upload a fish photo and let our AI model analyze its health in seconds.</p>
        </td>
      </tr>
      <tr><td style="height:10px;"></td></tr>
      <tr>
        <td style="padding:16px 20px;background-color:#0f172a;border:1px solid #1e293b;border-radius:14px;vertical-align:top;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#38bdf8;">&#128202; Analyze</p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#94a3b8;">Get confidence scores, disease identification, and detailed diagnostics.</p>
        </td>
      </tr>
      <tr><td style="height:10px;"></td></tr>
      <tr>
        <td style="padding:16px 20px;background-color:#0f172a;border:1px solid #1e293b;border-radius:14px;vertical-align:top;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#38bdf8;">&#128138; Act</p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#94a3b8;">Receive treatment recommendations tailored to each diagnosis.</p>
        </td>
      </tr>
    </table>

    <!-- CTA Button -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:4px 0 8px;">
        <a href="{dashboard_url}"
           style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#2563eb 0%,#3b82f6 100%);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:12px;letter-spacing:0.3px;">
          Go to Your Dashboard &rarr;
        </a>
      </td></tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:24px 40px 32px;background-color:#0c1220;border-radius:0 0 20px 20px;border:1px solid #1e293b;border-top:none;">
    <p style="margin:0 0 6px;font-size:12px;color:#475569;">
      You&rsquo;re receiving this because you created a BlueVision account with this email address.
    </p>
    <p style="margin:0;font-size:12px;color:#334155;">
      &copy; 2025 BlueVision. All rights reserved.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""

    # Plain-text fallback
    text_body = f"""\
Welcome to BlueVision, {first_name}!

Thank you for joining BlueVision - the AI-powered platform built to help aquaculture teams monitor fish health, detect diseases early, and take action faster.

Here's what you can do:
- Scan: Upload a fish photo and let our AI analyze its health in seconds.
- Analyze: Get confidence scores, disease identification, and detailed diagnostics.
- Act: Receive treatment recommendations tailored to each diagnosis.

Log in to your dashboard and run your first scan:
{dashboard_url}

Welcome aboard!
- The BlueVision Team
"""

    message = EmailMessage()
    message["From"] = settings.smtp_from_email or settings.smtp_username
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(text_body)
    message.add_alternative(html_body, subtype="html")

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
        logger.info(f"Welcome email sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send welcome email to {to_email}: {e}")
        # Don't raise - welcome email is non-critical; signup should still succeed

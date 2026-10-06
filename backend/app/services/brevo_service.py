"""Brevo transactional messages and optional signup-list enrollment."""

from html import escape

import httpx

from backend.app.core.config import settings


async def send_signup_email(email: str, full_name: str | None) -> bool:
    """Send an onboarding prompt through Brevo's transactional email API."""
    if (
        not settings.BREVO_API_KEY
        or settings.BREVO_API_KEY == "your-brevo-api-key"
        or not settings.BREVO_SENDER_EMAIL
        or settings.BREVO_SENDER_EMAIL == "your-verified-sender@example.com"
    ):
        return False
    else:
        safe_name = escape(full_name or "there")
        app_url = escape(settings.FRONTEND_URL.rstrip("/"), quote=True)
        logo_url = escape(f"{settings.FRONTEND_URL.rstrip('/')}/logo.png", quote=True)
        html_content = f"""<!doctype html>
<html lang="en">
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#eef2ef;font-family:Arial,Helvetica,sans-serif;color:#25362d;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eef2ef;padding:32px 12px;">
            <tr><td align="center">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #dbe4dd;border-radius:16px;overflow:hidden;">
                    <tr><td style="padding:26px 36px;background:#173326;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
                            <td style="vertical-align:middle;padding-right:12px;"><img src="{settings.FRONTEND_URL.rstrip('/')}/logo.png" width="38" height="38" alt="" style="display:block;border:0;border-radius:8px;"></td>
                            <td style="vertical-align:middle;"><div style="font-family:Georgia,serif;font-size:22px;font-weight:bold;color:#f5f7f1;">PARK</div><div style="margin-top:3px;font-size:10px;letter-spacing:1.6px;color:#b8cabb;text-transform:uppercase;">Academic operations</div></td>
                        </tr></table>
                    </td></tr>
                    <tr><td style="padding:38px 36px 18px;">
                        <div style="font-size:11px;font-weight:bold;letter-spacing:1.8px;text-transform:uppercase;color:#64876c;">Your next step</div>
                        <h1 style="margin:12px 0 0;font-family:Georgia,serif;font-size:32px;line-height:1.2;font-weight:normal;color:#20392b;">Welcome to PARK, {safe_name}.</h1>
                        <p style="margin:18px 0 0;font-size:15px;line-height:1.75;color:#536359;">Your student account is ready. Sign in to confirm that this email address belongs to you.</p>
                    </td></tr>
                    <tr><td style="padding:8px 36px 0;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f6f2;border-left:3px solid #66866d;">
                            <tr><td style="padding:17px 19px;font-size:14px;line-height:1.7;color:#516157;">
                                Click the link below to <strong style="color:#294333;">Confirm your signup</strong>.
                            </td></tr>
                        </table>
                    </td></tr>
                    <tr><td align="left" style="padding:26px 36px 8px;">
                        <a href="{app_url}/login" style="display:inline-block;padding:14px 22px;border-radius:8px;background:#2d7053;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;">Sign in to your account</a>
                    </td></tr>
                    <tr><td style="padding:18px 36px 32px;font-size:12px;line-height:1.7;color:#77847a;">
                        If you didn't create a PARK account, you can ignore this message.
                    </td></tr>
                    <tr><td style="padding:18px 36px;background:#f7f8f5;border-top:1px solid #e5eae4;font-size:11px;line-height:1.6;color:#79857b;">
                        Sent by PARK · Project Approval and Resolution Kit<br>Academic work, thoughtfully organised.
                    </td></tr>
                </table>
            </td></tr>
        </table>
    </body>
</html>"""
    text_content = (
        f"Hello {full_name or 'there'},\n\nWelcome to PARK. Your student account is ready. "
        "Sign in to confirm this email address using the link below"
        f"Account instructions: {settings.FRONTEND_URL.rstrip('/')}/login\n\n"
        "If you did not create an account, you can ignore this message.\n\nPARK"
    )

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={"api-key": settings.BREVO_API_KEY, "accept": "application/json"},
            json={
                "sender": {"email": settings.BREVO_SENDER_EMAIL, "name": settings.BREVO_SENDER_NAME},
                "to": [{"email": email, "name": full_name or email}],
                "subject": "Welcome to PARK | Confirm your email",
                "htmlContent": html_content,
                "textContent": text_content,
            },
        )
        response.raise_for_status()
    return True


async def enroll_new_signup(email: str) -> bool:
    """Add a signup to the configured Brevo list to trigger its automation."""
    if (
        not settings.BREVO_API_KEY
        or settings.BREVO_API_KEY == "your-brevo-api-key"
        or settings.BREVO_SIGNUP_LIST_ID is None
    ):
        return False

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            "https://api.brevo.com/v3/contacts",
            headers={
                "api-key": settings.BREVO_API_KEY,
                "accept": "application/json",
                "content-type": "application/json",
            },
            json={
                "email": email,
                "listIds": [settings.BREVO_SIGNUP_LIST_ID],
                "updateEnabled": True,
            },
        )
        response.raise_for_status()
    return True
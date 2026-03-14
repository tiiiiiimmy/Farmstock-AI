"""
WhatsApp message sender stub.

In production this would integrate with the WhatsApp Business API or a gateway
such as Twilio. For demo purposes it logs messages to the console.
"""
import os


def send_message(to: str, message: str) -> bool:
    """
    Send a WhatsApp message to a phone number.

    Returns True if the message was sent (or logged), False on error.
    """
    wa_token = os.environ.get("WHATSAPP_TOKEN", "")
    wa_phone_id = os.environ.get("WHATSAPP_PHONE_ID", "")

    if not wa_token or not wa_phone_id:
        # Demo mode: print to console instead of calling the API
        print(f"[whatsapp] -> {to}:\n{message}\n")
        return True

    # Production path: POST to WhatsApp Cloud API
    import httpx

    url = f"https://graph.facebook.com/v18.0/{wa_phone_id}/messages"
    headers = {
        "Authorization": f"Bearer {wa_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": message},
    }

    try:
        resp = httpx.post(url, json=payload, headers=headers, timeout=10)
        resp.raise_for_status()
        print(f"[whatsapp] Message sent to {to}")
        return True
    except Exception as exc:
        print(f"[whatsapp] Failed to send message to {to}: {exc}")
        return False

const SERVICE_URL = process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL ?? "";

export type OtpResult = { ok: true } | { ok: false; message: string };

export async function sendOtp(phone: string): Promise<OtpResult> {
  if (!SERVICE_URL) return { ok: false, message: "خدمة واتساب غير مربوطة بالموقع" };
  try {
    const res = await fetch(`${SERVICE_URL}/otp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: data?.message ?? `HTTP ${res.status}` };
    return { ok: true };
  } catch {
    return { ok: false, message: "تعذّر الوصول لخدمة واتساب" };
  }
}

export async function verifyOtp(phone: string, code: string): Promise<OtpResult> {
  if (!SERVICE_URL) return { ok: false, message: "خدمة واتساب غير مربوطة بالموقع" };
  try {
    const res = await fetch(`${SERVICE_URL}/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: data?.message ?? `HTTP ${res.status}` };
    return { ok: true };
  } catch {
    return { ok: false, message: "تعذّر الوصول لخدمة واتساب" };
  }
}

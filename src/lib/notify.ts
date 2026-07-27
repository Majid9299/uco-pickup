const SERVICE_URL = process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL ?? "";

export async function sendGeneratorNotification(
  collectorId: string,
  phone: string,
  text: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!SERVICE_URL) return { ok: false, message: "خدمة واتساب غير مربوطة بالموقع" };
  if (!phone.trim()) return { ok: false, message: "المولّد ما له رقم واتساب مسجّل" };

  try {
    const res = await fetch(`${SERVICE_URL}/notify/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collectorId, phone, text }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: data?.message ?? `HTTP ${res.status}` };
    return { ok: true };
  } catch {
    return { ok: false, message: "تعذّر الوصول لخدمة واتساب" };
  }
}

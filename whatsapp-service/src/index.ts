import express from "express";
import cors from "cors";
import { WhatsappService, resolveSessionDir } from "./whatsapp.service";
import { OtpService } from "./otp.service";

// أهم إصلاح لمشكلة "الربط ينقطع": مكتبة Baileys ترمي أحيانًا أخطاء غير معالَجة
// من داخل معالجات WebSocket (مثل "Timed Out" أثناء رفع مفاتيح ما قبل الاتصال)،
// وهذه الأخطاء تحدث خارج أي try/catch نكتبه فتقتل عملية Node بالكامل → Railway
// يعيد التشغيل → نفس الخطأ = حلقة انهيار. نلتقطها هنا على مستوى العملية ونتجاهلها
// (منطق إعادة الاتصال بالمهلة التصاعدية داخل WhatsappService يتكفّل بالتعافي).
process.on("uncaughtException", (err) => {
  // eslint-disable-next-line no-console
  console.error("[uncaughtException] تم تجاهله للحفاظ على استمرار الخدمة:", (err as Error)?.message ?? err);
});
process.on("unhandledRejection", (reason) => {
  // eslint-disable-next-line no-console
  console.error("[unhandledRejection] تم تجاهله للحفاظ على استمرار الخدمة:", (reason as Error)?.message ?? reason);
});

const app = express();
// خلف بروكسي Railway — حتى يكون req.ip عنوان المرسل الحقيقي لحدّ الرسائل
app.set("trust proxy", 1);
app.use(express.json());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN ?? "*" }));

const whatsapp = new WhatsappService(resolveSessionDir());
const otp = new OtpService();
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "change-me";

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.get("x-admin-token") !== ADMIN_TOKEN) {
    res.status(401).json({ message: "غير مصرّح" });
    return;
  }
  next();
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/whatsapp/status", requireAdmin, (_req, res) => {
  res.json(whatsapp.getStatus());
});

app.post("/whatsapp/logout", requireAdmin, async (_req, res) => {
  await whatsapp.logout();
  res.json({ ok: true });
});

app.post("/otp/send", async (req, res) => {
  const phone = String(req.body?.phone ?? "").trim();
  if (!phone) {
    res.status(400).json({ message: "رقم الواتساب مطلوب" });
    return;
  }

  const cooldown = otp.getCooldownRemainingMs(phone);
  if (cooldown > 0) {
    res.status(429).json({ message: "انتظر قليلاً قبل طلب رمز جديد", retryAfterMs: cooldown });
    return;
  }

  const status = whatsapp.getStatus();
  if (!status.connected) {
    res.status(400).json({ message: "واتساب غير متصل حاليًا" });
    return;
  }

  const code = otp.issue(phone);
  try {
    await whatsapp.sendText(phone, `رمز التحقق الخاص بك: ${code}\nصالح لمدة 5 دقائق.`);
    res.json({ ok: true });
  } catch {
    res.status(502).json({ message: "تعذّر إرسال رمز التحقق، حاول مرة أخرى" });
  }
});

// كل الإشعارات (للمولّد والمندوب والمجمّع) تُرسل من رقم الشركة الواحد المربوط
// من لوحة الإدارة — أُلغي ربط رقم خاص لكل مجمّع (المالك 2026-11-02).
// النقطة عامة لأن الموقع ثابت بلا سيرفر، فنحدّها حتى لا يُستغل رقم الشركة
// في رسائل مزعجة: طول الرسالة، وعدد الرسائل لكل رقم ولكل IP في الساعة.
const NOTIFY_MAX_TEXT = 1000;
const NOTIFY_PER_PHONE_HOUR = 10;
const NOTIFY_PER_IP_HOUR = 60;
const HOUR_MS = 60 * 60 * 1000;
const notifyHits = new Map<string, number[]>();

function overLimit(key: string, max: number): boolean {
  const now = Date.now();
  const hits = (notifyHits.get(key) ?? []).filter((t) => now - t < HOUR_MS);
  if (hits.length >= max) {
    notifyHits.set(key, hits);
    return true;
  }
  hits.push(now);
  notifyHits.set(key, hits);
  return false;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, hits] of notifyHits) {
    if (hits.every((t) => now - t >= HOUR_MS)) notifyHits.delete(key);
  }
}, 10 * 60 * 1000);

app.post("/notify/send", async (req, res) => {
  const phone = String(req.body?.phone ?? "").replace(/[^\d]/g, "");
  const text = String(req.body?.text ?? "").trim();
  if (phone.length < 8 || phone.length > 15 || !text) {
    res.status(400).json({ message: "رقم واتساب صحيح ونص الرسالة مطلوبان" });
    return;
  }
  if (text.length > NOTIFY_MAX_TEXT) {
    res.status(400).json({ message: "الرسالة أطول من المسموح" });
    return;
  }
  if (overLimit(`ip:${req.ip}`, NOTIFY_PER_IP_HOUR) || overLimit(`phone:${phone}`, NOTIFY_PER_PHONE_HOUR)) {
    res.status(429).json({ message: "تجاوزت عدد الرسائل المسموح في الساعة، حاول لاحقًا" });
    return;
  }
  if (!whatsapp.getStatus().connected) {
    res.status(503).json({ message: "رقم واتساب الشركة غير متصل حاليًا — راجع الإدارة" });
    return;
  }
  try {
    await whatsapp.sendText(phone, text);
    res.json({ ok: true });
  } catch (err) {
    res.status(502).json({ message: (err as Error).message });
  }
});

app.post("/otp/verify", (req, res) => {
  const phone = String(req.body?.phone ?? "").trim();
  const code = String(req.body?.code ?? "").trim();
  if (!phone || !code) {
    res.status(400).json({ message: "الرقم والرمز مطلوبان" });
    return;
  }
  const result = otp.verify(phone, code);
  if (!result.ok) {
    res.status(400).json({ message: result.reason });
    return;
  }
  res.json({ ok: true });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`whatsapp-service listening on :${port}`);
});

whatsapp.connect();

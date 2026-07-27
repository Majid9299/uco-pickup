import express from "express";
import cors from "cors";
import { WhatsappService, resolveSessionDir, resolveNotifySessionsBaseDir } from "./whatsapp.service";
import { OtpService } from "./otp.service";
import { NotifyManager } from "./notify.manager";

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN ?? "*" }));

const whatsapp = new WhatsappService(resolveSessionDir());
const otp = new OtpService();
const notify = new NotifyManager(resolveNotifySessionsBaseDir());
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

// اتصال واتساب منفصل خاص بكل مجمّع، لإرسال إشعارات السحب لمولّديه —
// مقصودًا بلا حماية ADMIN_TOKEN لأن لوحة المجمّع نفسها بدون تسجيل دخول
// حقيقي بعد (نفس نمط بقية المشروع)، ومحمي فقط بتحديد أقصى عدد جلسات
app.get("/notify/:collectorId/status", (req, res) => {
  try {
    res.json(notify.getStatus(req.params.collectorId));
  } catch (err) {
    res.status(429).json({ message: (err as Error).message });
  }
});

app.post("/notify/:collectorId/logout", async (req, res) => {
  await notify.logout(req.params.collectorId);
  res.json({ ok: true });
});

app.post("/notify/send", async (req, res) => {
  const collectorId = String(req.body?.collectorId ?? "").trim();
  const phone = String(req.body?.phone ?? "").trim();
  const text = String(req.body?.text ?? "").trim();
  if (!collectorId || !phone || !text) {
    res.status(400).json({ message: "collectorId وphone وtext كلها مطلوبة" });
    return;
  }
  try {
    await notify.sendText(collectorId, phone, text);
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

import path from "node:path";
import fs from "node:fs";
import QRCode from "qrcode";
import pino from "pino";
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";

const logger = pino({ level: "warn" });

export interface WhatsAppStatus {
  connected: boolean;
  phoneNumber: string | null;
  qr: string | null;
  stats: { sent: number; success: number; failed: number };
}

// أقصى مدة معقولة لمحاولة اتصال واحدة (جلب الإصدار + المصافحة الأولى مع
// واتساب) قبل ما نعتبرها عالقة ونجبرها تعيد المحاولة — حماية من حالة صمت
// كامل بدون "open" ولا "close" ولا حتى خطأ (لاحظناها فعليًا في الإنتاج)
const CONNECT_TIMEOUT_MS = 25000;
// كل قد إيش نفحص صحة الاتصال — يخلي الخدمة تتعافى من تعليق فعلي بدون تدخّل يدوي
const WATCHDOG_INTERVAL_MS = 15000;
// مهلة تصاعدية بين محاولات إعادة الاتصال — أهم إصلاح: الإعادة الفورية بلا
// مهلة كانت تسبب عشرات المحاولات في ثوانٍ ("stream errored out" متلاحق) تُغرق
// واتساب فيرفض الاتصال ويؤدي لانهيار العملية. نبدأ بـ 3 ثوانٍ ونضاعف حتى دقيقة.
const RECONNECT_BASE_MS = 3000;
const RECONNECT_MAX_MS = 60000;

export class WhatsappService {
  private socket: WASocket | null = null;
  private connected = false;
  private phoneNumber: string | null = null;
  private latestQrDataUrl: string | null = null;
  private stats = { sent: 0, success: 0, failed: 0 };
  private connecting = false;
  private connectingSince: number | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private sessionDir: string) {
    fs.mkdirSync(this.sessionDir, { recursive: true });
    setInterval(() => this.checkWatchdog(), WATCHDOG_INTERVAL_MS);
  }

  // جدولة إعادة اتصال بمهلة تصاعدية بدل الإعادة الفورية — لو فيه مهلة مجدولة
  // أصلًا لا نضيف ثانية فوقها. تُصفّر العدّاد عند نجاح الاتصال (open).
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay =
      Math.min(RECONNECT_BASE_MS * 2 ** this.reconnectAttempts, RECONNECT_MAX_MS) +
      Math.floor(Math.random() * 1000);
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private checkWatchdog(): void {
    const stuckConnecting =
      this.connecting &&
      this.connectingSince !== null &&
      Date.now() - this.connectingSince > CONNECT_TIMEOUT_MS;
    // حالة نادرة إضافية: مو متصل، مو بمنتصف محاولة، ما فيه QR ظاهر، وما فيه
    // إعادة اتصال مجدولة — يعني انسدّت الحلقة بطريقة ما بدون أي مسار إعادة محاولة
    const fullyIdle =
      !this.connecting &&
      !this.connected &&
      !this.latestQrDataUrl &&
      this.reconnectTimer === null;

    if (stuckConnecting || fullyIdle) {
      try {
        this.socket?.end(new Error("watchdog-reset"));
      } catch {
        // نتجاهل أي فشل بإنهاء المقبس القديم، المهم نصفّر الحالة ونعيد المحاولة
      }
      this.socket = null;
      this.connecting = false;
      this.connectingSince = null;
      this.connect();
    }
  }

  async connect(): Promise<void> {
    // لو صار نداء مباشر (logout/watchdog) وفيه مهلة إعادة اتصال مجدولة، نلغيها
    // حتى لا تشتغل محاولتان بالتوازي
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.connecting) return;
    this.connecting = true;
    this.connectingSince = Date.now();

    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir);
      // نجيب آخر إصدار مدعوم فعليًا من واتساب بدل الاعتماد على النسخة المجمّدة
      // بالمكتبة — تفاديًا لحلقة رفض اتصال بكود 405 (درس مستفاد سابقًا)
      const { version } = await fetchLatestBaileysVersion();

      const socket = makeWASocket({
        version,
        auth: state,
        logger,
        printQRInTerminal: false,
        // لا نُظهر الرقم "متصل/متاح" — بوت إرسال فقط، يقلّل تضارب الحضور
        markOnlineOnConnect: false,
        // إعدادات صلابة: نبّض كل 20 ثانية، ومهلة اتصال أطول، وتأخير بسيط قبل
        // إعادة إرسال الطلبات الفاشلة داخليًا (يخفّف الضغط على واتساب)
        keepAliveIntervalMs: 20000,
        connectTimeoutMs: 30000,
        retryRequestDelayMs: 2000,
      });
      this.socket = socket;

      socket.ev.on("creds.update", saveCreds);

      socket.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.latestQrDataUrl = await QRCode.toDataURL(qr);
        }

        if (connection === "open") {
          this.connected = true;
          this.connecting = false;
          this.connectingSince = null;
          this.latestQrDataUrl = null;
          this.phoneNumber = socket.user?.id?.split(":")[0] ?? null;
          // نجح الاتصال — نصفّر عدّاد المهلة التصاعدية ونلغي أي إعادة مجدولة
          this.reconnectAttempts = 0;
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }
        }

        if (connection === "close") {
          this.connected = false;
          this.connecting = false;
          this.connectingSince = null;
          this.phoneNumber = null;
          const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
          const loggedOut = statusCode === DisconnectReason.loggedOut;
          // نسجّل كود سبب الإغلاق — يسهّل تشخيص الانقطاعات مستقبلًا
          logger.warn({ statusCode }, "whatsapp connection closed");
          // لو واتساب فصل الجلسة من جهة الجوال (تسجيل خروج فعلي)، بيانات
          // الجلسة المحفوظة صارت غير صالحة — لازم تُمسح قبل إعادة المحاولة
          // وإلا نضل عالقين بدون أي رمز QR جديد يظهر أبدًا
          if (loggedOut) {
            fs.rmSync(this.sessionDir, { recursive: true, force: true });
            this.reconnectAttempts = 0;
          }
          // مهم: لا نعيد الاتصال فورًا — نستخدم مهلة تصاعدية. الإعادة الفورية
          // كانت تسبب حلقة "stream errored out" متلاحقة تنتهي بانهيار العملية.
          this.scheduleReconnect();
        }
      });
    } catch {
      // فشل عابر أثناء الإعداد (قبل ما نوصل لمرحلة أحداث الاتصال) — لازم
      // نصفّر connecting ونعيد المحاولة بمهلة تصاعدية، وإلا تضل الجلسة عالقة
      // للأبد بدون رمز QR ولا محاولة اتصال جديدة
      this.connecting = false;
      this.connectingSince = null;
      this.scheduleReconnect();
    }
  }

  async logout(): Promise<void> {
    try {
      await this.socket?.logout();
    } catch {
      // نتجاهل فشل logout عند عدم وجود اتصال فعلي أصلًا
    }
    fs.rmSync(this.sessionDir, { recursive: true, force: true });
    this.connected = false;
    this.phoneNumber = null;
    this.latestQrDataUrl = null;
    this.socket = null;
    await this.connect();
  }

  async sendText(phone: string, text: string): Promise<void> {
    if (!this.socket || !this.connected) {
      throw new Error("واتساب غير متصل حاليًا");
    }
    const jid = `${phone.replace(/[^\d]/g, "")}@s.whatsapp.net`;
    this.stats.sent += 1;
    try {
      await this.socket.sendMessage(jid, { text });
      this.stats.success += 1;
    } catch (err) {
      this.stats.failed += 1;
      throw err;
    }
  }

  getStatus(): WhatsAppStatus {
    return {
      connected: this.connected,
      phoneNumber: this.phoneNumber,
      qr: this.connected ? null : this.latestQrDataUrl,
      stats: { ...this.stats },
    };
  }
}

export function resolveSessionDir(): string {
  return process.env.WA_SESSION_DIR
    ? path.resolve(process.env.WA_SESSION_DIR)
    : path.resolve(__dirname, "..", "data", "wa-session");
}

// مجلد أساس لجلسات إشعارات المجمّعين (جلسة فرعية لكل collectorId بداخله) —
// لازم يكون على نفس الـ Volume الدائم في الإنتاج، وإلا تُفقد الجلسات بكل نشر
export function resolveNotifySessionsBaseDir(): string {
  return process.env.WA_NOTIFY_SESSIONS_DIR
    ? path.resolve(process.env.WA_NOTIFY_SESSIONS_DIR)
    : path.resolve(__dirname, "..", "data", "notify-sessions");
}

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

export class WhatsappService {
  private socket: WASocket | null = null;
  private connected = false;
  private phoneNumber: string | null = null;
  private latestQrDataUrl: string | null = null;
  private stats = { sent: 0, success: 0, failed: 0 };
  private connecting = false;

  constructor(private sessionDir: string) {
    fs.mkdirSync(this.sessionDir, { recursive: true });
  }

  async connect(): Promise<void> {
    if (this.connecting) return;
    this.connecting = true;

    const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir);
    // نجيب آخر إصدار مدعوم فعليًا من واتساب بدل الاعتماد على النسخة المجمّدة
    // بالمكتبة — تفاديًا لحلقة رفض اتصال بكود 405 (درس مستفاد سابقًا)
    const { version } = await fetchLatestBaileysVersion();

    const socket = makeWASocket({
      version,
      auth: state,
      logger,
      printQRInTerminal: false,
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
        this.latestQrDataUrl = null;
        this.phoneNumber = socket.user?.id?.split(":")[0] ?? null;
      }

      if (connection === "close") {
        this.connected = false;
        this.connecting = false;
        this.phoneNumber = null;
        const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;
        if (!loggedOut) {
          this.connect();
        }
      }
    });
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

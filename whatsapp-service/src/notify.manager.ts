import path from "node:path";
import { WhatsappService } from "./whatsapp.service";

const MAX_CONCURRENT_SESSIONS = 25;

// يسمح كل مجمّع بربط رقم واتساب خاص فيه (منفصل عن رقم OTP النظامي الواحد)
// لإرسال إشعارات السحب لمولّديه — جلسة Baileys مستقلة لكل collectorId
function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
}

export class NotifyManager {
  private sessions = new Map<string, WhatsappService>();

  constructor(private baseDir: string) {}

  private getOrCreate(rawCollectorId: string): WhatsappService {
    const collectorId = sanitizeId(rawCollectorId);
    if (!collectorId) throw new Error("معرّف المجمّع غير صالح");

    let svc = this.sessions.get(collectorId);
    if (!svc) {
      if (this.sessions.size >= MAX_CONCURRENT_SESSIONS) {
        throw new Error("تم الوصول للحد الأقصى لعدد الاتصالات المتزامنة، حاول لاحقًا");
      }
      svc = new WhatsappService(path.join(this.baseDir, collectorId));
      this.sessions.set(collectorId, svc);
      svc.connect();
    }
    return svc;
  }

  getStatus(collectorId: string) {
    return this.getOrCreate(collectorId).getStatus();
  }

  async logout(rawCollectorId: string): Promise<void> {
    const collectorId = sanitizeId(rawCollectorId);
    const svc = this.sessions.get(collectorId);
    if (svc) await svc.logout();
  }

  async sendText(rawCollectorId: string, phone: string, text: string): Promise<void> {
    const collectorId = sanitizeId(rawCollectorId);
    const svc = this.sessions.get(collectorId);
    if (!svc) throw new Error("هذا المجمّع ما ربط رقم واتساب للإشعارات بعد");
    await svc.sendText(phone, text);
  }
}

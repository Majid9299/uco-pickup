const CODE_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

interface OtpEntry {
  code: string;
  expiresAt: number;
  attemptsLeft: number;
  lastSentAt: number;
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export class OtpService {
  private codes = new Map<string, OtpEntry>();

  getCooldownRemainingMs(phone: string): number {
    const entry = this.codes.get(normalizePhone(phone));
    if (!entry) return 0;
    const elapsed = Date.now() - entry.lastSentAt;
    return Math.max(0, RESEND_COOLDOWN_MS - elapsed);
  }

  issue(phone: string): string {
    const key = normalizePhone(phone);
    const code = generateCode();
    this.codes.set(key, {
      code,
      expiresAt: Date.now() + CODE_TTL_MS,
      attemptsLeft: MAX_ATTEMPTS,
      lastSentAt: Date.now(),
    });
    return code;
  }

  verify(phone: string, code: string): { ok: boolean; reason?: string } {
    const key = normalizePhone(phone);
    const entry = this.codes.get(key);
    if (!entry) return { ok: false, reason: "لا يوجد رمز مُرسَل لهذا الرقم" };
    if (Date.now() > entry.expiresAt) {
      this.codes.delete(key);
      return { ok: false, reason: "انتهت صلاحية الرمز" };
    }
    if (entry.attemptsLeft <= 0) {
      this.codes.delete(key);
      return { ok: false, reason: "تجاوزت عدد المحاولات المسموحة" };
    }
    if (entry.code !== code.trim()) {
      entry.attemptsLeft -= 1;
      return { ok: false, reason: "رمز غير صحيح" };
    }
    this.codes.delete(key);
    return { ok: true };
  }
}

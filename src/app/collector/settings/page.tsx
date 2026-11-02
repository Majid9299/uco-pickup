"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PhoneInput } from "@/components/PhoneInput";
import { useData } from "@/components/DataProvider";
import { useCollectorSession } from "@/components/useCollectorSession";
import { useLanguage } from "@/components/LanguageProvider";
import { NotifyWhatsAppPanel } from "@/components/NotifyWhatsAppPanel";

export default function CollectorSettingsPage() {
  const { t } = useLanguage();
  const { collectorId } = useCollectorSession();
  const { collectors, setCollectorWhatsapp, setCollectorPin } = useData();
  const collector = collectors.find((c) => c.id === collectorId);

  // مزامنة الحقل المحلي مع رقم واتساب المجمّع الفعلي بمجرد وصوله من القاعدة،
  // بنمط React الموصى به لتعديل الحالة أثناء الرندر بدل useEffect+setState
  const [syncedWhatsapp, setSyncedWhatsapp] = useState(collector?.whatsapp);
  const [whatsapp, setWhatsapp] = useState(collector?.whatsapp ?? "");
  if (collector?.whatsapp !== syncedWhatsapp) {
    setSyncedWhatsapp(collector?.whatsapp);
    setWhatsapp(collector?.whatsapp ?? "");
  }

  const [saved, setSaved] = useState(false);
  const [pin, setPin] = useState("");
  const [pinSaved, setPinSaved] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  async function submit() {
    if (!collectorId) return;
    await setCollectorWhatsapp(collectorId, whatsapp.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function submitPin() {
    if (!collectorId) return;
    setPinError(null);
    if (!/^\d{4,8}$/.test(pin)) {
      setPinError(t("الرقم السري لازم يكون بين 4 و8 أرقام", "PIN must be 4–8 digits"));
      return;
    }
    await setCollectorPin(collectorId, pin);
    setPin("");
    setPinSaved(true);
    setTimeout(() => setPinSaved(false), 2000);
  }

  if (!collectorId) {
    return (
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <Header />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-5 py-8 text-center">
          <p className="text-sm text-neutral-500">{t("اختر شركتك أولًا من لوحة المجمّع", "Pick your company first from the collector dashboard")}</p>
          <Link href="/collector" className="text-sm font-bold text-brand-700">
            {t("← لوحة المجمّع", "← Collector dashboard")}
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
        <div>
          <Link href="/collector" className="text-xs font-semibold text-neutral-400">
            {t("← لوحة المجمّع", "← Collector dashboard")}
          </Link>
          <h1 className="mt-2 text-lg font-extrabold text-neutral-900">{t("الإعدادات", "Settings")}</h1>
        </div>

        <NotifyWhatsAppPanel collectorId={collectorId} />

        <div className="flex flex-col gap-1.5 rounded-2xl border border-neutral-200 bg-white p-4">
          <label className="text-xs font-semibold text-neutral-500">
            {t("رقم واتساب للعرض فقط (اختياري)", "Display-only WhatsApp number (optional)")}
          </label>
          <p className="text-[11px] text-neutral-400">
            {t(
              "يظهر لك ولإدارة إنفير كرقم تواصل — لا يُستخدم لإرسال الإشعارات، الإرسال الفعلي من الرقم المربوط بالأعلى",
              "Shown to you and Invare admin as a contact number — not used to send notifications, actual sending is from the number linked above"
            )}
          </p>
          <div className="mt-1">
            <PhoneInput value={whatsapp} onChange={setWhatsapp} />
          </div>
        </div>

        <button
          onClick={submit}
          disabled={!whatsapp.trim()}
          className="h-14 rounded-2xl bg-brand-600 text-lg font-bold text-white transition active:scale-[0.98] disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          {t("حفظ", "Save")}
        </button>

        {saved && (
          <div className="rounded-xl bg-accent-50 p-3 text-center text-sm font-semibold text-accent-600">
            {t("تم الحفظ ✅", "Saved ✅")}
          </div>
        )}

        <div className="flex flex-col gap-1.5 rounded-2xl border border-neutral-200 bg-white p-4">
          <label className="text-xs font-semibold text-neutral-500">
            {t("رقم سري احتياطي لتسجيل الدخول", "Backup login PIN")}
          </label>
          <p className="text-[11px] text-neutral-400">
            {t(
              "يخلّيك تدخل بدون واتساب لو تعطّل الـ OTP — بدل رمز التحقق، تدخل رقمك السري مباشرة",
              "Lets you log in without WhatsApp if OTP is down — enter this PIN directly instead of a verification code"
            )}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-neutral-500">
            {collector?.pin
              ? t("✅ عندك رقم سري مضبوط حاليًا — اكتب رقم جديد لتغييره", "✅ You have a PIN set — enter a new one to change it")
              : t("ما ضبطت رقم سري بعد", "No PIN set yet")}
          </p>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="••••"
            dir="ltr"
            inputMode="numeric"
            type="password"
            className="mt-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-center text-lg tracking-[0.3em] focus:border-brand-500 focus:outline-none"
          />
          {pinError && <p className="text-[11px] font-semibold text-red-600">{pinError}</p>}
          <button
            onClick={submitPin}
            disabled={!pin.trim()}
            className="mt-1 h-12 rounded-2xl bg-neutral-900 text-sm font-bold text-white disabled:bg-neutral-200 disabled:text-neutral-400"
          >
            {t("حفظ الرقم السري", "Save PIN")}
          </button>
          {pinSaved && (
            <p className="text-center text-xs font-semibold text-accent-600">{t("تم حفظ الرقم السري ✅", "PIN saved ✅")}</p>
          )}
        </div>

        <Link
          href="/collector/invoicing"
          className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 active:scale-[0.98]"
        >
          <div>
            <p className="text-sm font-bold text-neutral-700">{t("🧾 إعدادات الفوترة", "🧾 Invoicing settings")}</p>
            <p className="mt-0.5 text-xs text-neutral-400">
              {t("الرقم الضريبي، ترقيم الفواتير، مقاس الصفحة، الخلفية والختم", "Tax number, invoice numbering, page size, background & stamp")}
            </p>
          </div>
          <span className="text-neutral-400">‹</span>
        </Link>
      </main>
    </div>
  );
}

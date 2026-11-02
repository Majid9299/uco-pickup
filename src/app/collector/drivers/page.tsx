"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PhoneInput } from "@/components/PhoneInput";
import { useData } from "@/components/DataProvider";
import { useCollectorSession } from "@/components/useCollectorSession";
import { useLanguage } from "@/components/LanguageProvider";

function driverLink(driverId: string) {
  if (typeof window === "undefined") return "";
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${window.location.origin}${basePath}/driver/?id=${driverId}`;
}

function timeAgo(iso: string | undefined, t: (ar: string, en: string) => string) {
  if (!iso) return t("لا يوجد موقع بعد", "No location yet");
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return t("الآن", "just now");
  if (minutes < 60) return t(`قبل ${minutes} دقيقة`, `${minutes} min ago`);
  const hours = Math.round(minutes / 60);
  return t(`قبل ${hours} ساعة`, `${hours}h ago`);
}

function AddDriverForm({ collectorId }: { collectorId: string }) {
  const { t } = useLanguage();
  const { addDriver } = useData();
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [open, setOpen] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit() {
    const driver = await addDriver({
      collectorId,
      name: name.trim(),
      whatsapp: whatsapp.trim(),
    });
    setCreatedLink(driverLink(driver.id));
    setName("");
    setWhatsapp("");
  }

  async function copyLink() {
    if (!createdLink) return;
    await navigator.clipboard.writeText(createdLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (createdLink) {
    return (
      <div className="mb-3 flex flex-col gap-2 rounded-xl bg-accent-50 p-3">
        <p className="text-xs font-bold text-accent-700">
          {t("✅ تمت إضافة المندوب — أرسل له هذا الرابط عبر واتساب", "✅ Representative added — send them this link via WhatsApp")}
        </p>
        <p className="break-all rounded-lg bg-white px-3 py-2 text-[11px] text-neutral-600" dir="ltr">
          {createdLink}
        </p>
        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className="flex-1 rounded-xl bg-brand-600 py-2 text-xs font-bold text-white"
          >
            {copied ? t("✅ تم النسخ", "✅ Copied") : t("نسخ الرابط", "Copy link")}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(createdLink)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-xl border border-neutral-200 bg-white py-2 text-center text-xs font-bold text-neutral-700"
          >
            {t("إرسال عبر واتساب", "Send via WhatsApp")}
          </a>
        </div>
        <button
          onClick={() => setCreatedLink(null)}
          className="text-xs font-semibold text-neutral-400"
        >
          {t("+ إضافة مندوب آخر", "+ Add another representative")}
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-3 w-full rounded-xl border border-dashed border-neutral-300 py-2 text-xs font-bold text-neutral-500"
      >
        {t("+ إضافة مندوب جديد", "+ Add new representative")}
      </button>
    );
  }

  const isValid = name.trim() && whatsapp.trim();

  return (
    <div className="mb-3 flex flex-col gap-3 rounded-xl bg-neutral-50 p-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("اسم المندوب", "Representative name")}
        className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
      />
      <PhoneInput value={whatsapp} onChange={setWhatsapp} size="sm" />
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={!isValid}
          className="flex-1 rounded-xl bg-brand-600 py-2 text-xs font-bold text-white disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          {t("حفظ المندوب", "Save representative")}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-500"
        >
          {t("إلغاء", "Cancel")}
        </button>
      </div>
    </div>
  );
}

function DriverPinControl({ driverId, hasPin }: { driverId: string; hasPin: boolean }) {
  const { t } = useLanguage();
  const { setDriverPin } = useData();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit() {
    setError(null);
    if (!/^\d{4,8}$/.test(pin)) {
      setError(t("الرقم السري لازم يكون بين 4 و8 أرقام", "PIN must be 4–8 digits"));
      return;
    }
    await setDriverPin(driverId, pin);
    setPin("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex-1 rounded-lg border border-neutral-200 bg-neutral-50 py-1.5 text-[11px] font-bold text-neutral-600"
      >
        {hasPin ? t("🔑 تغيير الرقم السري", "🔑 Change PIN") : t("🔑 ضبط رقم سري", "🔑 Set PIN")}
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-1.5 rounded-lg bg-neutral-50 p-2">
      <input
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/[^\d]/g, ""))}
        placeholder="••••"
        dir="ltr"
        inputMode="numeric"
        type="password"
        className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-center text-sm tracking-[0.3em] focus:border-brand-500 focus:outline-none"
      />
      {error && <p className="text-[10px] font-semibold text-red-600">{error}</p>}
      <div className="flex gap-1.5">
        <button
          onClick={submit}
          disabled={!pin.trim()}
          className="flex-1 rounded-lg bg-neutral-900 py-1.5 text-[11px] font-bold text-white disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          {t("حفظ", "Save")}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-500"
        >
          {t("إلغاء", "Cancel")}
        </button>
      </div>
      {saved && <p className="text-center text-[10px] font-semibold text-accent-600">{t("تم الحفظ ✅", "Saved ✅")}</p>}
    </div>
  );
}

function CollectorDriversContent({ collectorId }: { collectorId: string }) {
  const { t } = useLanguage();
  const { drivers, toggleDriverActive } = useData();
  const myDrivers = drivers.filter((d) => d.collectorId === collectorId);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyDriverLink(driverId: string) {
    await navigator.clipboard.writeText(driverLink(driverId));
    setCopiedId(driverId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-5 py-6">
      <div>
        <Link href="/collector" className="text-xs font-semibold text-neutral-400">
          {t("← لوحة المجمّع", "← Collector dashboard")}
        </Link>
        <h1 className="mt-2 text-lg font-extrabold text-neutral-900">{t("المندوبون والأسطول", "Representatives & fleet")}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {t(
            "أضف مندوبًا وأرسل له رابط دخوله — يدخل بدون تسجيل حساب، ويقدر تتبّع موقعه هنا وقت ما يكون شغّال",
            "Add a representative and send them their login link — no account needed, and you can track their location here while they're on shift"
          )}
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <AddDriverForm collectorId={collectorId} />

        {myDrivers.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-400">{t("ما فيه مندوبين مضافين بعد", "No representatives added yet")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {myDrivers.map((d) => (
              <div key={d.id} className="rounded-xl border border-neutral-100 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-neutral-800">{d.name}</p>
                    <p className="text-[11px] text-neutral-400" dir="ltr">
                      {d.whatsapp}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleDriverActive(d.id)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
                      d.active ? "bg-accent-50 text-accent-600" : "bg-red-50 text-red-600"
                    }`}
                  >
                    {d.active ? t("مفعّل", "Active") : t("معطّل", "Disabled")}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-400">
                  <span>📍 {timeAgo(d.locationUpdatedAt, t)}</span>
                  {d.lat && d.lng && (
                    <a
                      href={`https://www.google.com/maps?q=${d.lat},${d.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-brand-700"
                    >
                      {t("عرض على الخريطة ←", "View on map ←")}
                    </a>
                  )}
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => copyDriverLink(d.id)}
                    className="flex-1 rounded-lg border border-neutral-200 bg-neutral-50 py-1.5 text-[11px] font-bold text-neutral-600"
                  >
                    {copiedId === d.id ? t("✅ تم نسخ الرابط", "✅ Link copied") : t("🔗 نسخ رابط دخول المندوب", "🔗 Copy representative login link")}
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(driverLink(d.id))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-lg border border-neutral-200 bg-neutral-50 py-1.5 text-center text-[11px] font-bold text-neutral-600"
                  >
                    {t("إرسال عبر واتساب", "Send via WhatsApp")}
                  </a>
                </div>
                <DriverPinControl driverId={d.id} hasPin={!!d.pin} />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function CollectorDriversPage() {
  const { t } = useLanguage();
  const { collectorId } = useCollectorSession();

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      {!collectorId ? (
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-5 py-8 text-center">
          <p className="text-sm text-neutral-500">{t("سجّل الدخول أولًا من الصفحة الرئيسية", "Log in first from the home page")}</p>
          <Link href="/collector" className="text-sm font-bold text-brand-700">
            {t("← لوحة المجمّع", "← Collector dashboard")}
          </Link>
        </main>
      ) : (
        <CollectorDriversContent collectorId={collectorId} />
      )}
    </div>
  );
}

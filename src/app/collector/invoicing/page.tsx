"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useData } from "@/components/DataProvider";
import { useCollectorSession } from "@/components/useCollectorSession";
import { useLanguage } from "@/components/LanguageProvider";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CollectorInvoicingPage() {
  const { t } = useLanguage();
  const { collectorId } = useCollectorSession();
  const { collectors, setCollectorInvoiceSettings } = useData();
  const collector = collectors.find((c) => c.id === collectorId);

  const [syncedId, setSyncedId] = useState(collector?.id);
  const [companyName, setCompanyName] = useState(collector?.companyName ?? "");
  const [email, setEmail] = useState(collector?.email ?? "");
  const [website, setWebsite] = useState(collector?.website ?? "");
  const [taxNumber, setTaxNumber] = useState(collector?.taxNumber ?? "");
  const [crNumber, setCrNumber] = useState(collector?.crNumber ?? "");
  const [invoicePrefix, setInvoicePrefix] = useState(collector?.invoicePrefix ?? "INV-");
  const [startNumber, setStartNumber] = useState(String(collector?.invoiceStartNumber ?? 1000));
  const [pageSize, setPageSize] = useState<"a4" | "a5">(collector?.invoicePageSize ?? "a4");
  const [letterhead, setLetterhead] = useState(collector?.invoiceLetterhead ?? "");
  const [stamp, setStamp] = useState(collector?.invoiceStamp ?? "");
  if (collector && collector.id !== syncedId) {
    setSyncedId(collector.id);
    setCompanyName(collector.companyName ?? "");
    setEmail(collector.email ?? "");
    setWebsite(collector.website ?? "");
    setTaxNumber(collector.taxNumber ?? "");
    setCrNumber(collector.crNumber ?? "");
    setInvoicePrefix(collector.invoicePrefix ?? "INV-");
    setStartNumber(String(collector.invoiceStartNumber ?? 1000));
    setPageSize(collector.invoicePageSize ?? "a4");
    setLetterhead(collector.invoiceLetterhead ?? "");
    setStamp(collector.invoiceStamp ?? "");
  }

  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const letterheadInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  async function handleLetterheadUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLetterhead(await readFileAsDataUrl(file));
  }

  async function handleStampUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStamp(await readFileAsDataUrl(file));
  }

  async function submit() {
    if (!collectorId) return;
    setBusy(true);
    setError(null);
    try {
      await setCollectorInvoiceSettings(collectorId, {
        companyName: companyName.trim() || undefined,
        taxNumber: taxNumber.trim(),
        crNumber: crNumber.trim(),
        invoiceStartNumber: Number(startNumber) || 1000,
        invoicePrefix: invoicePrefix.trim() || "INV-",
        invoicePageSize: pageSize,
        invoiceLetterhead: letterhead || undefined,
        invoiceStamp: stamp || undefined,
        email: email.trim() || undefined,
        website: website.trim() || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(
        t(
          `تعذّر الحفظ — تأكد إن قاعدة البيانات محدّثة (${(err as Error).message})`,
          `Save failed — make sure the database is up to date (${(err as Error).message})`
        )
      );
    } finally {
      setBusy(false);
    }
  }

  if (!collectorId) {
    return (
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <Header />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-5 py-8 text-center">
          <p className="text-sm text-neutral-500">{t("سجّل الدخول أولًا من الصفحة الرئيسية", "Log in first from the home page")}</p>
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
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-5 py-6">
        <div>
          <Link href="/collector" className="text-xs font-semibold text-neutral-400">
            {t("← لوحة المجمّع", "← Collector dashboard")}
          </Link>
          <h1 className="mt-2 text-lg font-extrabold text-neutral-900">{t("🧾 إعدادات الفوترة", "🧾 Invoicing settings")}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {t(
              "تتحكّم بشكل الفاتورة اللي تصل تلقائيًا لكل مولّد عبر واتساب بعد كل عملية سحب",
              "Controls how the invoice that's automatically sent to each generator via WhatsApp after every pickup looks"
            )}
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-xs font-bold text-neutral-700">{t("بيانات الشركة", "Company details")}</p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-500">{t("اسم الشركة (يظهر بالفاتورة)", "Company name (shown on invoice)")}</label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={collector?.name ?? ""}
              className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-500">{t("رقم السجل التجاري (اختياري)", "Commercial registration number (optional)")}</label>
            <input
              value={crNumber}
              onChange={(e) => setCrNumber(e.target.value)}
              placeholder={t("مثال: 1234567", "e.g. 1234567")}
              dir="ltr"
              className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-500">{t("البريد الإلكتروني (اختياري)", "Email (optional)")}</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="info@company.com"
              dir="ltr"
              type="email"
              className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-500">{t("الموقع الإلكتروني (اختياري)", "Website (optional)")}</label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="www.company.com"
              dir="ltr"
              className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-500">{t("الرقم الضريبي (اختياري)", "Tax registration number (optional)")}</label>
            <input
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
              placeholder={t("مثال: OM1234567890", "e.g. OM1234567890")}
              dir="ltr"
              className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-xs font-bold text-neutral-700">{t("ترقيم وشكل الفاتورة", "Invoice numbering & layout")}</p>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-neutral-500">{t("بادئة رقم الفاتورة", "Invoice number prefix")}</label>
              <input
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                placeholder="INV-"
                dir="ltr"
                className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-neutral-500">{t("يبدأ الترقيم من", "Numbers start from")}</label>
              <input
                value={startNumber}
                onChange={(e) => setStartNumber(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                dir="ltr"
                className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
          <p className="-mt-2 text-[11px] text-neutral-400">
            {t("كل فاتورة جديدة تاخذ الرقم اللي بعده تلقائيًا حسب ترتيب اكتمال العمليات", "Each new invoice automatically gets the next number, in the order pickups are completed")}
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-500">{t("مقاس صفحة الفاتورة", "Invoice page size")}</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPageSize("a4")}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold ${
                  pageSize === "a4" ? "bg-brand-600 text-white" : "bg-neutral-50 text-neutral-600 ring-1 ring-neutral-200"
                }`}
              >
                A4
              </button>
              <button
                type="button"
                onClick={() => setPageSize("a5")}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold ${
                  pageSize === "a5" ? "bg-brand-600 text-white" : "bg-neutral-50 text-neutral-600 ring-1 ring-neutral-200"
                }`}
              >
                A5
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-500">{t("خلفية الفاتورة / الترويسة (اختياري)", "Invoice background / letterhead (optional)")}</label>
            {letterhead && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={letterhead} alt="letterhead" className="h-24 w-full rounded-lg border border-neutral-200 object-cover" />
            )}
            <input
              ref={letterheadInputRef}
              type="file"
              accept="image/*"
              onChange={handleLetterheadUpload}
              className="hidden"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => letterheadInputRef.current?.click()}
                className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 py-2 text-xs font-bold text-neutral-600"
              >
                {letterhead ? t("تغيير الصورة", "Change image") : t("رفع صورة", "Upload image")}
              </button>
              {letterhead && (
                <button
                  type="button"
                  onClick={() => setLetterhead("")}
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-red-500"
                >
                  {t("إزالة", "Remove")}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-500">{t("الختم (اختياري)", "Stamp (optional)")}</label>
            {stamp && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={stamp} alt="stamp" className="h-24 w-24 self-center rounded-lg border border-neutral-200 object-contain" />
            )}
            <input
              ref={stampInputRef}
              type="file"
              accept="image/*"
              onChange={handleStampUpload}
              className="hidden"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => stampInputRef.current?.click()}
                className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 py-2 text-xs font-bold text-neutral-600"
              >
                {stamp ? t("تغيير الصورة", "Change image") : t("رفع صورة", "Upload image")}
              </button>
              {stamp && (
                <button
                  type="button"
                  onClick={() => setStamp("")}
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-red-500"
                >
                  {t("إزالة", "Remove")}
                </button>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={submit}
          disabled={busy}
          className="h-14 rounded-2xl bg-brand-600 text-lg font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? t("جارِ الحفظ...", "Saving...") : t("حفظ", "Save")}
        </button>

        {saved && (
          <div className="rounded-xl bg-accent-50 p-3 text-center text-sm font-semibold text-accent-600">
            {t("تم الحفظ ✅", "Saved ✅")}
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-center text-xs font-semibold text-red-600">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}

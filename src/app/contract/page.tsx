"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { useData } from "@/components/DataProvider";
import { useLanguage } from "@/components/LanguageProvider";

// نص الإقرار الذاتي (ISCC EU — نقطة منشأ زيت الطهي المستعمل). مبنيّ على النموذج
// الرسمي؛ يمكن تعديله لاحقًا عند وصول النص النهائي من الإدارة.
const DECLARATION_CLAUSES = [
  "أُقرّ وأؤكّد أنني الشخص المسؤول والمفوّض عن نقطة المنشأ (المنشأة) الموقّعة أدناه.",
  "زيت الطهي المستعمل (UCO) المسلَّم مُنتَج من زيوت ودهون من أصل نباتي أو حيواني استُخدمت في طهي الطعام للاستهلاك البشري فقط.",
  "الكميات المسلَّمة بالكامل هي زيت طهي مستعمل، وغير مخلوطة بأي زيت أو دهون أخرى لا تتوافق مع تعريف UCO.",
  "زيت الطهي المستعمل يستوفي تعريف النفايات: تتخلّص منه المنشأة أو تنوي التخلّص منه، ولم يُعدَّل أو يُلوَّث عمدًا للوفاء بهذا التعريف.",
  "يتوفّر توثيق لكميات زيت الطهي المستعمل المسلَّمة، ويُحتفظ به مع المستندات التجارية.",
  "يُنتَج زيت الطهي المستعمل حصريًا بواسطة نقطة المنشأ الموقّعة.",
  "يجوز للمراجعين من هيئات الاعتماد أو نظام ISCC التحقّق في الموقع أو عبر الاتصال، بإشعار مسبق أو دونه، من صحّة هذه البيانات.",
  "المعلومات الواردة في هذا الإقرار صحيحة ومحدّثة وكاملة وموثّقة وتمثّل الحقائق الفعلية بشكل منصف.",
  "أوافق على انتقال هذه البيانات ضمن سلسلة العهدة إلى الجهة المجمِّعة وهيئات الاعتماد ونظام ISCC وقواعد بيانات الاتحاد (UDB) لأغراض التتبّع والاستدامة.",
  "يستمر هذا الالتزام ويبقى المستند متاحًا لمدة خمس (5) سنوات بعد انتهاء صلاحية هذا الإقرار.",
];

function ContractContent() {
  const { t, lang } = useLanguage();
  const searchParams = useSearchParams();
  const generatorId = searchParams.get("g") ?? "";
  const { ready, generators, collectors, updateGeneratorDeclaration, approveGeneratorContract } = useData();
  const generator = generators.find((g) => g.id === generatorId);
  const collector = generator ? collectors.find((c) => c.id === generator.collectorId) : undefined;
  const dateLocale = lang === "ar" ? "ar-OM" : "en-GB";

  const [syncedId, setSyncedId] = useState(generator?.id);
  const [name, setName] = useState(generator?.name ?? "");
  const [whatsapp, setWhatsapp] = useState(generator?.whatsapp ?? "");
  const [address, setAddress] = useState(generator?.address ?? "");
  const [postCode, setPostCode] = useState(generator?.postCode ?? "");
  const [country, setCountry] = useState(generator?.country ?? "عُمان");
  const [maxCapacity, setMaxCapacity] = useState(generator?.maxCapacityYear != null ? String(generator.maxCapacityYear) : "");
  const [renewableCapacity, setRenewableCapacity] = useState(
    generator?.renewableCapacityYear != null ? String(generator.renewableCapacityYear) : ""
  );
  const [over5t, setOver5t] = useState(!!generator?.monthlyOver5t);
  const [animalOrigin, setAnimalOrigin] = useState(!!generator?.animalOrigin);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (generator && generator.id !== syncedId) {
    setSyncedId(generator.id);
    setName(generator.name);
    setWhatsapp(generator.whatsapp);
    setAddress(generator.address ?? "");
    setPostCode(generator.postCode ?? "");
    setCountry(generator.country ?? "عُمان");
    setMaxCapacity(generator.maxCapacityYear != null ? String(generator.maxCapacityYear) : "");
    setRenewableCapacity(generator.renewableCapacityYear != null ? String(generator.renewableCapacityYear) : "");
    setOver5t(!!generator.monthlyOver5t);
    setAnimalOrigin(!!generator.animalOrigin);
  }

  if (!ready) {
    return <p className="flex-1 py-10 text-center text-sm text-neutral-400">{t("جارِ التحميل…", "Loading…")}</p>;
  }
  if (!generator) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-5 py-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl">⚠️</div>
        <h1 className="text-lg font-extrabold text-neutral-900">{t("العقد غير موجود", "Contract not found")}</h1>
        <p className="text-sm text-neutral-500">{t("هذا الرابط غير صالح", "This link is invalid")}</p>
      </main>
    );
  }

  const approved = generator.contractStatus === "approved";

  async function saveData() {
    setBusy(true);
    setError(null);
    try {
      await updateGeneratorDeclaration(generator!.id, {
        name: name.trim(),
        whatsapp: whatsapp.trim(),
        address: address.trim() || undefined,
        postCode: postCode.trim() || undefined,
        country: country.trim() || undefined,
        maxCapacityYear: maxCapacity ? Number(maxCapacity) : undefined,
        renewableCapacityYear: renewableCapacity ? Number(renewableCapacity) : undefined,
        monthlyOver5t: over5t,
        animalOrigin: animalOrigin,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(declErr(err, t));
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      await saveDataSilent();
      await approveGeneratorContract(generator!.id);
    } catch (err) {
      setError(declErr(err, t));
    } finally {
      setBusy(false);
    }
  }

  async function saveDataSilent() {
    await updateGeneratorDeclaration(generator!.id, {
      name: name.trim(),
      whatsapp: whatsapp.trim(),
      address: address.trim() || undefined,
      postCode: postCode.trim() || undefined,
      country: country.trim() || undefined,
      maxCapacityYear: maxCapacity ? Number(maxCapacity) : undefined,
      renewableCapacityYear: renewableCapacity ? Number(renewableCapacity) : undefined,
      monthlyOver5t: over5t,
      animalOrigin: animalOrigin,
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-5 py-6">
      <div>
        <p className="text-xs font-medium text-neutral-400">
          {t("الإقرار الذاتي — نقطة منشأ زيت الطهي المستعمل", "Self-declaration — UCO point of origin")}
        </p>
        <h1 className="text-lg font-extrabold text-neutral-900">{t("العقد الإلكتروني", "Electronic contract")}</h1>
        {collector && (
          <p className="mt-1 text-xs text-neutral-500">
            {t("مع جهة التجميع:", "With collector:")} {collector.companyName || collector.name}
          </p>
        )}
      </div>

      {approved ? (
        <div className="rounded-2xl border border-accent-200 bg-accent-50 p-4 text-center">
          <p className="text-lg font-extrabold text-accent-700">✅ {t("تمت الموافقة على العقد", "Contract approved")}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {t("بتاريخ", "On")}{" "}
            {generator.contractApprovedAt ? new Date(generator.contractApprovedAt).toLocaleDateString(dateLocale) : ""}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {t("صالح حتى", "Valid until")}{" "}
            {generator.contractValidUntil ? new Date(generator.contractValidUntil).toLocaleDateString(dateLocale) : ""}
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-amber-50 p-3 text-center text-xs font-semibold text-amber-700">
          {t("راجع بياناتك واقرأ الإقرار ثم اضغط موافقة", "Review your data, read the declaration, then approve")}
        </div>
      )}

      {/* بيانات المنشأة (قابلة للتعديل من المولّد) */}
      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
        <p className="text-xs font-bold text-neutral-700">{t("بيانات المنشأة", "Facility data")}</p>
        <Field label={t("اسم الموقع", "Site name")} value={name} onChange={setName} disabled={approved} />
        <Field label={t("رقم الهاتف", "Phone")} value={whatsapp} onChange={setWhatsapp} disabled={approved} ltr />
        <Field label={t("العنوان", "Address")} value={address} onChange={setAddress} disabled={approved} />
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("الرمز البريدي", "Post code")} value={postCode} onChange={setPostCode} disabled={approved} ltr />
          <Field label={t("البلد", "Country")} value={country} onChange={setCountry} disabled={approved} />
        </div>
        <div className="rounded-lg bg-neutral-50 px-3 py-2 text-[11px] text-neutral-500">
          {t("المنطقة:", "Area:")} {generator.wilayat} — {generator.governorate} ·{" "}
          <span dir="ltr">{generator.lat?.toFixed?.(5)}, {generator.lng?.toFixed?.(5)}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("الطاقة القصوى/سنة (طن)", "Max cap/yr (t)")} value={maxCapacity} onChange={(v) => setMaxCapacity(v.replace(/[^\d.]/g, ""))} disabled={approved} ltr />
          <Field label={t("المستدامة/سنة (طن)", "Sustainable/yr (t)")} value={renewableCapacity} onChange={(v) => setRenewableCapacity(v.replace(/[^\d.]/g, ""))} disabled={approved} ltr />
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-neutral-600">
          <input type="checkbox" checked={over5t} onChange={(e) => setOver5t(e.target.checked)} disabled={approved} className="h-4 w-4" />
          {t("كمية الزيت المستعمل 5 أطنان أو أكثر شهريًا", "UCO 5 tons or more per month")}
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-neutral-600">
          <input type="checkbox" checked={animalOrigin} onChange={(e) => setAnimalOrigin(e.target.checked)} disabled={approved} className="h-4 w-4" />
          {t("الزيت المستعمل ذو أصل حيواني (كليًا أو جزئيًا)", "UCO of animal origin (fully/partly)")}
        </label>

        {!approved && (
          <button
            onClick={saveData}
            disabled={busy}
            className="rounded-xl border border-brand-200 bg-brand-50 py-2 text-xs font-bold text-brand-700 disabled:opacity-50"
          >
            {busy ? t("جارِ الحفظ...", "Saving...") : t("💾 حفظ التعديلات", "💾 Save changes")}
          </button>
        )}
        {saved && <p className="text-center text-[11px] font-semibold text-accent-600">{t("تم الحفظ ✅", "Saved ✅")}</p>}
      </div>

      {/* نص الإقرار */}
      <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4">
        <p className="text-xs font-bold text-neutral-700">{t("نص الإقرار الذاتي", "Self-declaration text")}</p>
        <div className="max-h-64 overflow-y-auto rounded-lg bg-neutral-50 p-3 text-[12px] leading-relaxed text-neutral-600">
          <p className="mb-2">
            {t(
              "بصفتي الممثل المفوّض عن نقطة المنشأ، أُقرّ وأوافق على ما يلي:",
              "As the authorized representative of the point of origin, I declare and agree to the following:"
            )}
          </p>
          <ol className="list-decimal space-y-1.5 pe-4">
            {DECLARATION_CLAUSES.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ol>
        </div>
      </div>

      {!approved && (
        <button
          onClick={approve}
          disabled={busy}
          className="h-14 rounded-2xl bg-accent-600 text-lg font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? t("جارِ التوقيع...", "Signing...") : t("✅ أوافق وأوقّع على الإقرار", "✅ I agree & sign the declaration")}
        </button>
      )}
      {error && <p className="rounded-xl bg-red-50 p-3 text-center text-xs font-semibold text-red-600">{error}</p>}
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  ltr,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  ltr?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-neutral-500">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        dir={ltr ? "ltr" : undefined}
        className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none disabled:opacity-70"
      />
    </div>
  );
}

function declErr(err: unknown, t: (a: string, e: string) => string) {
  const msg = (err as Error).message;
  const missing = /contract_status|address|schema cache|does not exist|PGRST205|column/i.test(msg);
  return missing
    ? t(
        "قاعدة البيانات لسا ما تحدّثت لدعم العقود — لازم تشغّل كود SQL مرة واحدة (راجع الرسالة المرسلة).",
        "Database isn't updated for contracts yet — run the one-time SQL."
      )
    : t(`تعذّر الحفظ: ${msg}`, `Failed: ${msg}`);
}

export default function ContractPage() {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <Suspense fallback={<p className="flex-1 py-10 text-center text-sm text-neutral-400">{t("جارِ التحميل…", "Loading…")}</p>}>
        <ContractContent />
      </Suspense>
    </div>
  );
}

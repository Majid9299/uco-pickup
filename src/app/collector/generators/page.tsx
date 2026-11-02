"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { Header } from "@/components/Header";
import { PhoneInput } from "@/components/PhoneInput";
import { useData } from "@/components/DataProvider";
import { useCollectorSession } from "@/components/useCollectorSession";
import { useLanguage } from "@/components/LanguageProvider";
import { GOVERNORATES } from "@/lib/mock-data";
import { Generator, GeneratorGroup } from "@/lib/types";

function scanUrl(generatorId: string) {
  if (typeof window === "undefined") return "";
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${window.location.origin}${basePath}/scan/?g=${generatorId}`;
}

function GeneratorBarcode({ generator }: { generator: Generator }) {
  const { t } = useLanguage();
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  function download() {
    const qrCanvas = qrCanvasRef.current;
    if (!qrCanvas) return;

    const padding = 24;
    const textBlockHeight = 70;
    const canvas = document.createElement("canvas");
    canvas.width = qrCanvas.width + padding * 2;
    canvas.height = qrCanvas.height + textBlockHeight + padding * 2;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(qrCanvas, padding, padding);

    ctx.textAlign = "center";
    ctx.direction = "rtl";
    ctx.fillStyle = "#111111";
    ctx.font = "bold 22px Arial, sans-serif";
    ctx.fillText(generator.name, canvas.width / 2, qrCanvas.height + padding + 30);

    ctx.direction = "ltr";
    ctx.font = "16px monospace";
    ctx.fillStyle = "#666666";
    ctx.fillText(generator.id, canvas.width / 2, qrCanvas.height + padding + 55);

    const link = document.createElement("a");
    link.download = `barcode-${generator.id}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="mt-2 flex flex-col items-center gap-2 rounded-xl bg-neutral-50 p-3">
      <QRCodeSVG value={scanUrl(generator.id)} size={160} />
      <QRCodeCanvas value={scanUrl(generator.id)} size={300} ref={qrCanvasRef} className="hidden" />
      <button
        onClick={download}
        className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white active:scale-[0.98]"
      >
        {t("⬇️ تحميل الباركود", "⬇️ Download barcode")}
      </button>
    </div>
  );
}

function GeneratorEditForm({ generator, onClose }: { generator: Generator; onClose: () => void }) {
  const { t } = useLanguage();
  const { updateGenerator } = useData();
  const [name, setName] = useState(generator.name);
  const [whatsapp, setWhatsapp] = useState(generator.whatsapp);
  const [governorate, setGovernorate] = useState(generator.governorate);
  const [wilayat, setWilayat] = useState(generator.wilayat);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const wilayats = GOVERNORATES.find((g) => g.name === governorate)?.wilayats ?? [];
  // فرع ضمن مجموعة: رقم الواتساب اختياري (الإشعارات تروح لرقم المجموعة)
  const isBranch = !!generator.groupId;
  const isValid = name.trim() && (isBranch || whatsapp.trim()) && governorate && wilayat;

  async function submit() {
    if (!isValid) return;
    setBusy(true);
    await updateGenerator(generator.id, {
      name: name.trim(),
      whatsapp: whatsapp.trim(),
      governorate,
      wilayat,
    });
    setBusy(false);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  }

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-xl bg-neutral-50 p-3">
      <label className="text-[11px] font-semibold text-neutral-500">{t("اسم المنشأة", "Facility name")}</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-sm focus:border-brand-500 focus:outline-none"
      />
      <label className="text-[11px] font-semibold text-neutral-500">
        {isBranch ? t("رقم الواتساب (اختياري للفرع)", "WhatsApp (optional for branch)") : t("رقم الواتساب", "WhatsApp number")}
      </label>
      <PhoneInput value={whatsapp} onChange={setWhatsapp} size="sm" />
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-neutral-500">{t("المحافظة", "Governorate")}</label>
          <select
            value={governorate}
            onChange={(e) => {
              setGovernorate(e.target.value);
              setWilayat(GOVERNORATES.find((g) => g.name === e.target.value)?.wilayats[0] ?? "");
            }}
            className="rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm focus:border-brand-500 focus:outline-none"
          >
            {GOVERNORATES.map((g) => (
              <option key={g.name} value={g.name}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-neutral-500">{t("الولاية", "Wilayat")}</label>
          <select
            value={wilayat}
            onChange={(e) => setWilayat(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm focus:border-brand-500 focus:outline-none"
          >
            {wilayats.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-1 flex gap-2">
        <button
          onClick={submit}
          disabled={!isValid || busy}
          className="flex-1 rounded-xl bg-brand-600 py-2 text-xs font-bold text-white disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          {busy ? t("جارِ الحفظ...", "Saving...") : t("حفظ التعديلات", "Save changes")}
        </button>
        <button
          onClick={onClose}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-500"
        >
          {t("إلغاء", "Cancel")}
        </button>
      </div>
      {saved && <p className="text-center text-[11px] font-semibold text-accent-600">{t("تم الحفظ ✅", "Saved ✅")}</p>}
    </div>
  );
}

function GroupForm({
  collectorId,
  group,
  onClose,
}: {
  collectorId: string;
  group?: GeneratorGroup;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const { addGeneratorGroup, updateGeneratorGroup } = useData();
  const [name, setName] = useState(group?.name ?? "");
  const [whatsapp, setWhatsapp] = useState(group?.whatsapp ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = name.trim() && whatsapp.trim();

  async function submit() {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      if (group) {
        await updateGeneratorGroup(group.id, { name: name.trim(), whatsapp: whatsapp.trim() });
      } else {
        await addGeneratorGroup({ collectorId, name: name.trim(), whatsapp: whatsapp.trim() });
      }
      onClose();
    } catch (err) {
      const msg = (err as Error).message;
      // خطأ شائع: جدول المجموعات لسا ما اتنشأ بقاعدة البيانات (الهجرة ما اتشغّلت)
      const missing = /generator_groups|schema cache|does not exist|PGRST205/i.test(msg);
      setError(
        missing
          ? t(
              "قاعدة البيانات لسا ما تحدّثت لدعم المجموعات — لازم تشغّل كود SQL مرة واحدة (راجع الرسالة اللي أرسلتها لك).",
              "The database isn't updated for groups yet — you must run the one-time SQL (see the message I sent)."
            )
          : t(`تعذّر الحفظ: ${msg}`, `Save failed: ${msg}`)
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-brand-50/60 p-3">
      <label className="text-[11px] font-semibold text-neutral-500">{t("اسم المجموعة / الشركة", "Group / company name")}</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("مثال: مطاعم النخيل", "e.g. Al Nakheel Restaurants")}
        className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-sm focus:border-brand-500 focus:outline-none"
      />
      <label className="text-[11px] font-semibold text-neutral-500">{t("رقم واتساب المجموعة (تصل له كل إشعارات الفروع)", "Group WhatsApp (receives all branches' notifications)")}</label>
      <PhoneInput value={whatsapp} onChange={setWhatsapp} size="sm" />
      <div className="mt-1 flex gap-2">
        <button
          onClick={submit}
          disabled={!valid || busy}
          className="flex-1 rounded-xl bg-brand-600 py-2 text-xs font-bold text-white disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          {busy ? t("جارِ الحفظ...", "Saving...") : group ? t("حفظ", "Save") : t("إنشاء المجموعة", "Create group")}
        </button>
        <button
          onClick={onClose}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-500"
        >
          {t("إلغاء", "Cancel")}
        </button>
      </div>
      {error && (
        <p className="rounded-lg bg-red-50 p-2 text-center text-[11px] font-semibold text-red-600">{error}</p>
      )}
    </div>
  );
}

function CollectorGeneratorsContent({ collectorId }: { collectorId: string }) {
  const { t } = useLanguage();
  const { generators, generatorGroups, requests, toggleGeneratorActive, assignGeneratorToGroup, deleteGeneratorGroup, deleteGenerator } =
    useData();
  const [governorate, setGovernorate] = useState("");
  const [wilayat, setWilayat] = useState("");
  const [expanded, setExpanded] = useState<{ id: string; mode: "barcode" | "edit" } | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const myGroups = generatorGroups.filter((gr) => gr.collectorId === collectorId);
  const myGenerators = generators.filter((g) => g.collectorId === collectorId);

  const wilayats = governorate ? GOVERNORATES.find((g) => g.name === governorate)?.wilayats ?? [] : [];
  const passesFilter = (g: Generator) =>
    (!governorate || g.governorate === governorate) && (!wilayat || g.wilayat === wilayat);
  const filtered = myGenerators.filter(passesFilter);
  const individuals = filtered.filter((g) => !g.groupId);
  const branchesOf = (groupId: string) => filtered.filter((g) => g.groupId === groupId);

  function toggleExpanded(id: string, mode: "barcode" | "edit") {
    setExpanded((prev) => (prev?.id === id && prev.mode === mode ? null : { id, mode }));
  }

  function renderGenerator(g: Generator, extra?: React.ReactNode) {
    return (
      <div key={g.id} className="rounded-xl border border-neutral-100 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-neutral-800">{g.name}</p>
            <p className="text-[11px] text-neutral-400">
              {g.wilayat} — {g.governorate}
            </p>
            <span
              className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                g.contractStatus === "approved" ? "bg-accent-50 text-accent-600" : "bg-amber-50 text-amber-700"
              }`}
            >
              {g.contractStatus === "approved" ? t("📄 عقد موقّع", "📄 Contract signed") : t("📄 عقد غير موقّع", "📄 Contract unsigned")}
            </span>
          </div>
          <div className="flex flex-none flex-wrap items-center justify-end gap-2">
            <button
              onClick={() => toggleGeneratorActive(g.id)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
                g.active ? "bg-accent-50 text-accent-600" : "bg-red-50 text-red-600"
              }`}
            >
              {g.active ? t("مفعّل", "Active") : t("معطّل", "Disabled")}
            </button>
            <button
              onClick={() => toggleExpanded(g.id, "edit")}
              className="rounded-full bg-neutral-100 px-3 py-1.5 text-[11px] font-bold text-neutral-600"
            >
              {t("✏️ تعديل", "✏️ Edit")}
            </button>
            <button
              onClick={() => toggleExpanded(g.id, "barcode")}
              className="rounded-full bg-neutral-100 px-3 py-1.5 text-[11px] font-bold text-neutral-600"
            >
              {t("📷 الباركود", "📷 Barcode")}
            </button>
            <Link
              href={`/contract/?g=${g.id}`}
              className="rounded-full bg-neutral-100 px-3 py-1.5 text-[11px] font-bold text-neutral-600"
            >
              {t("📄 العقد", "📄 Contract")}
            </Link>
            <button
              onClick={() => {
                const count = requests.filter((r) => r.generatorId === g.id).length;
                if (
                  confirm(
                    t(
                      `حذف "${g.name}" نهائيًا؟ راح ينحذف معه ${count} عملية سحب مسجّلة له. لا يمكن التراجع.`,
                      `Permanently delete "${g.name}"? Its ${count} recorded pickups will be deleted too. This can't be undone.`
                    )
                  )
                ) {
                  deleteGenerator(g.id).catch((e) => alert((e as Error).message));
                }
              }}
              className="rounded-full bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-600"
            >
              {t("🗑️ حذف", "🗑️ Delete")}
            </button>
            {extra}
          </div>
        </div>
        {expanded?.id === g.id && expanded.mode === "barcode" && <GeneratorBarcode generator={g} />}
        {expanded?.id === g.id && expanded.mode === "edit" && (
          <GeneratorEditForm generator={g} onClose={() => setExpanded(null)} />
        )}
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-5 py-6">
      <div>
        <Link href="/collector" className="text-xs font-semibold text-neutral-400">
          {t("← لوحة المجمّع", "← Collector dashboard")}
        </Link>
        <h1 className="mt-2 text-lg font-extrabold text-neutral-900">{t("المولّدون المسجّلون", "Registered generators")}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {myGenerators.length} {t("منشأة", "facilities")} · {myGroups.length} {t("مجموعة", "groups")}
        </p>
      </div>

      {/* ===== المجموعات (مولّد له فروع) ===== */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-neutral-800">{t("🏢 المجموعات (مولّد له فروع)", "🏢 Groups (multi-branch)")}</p>
          {!creatingGroup && (
            <button
              onClick={() => setCreatingGroup(true)}
              className="rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-bold text-white active:scale-[0.98]"
            >
              {t("➕ مجموعة جديدة", "➕ New group")}
            </button>
          )}
        </div>

        {creatingGroup && (
          <div className="mb-3">
            <GroupForm collectorId={collectorId} onClose={() => setCreatingGroup(false)} />
          </div>
        )}

        {myGroups.length === 0 && !creatingGroup ? (
          <p className="py-4 text-center text-xs text-neutral-400">
            {t("لا توجد مجموعات بعد — أنشئ مجموعة ثم أضف لها فروعًا", "No groups yet — create one, then add branches")}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {myGroups.map((gr) => {
              const branches = branchesOf(gr.id);
              return (
                <div key={gr.id} className="rounded-2xl border border-brand-100 bg-brand-50/30 p-3">
                  {editingGroupId === gr.id ? (
                    <GroupForm collectorId={collectorId} group={gr} onClose={() => setEditingGroupId(null)} />
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-neutral-900">{gr.name}</p>
                        <p className="text-[11px] text-neutral-500" dir="ltr">{gr.whatsapp || "—"}</p>
                        <p className="text-[11px] text-neutral-400">
                          {branches.length} {t("فرع", "branches")}
                        </p>
                      </div>
                      <div className="flex flex-none flex-wrap items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingGroupId(gr.id)}
                          className="rounded-full bg-neutral-100 px-2.5 py-1.5 text-[11px] font-bold text-neutral-600"
                        >
                          {t("✏️", "✏️")}
                        </button>
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                t(
                                  `حذف المجموعة "${gr.name}"؟ الفروع ما تنحذف — تصير مولّدات مفردة.`,
                                  `Delete group "${gr.name}"? Branches are kept and become individual generators.`
                                )
                              )
                            ) {
                              deleteGeneratorGroup(gr.id).catch((e) => alert((e as Error).message));
                            }
                          }}
                          className="rounded-full bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-600"
                        >
                          {t("🗑️", "🗑️")}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link
                      href={`/register/?group=${gr.id}`}
                      className="rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-bold text-white active:scale-[0.98]"
                    >
                      {t("➕ إضافة فرع", "➕ Add branch")}
                    </Link>
                    <Link
                      href={`/collector/group-statement/?group=${gr.id}`}
                      className="rounded-full bg-neutral-900 px-3 py-1.5 text-[11px] font-bold text-white active:scale-[0.98]"
                    >
                      {t("📄 كشف الحساب", "📄 Statement")}
                    </Link>
                  </div>

                  {branches.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2">
                      {branches.map((b) =>
                        renderGenerator(
                          b,
                          <button
                            onClick={() => assignGeneratorToGroup(b.id, null).catch((e) => alert((e as Error).message))}
                            className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700"
                          >
                            {t("إخراج", "Remove")}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== مولّدون أفراد ===== */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <p className="mb-3 text-sm font-bold text-neutral-800">{t("👤 مولّدون أفراد", "👤 Individual generators")}</p>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <select
            value={governorate}
            onChange={(e) => {
              setGovernorate(e.target.value);
              setWilayat("");
            }}
            className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none"
          >
            <option value="">{t("كل المحافظات", "All governorates")}</option>
            {GOVERNORATES.map((g) => (
              <option key={g.name} value={g.name}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            value={wilayat}
            onChange={(e) => setWilayat(e.target.value)}
            disabled={!governorate}
            className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none disabled:opacity-40"
          >
            <option value="">{t("كل الولايات", "All wilayats")}</option>
            {wilayats.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        {individuals.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-400">{t("لا توجد منشآت مطابقة", "No matching facilities")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {individuals.map((g) =>
              renderGenerator(
                g,
                myGroups.length > 0 ? (
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        assignGeneratorToGroup(g.id, e.target.value).catch((err) => alert((err as Error).message));
                      }
                    }}
                    className="rounded-full border border-neutral-200 bg-white px-2 py-1.5 text-[11px] font-bold text-neutral-600 focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">{t("↦ نقل لمجموعة", "↦ Move to group")}</option>
                    {myGroups.map((gr) => (
                      <option key={gr.id} value={gr.id}>
                        {gr.name}
                      </option>
                    ))}
                  </select>
                ) : undefined
              )
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function CollectorGeneratorsPage() {
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
        <CollectorGeneratorsContent collectorId={collectorId} />
      )}
    </div>
  );
}

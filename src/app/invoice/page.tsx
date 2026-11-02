"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Header } from "@/components/Header";
import { useData } from "@/components/DataProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { invoiceNumberFor } from "@/lib/invoice";

function invoiceVerifyUrl(requestId: string, generatorCopy: boolean): string {
  if (typeof window === "undefined") return "";
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${window.location.origin}${basePath}/invoice/?r=${requestId}${generatorCopy ? "&copy=1" : ""}`;
}

function InvoiceContent() {
  const { t, lang } = useLanguage();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("r") ?? "";
  // نسخة المولّد (copy=1): نفس الاستمارة لكن بدون أسعار ولا مبالغ — كميات السحب
  // فقط، مع مكان لختم وتوقيع مدير الفرع. تُرسل للمولّد ليطبعها ويختمها.
  const generatorCopy = searchParams.get("copy") === "1";
  const { ready, requests, collectors, generators, drivers } = useData();

  const request = requests.find((r) => r.id === requestId);
  const collector = request ? collectors.find((c) => c.id === request.collectorId) : undefined;
  const generator = request ? generators.find((g) => g.id === request.generatorId) : undefined;
  const driver = request?.driverId ? drivers.find((d) => d.id === request.driverId) : undefined;
  const dateLocale = lang === "ar" ? "ar-OM" : "en-GB";

  if (!ready) {
    return <p className="flex-1 py-10 text-center text-sm text-neutral-400">{t("جارِ التحميل…", "Loading…")}</p>;
  }

  if (!request || request.status !== "completed") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-5 py-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl">⚠️</div>
        <h1 className="text-lg font-extrabold text-neutral-900">{t("الاستمارة غير موجودة", "Waste transfer note not found")}</h1>
        <p className="text-sm text-neutral-500">
          {t("هذا الرابط غير صالح أو العملية لسا ما اكتملت", "This link is invalid or the pickup isn't completed yet")}
        </p>
      </main>
    );
  }

  const invoiceNumber = collector
    ? invoiceNumberFor(collector, requests, request.id)
    : request.id.toUpperCase();
  const pageSize = collector?.invoicePageSize ?? "a4";
  const completedDate = request.completedAt ? new Date(request.completedAt).toLocaleDateString(dateLocale) : "";

  // أبعاد الصفحة بالمليمتر لتثبيت الاستمارة في صفحة واحدة عند الطباعة (ارتفاع
  // أقل بمليمتر من الصفحة الفعلية لتفادي فيضان سطر لصفحة ثانية)
  const printW = pageSize === "a5" ? "148mm" : "210mm";
  const printH = pageSize === "a5" ? "209mm" : "296mm";

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-5 py-6 print:gap-0 print:p-0">
      <style>{`@media print {
        @page { size: ${pageSize.toUpperCase()}; margin: 0; }
        html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
        main { max-width: none !important; margin: 0 !important; padding: 0 !important; gap: 0 !important; }
        #note-card { width: ${printW} !important; height: ${printH} !important; aspect-ratio: auto !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
      }`}</style>

      <button
        onClick={() => window.print()}
        className="rounded-2xl bg-neutral-900 py-3 text-center text-sm font-bold text-white active:scale-[0.98] print:hidden"
      >
        {t("🖨️ طباعة / حفظ PDF", "🖨️ Print / Save as PDF")}
      </button>

      {/* الصندوق بنسبة صفحة A4/A5 (1:1.414) والخلفية تُعرض كاملة (contain) بدون قص —
          عند الطباعة نثبّته على مقاس الصفحة بالضبط ليطلع كله بصفحة واحدة */}
      <div
        id="note-card"
        className="relative mx-auto flex aspect-[1/1.414] w-full flex-col justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-white bg-contain bg-center bg-no-repeat px-3 text-sm"
        style={
          collector?.invoiceLetterhead
            ? { backgroundImage: `url(${collector.invoiceLetterhead})`, backgroundSize: "100% 100%" }
            : undefined
        }
      >
        {/* صندوق التفاصيل (الستكر) بالمنتصف عموديًا بين الترويسة والتذييل */}
        <div className="relative mx-auto w-full origin-center scale-[0.85] rounded-xl bg-white/90 p-3">
          {/* لو ما فيه ترويسة مرفوعة، نعرض اسم الشركة كبديل بسيط */}
          {!collector?.invoiceLetterhead && (
            <div className="mb-2 border-b border-neutral-300 pb-2 text-center">
              <p className="text-base font-extrabold text-neutral-900">{collector?.companyName || collector?.name || "—"}</p>
              {collector?.crNumber && (
                <p className="text-[10px] text-neutral-500" dir="ltr">CR: {collector.crNumber}</p>
              )}
            </div>
          )}

          {/* عنوان الاستمارة + رقمها */}
          <div className="flex items-start justify-between border-b-2 border-neutral-800 pb-2">
            <div>
              <p className="text-[13px] font-extrabold leading-tight text-neutral-900">
                استمارة نقل نفايات
                <span className="block text-[10px] font-semibold text-neutral-500">Waste Transfer Note</span>
              </p>
              {generatorCopy && (
                <span className="mt-0.5 inline-block rounded bg-brand-50 px-1.5 py-0.5 text-[9px] font-bold text-brand-700">
                  نسخة المولّد — الكميات فقط · Generator copy (quantities only)
                </span>
              )}
            </div>
            <p className="text-xs font-extrabold text-red-600" dir="ltr">NO : {invoiceNumber}</p>
          </div>

          {/* بيانات العميل */}
          <table className="mt-3 w-full border-collapse text-[11px]">
            <tbody>
              <tr>
                <td rowSpan={2} className="w-16 border border-neutral-400 bg-neutral-50 px-1 text-center text-[10px] font-bold leading-tight">
                  بيانات العميل
                  <span className="block font-normal text-neutral-500">Customer data</span>
                </td>
                <td className="border border-neutral-400 px-2 py-2">
                  <span className="font-bold text-neutral-500">الاسم / Name: </span>
                  <span className="font-semibold text-neutral-800">{request.generatorName}</span>
                </td>
                <td className="border border-neutral-400 px-2 py-2">
                  <span className="font-bold text-neutral-500">الهاتف / Contact No: </span>
                  <span className="font-semibold text-neutral-800" dir="ltr">{generator?.whatsapp || ""}</span>
                </td>
              </tr>
              <tr>
                <td className="border border-neutral-400 px-2 py-2">
                  <span className="font-bold text-neutral-500">العنوان / Address: </span>
                  <span className="font-semibold text-neutral-800">{request.wilayat} — {request.governorate}</span>
                </td>
                <td className="border border-neutral-400 px-2 py-2">
                  <span className="font-bold text-neutral-500">التوقيع / Signature: </span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* بنود السحب — في نسخة المولّد نُخفي عمودَي السعر والإجمالي (كميات فقط) */}
          <table className="mt-3 w-full border-collapse text-center text-[11px]">
            <thead>
              <tr className="bg-neutral-100 font-bold text-neutral-700">
                <th className="border border-neutral-400 px-1 py-2 leading-tight">الوصف<span className="block font-normal text-neutral-400">Description</span></th>
                <th className="border border-neutral-400 px-1 py-2 leading-tight">الموقع<span className="block font-normal text-neutral-400">Location</span></th>
                <th className="border border-neutral-400 px-1 py-2 leading-tight">الكمية<span className="block font-normal text-neutral-400">Quantity</span></th>
                {!generatorCopy && (
                  <>
                    <th className="border border-neutral-400 px-1 py-2 leading-tight">سعر اللتر<span className="block font-normal text-neutral-400">Price/L</span></th>
                    <th className="border border-neutral-400 px-1 py-2 leading-tight">الإجمالي<span className="block font-normal text-neutral-400">Total</span></th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              <tr className="text-neutral-800">
                <td className="border border-neutral-400 px-1 py-4 leading-tight">زيت طهي مستخدم<span className="block text-[9px] text-neutral-400">Used cooking oil</span></td>
                <td className="border border-neutral-400 px-1 py-4">{request.wilayat}</td>
                <td className="border border-neutral-400 px-1 py-4 font-mono" dir="ltr">{request.liters}</td>
                {!generatorCopy && (
                  <>
                    <td className="border border-neutral-400 px-1 py-4 font-mono" dir="ltr">{request.pricePerLiterOMR}</td>
                    <td className="border border-neutral-400 px-1 py-4 font-mono" dir="ltr">{request.totalOMR}</td>
                  </>
                )}
              </tr>
              {generatorCopy ? (
                <tr className="font-extrabold text-neutral-900">
                  <td colSpan={2} className="border border-neutral-400 px-2 py-2 text-end">إجمالي الكمية / Total quantity</td>
                  <td className="border border-neutral-400 px-1 py-2 font-mono" dir="ltr">{request.liters} <span className="text-[9px]">L</span></td>
                </tr>
              ) : (
                <tr className="font-extrabold text-neutral-900">
                  <td colSpan={4} className="border border-neutral-400 px-2 py-2 text-end">TOTAL / الإجمالي</td>
                  <td className="border border-neutral-400 px-1 py-2 font-mono" dir="ltr">{request.totalOMR} <span className="text-[9px]">OMR</span></td>
                </tr>
              )}
            </tbody>
          </table>

          {/* بيانات مزود الخدمة */}
          <table className="mt-3 w-full border-collapse text-[11px]">
            <tbody>
              <tr>
                <td rowSpan={2} className="w-16 border border-neutral-400 bg-neutral-50 px-1 text-center text-[10px] font-bold leading-tight">
                  بيانات مزود الخدمة
                  <span className="block font-normal text-neutral-500">Service provider data</span>
                </td>
                <td colSpan={2} className="border border-neutral-400 px-2 py-2">
                  <span className="font-bold text-neutral-500">المندوب / Name: </span>
                  <span className="font-semibold text-neutral-800">{driver?.name ?? ""}</span>
                </td>
              </tr>
              <tr>
                <td className="border border-neutral-400 px-2 py-2">
                  <span className="font-bold text-neutral-500">التاريخ / Date: </span>
                  <span className="font-semibold text-neutral-800" dir="ltr">{completedDate}</span>
                </td>
                <td className="border border-neutral-400 px-2 py-2">
                  <span className="font-bold text-neutral-500">التوقيع / Signature: </span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* في نسخة المولّد: مكان فارغ لختم وتوقيع مدير الفرع (يُختم يدويًا بعد الطباعة) */}
          {generatorCopy && (
            <div className="mt-3 rounded-lg border border-dashed border-neutral-400 px-3 py-2">
              <p className="text-[10px] font-bold text-neutral-500">
                ختم وتوقيع مدير الفرع
                <span className="block font-normal text-neutral-400">Branch Manager — Stamp &amp; Signature</span>
              </p>
              <div className="h-16" />
            </div>
          )}

          {/* التحقق بالباركود + الختم */}
          <div className="mt-3 flex items-end justify-between">
            <div className="flex flex-col items-center gap-1">
              <QRCodeSVG value={invoiceVerifyUrl(request.id, generatorCopy)} size={56} />
              <p className="text-[9px] text-neutral-400">{t("تحقّق / Verify", "تحقّق / Verify")}</p>
            </div>
            {collector?.invoiceStamp && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={collector.invoiceStamp} alt="stamp" className="h-40 w-40 object-contain opacity-90" />
            )}
          </div>
          <p className="mt-2 text-center text-[10px] text-neutral-300" dir="ltr">{request.id}</p>
        </div>
      </div>
    </main>
  );
}

export default function InvoicePage() {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 print:block print:min-h-0 print:bg-white">
      <div className="print:hidden">
        <Header />
      </div>
      <Suspense fallback={<p className="flex-1 py-10 text-center text-sm text-neutral-400">{t("جارِ التحميل…", "Loading…")}</p>}>
        <InvoiceContent />
      </Suspense>
    </div>
  );
}

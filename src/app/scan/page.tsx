"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mark } from "@/components/Mark";
import { useData } from "@/components/DataProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { sendGeneratorNotification } from "@/lib/notify";
import { PickupRequest } from "@/lib/types";

// نستخدم Query Param (?g=) بدل مسار ديناميكي [generatorId] عمدًا: المولّدون
// يُسجَّلون في وقت التشغيل عبر /register، والتصدير الثابت (Static Export)
// ما يقدر يبني صفحات مسبقًا لمعرّفات غير معروفة وقت البناء — الـ query param
// يحلّها بالكامل على المتصفح بدون أي قيد.
function ScanContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const generatorId = searchParams.get("g") ?? "";
  const { ready, generators, createRequestForGenerator } = useData();
  const generator = generators.find((g) => g.id === generatorId);
  const [request, setRequest] = useState<PickupRequest | null>(null);
  const createdRef = useRef(false);

  useEffect(() => {
    if (createdRef.current || !generator || !generator.active) return;
    createdRef.current = true;
    createRequestForGenerator(generatorId).then(setRequest);
    // عند طلب سحب من مجمّع لسا عقده غير موقّع، نرسل للمولّد رسالة واتساب برابط
    // العقد الإلكتروني الجديد (كل مجمّع له سجل مولّد مستقل، فمجمّع جديد = عقد جديد)
    if (generator.contractStatus !== "approved" && generator.whatsapp && generator.collectorId) {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      const link = `${window.location.origin}${basePath}/contract/?g=${generator.id}`;
      const text = `📄 لتوثيق تعاملك، يرجى مراجعة وتوقيع العقد الإلكتروني (الإقرار الذاتي) لمنشأتك:\n${link}`;
      sendGeneratorNotification(generator.collectorId, generator.whatsapp, text).catch(() => {});
    }
  }, [generator, generatorId, createRequestForGenerator]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-5 py-10 text-center">
      {!ready ? (
        <p className="text-sm text-neutral-400">{t("جارِ التحميل…", "Loading…")}</p>
      ) : !generatorId || !generator ? (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl">
            ⚠️
          </div>
          <h1 className="text-lg font-extrabold text-neutral-900">{t("باركود غير معروف", "Unknown barcode")}</h1>
          <p className="text-sm text-neutral-500">
            {t("هذا الباركود غير مسجّل بالنظام — تواصل مع المندوب الميداني", "This barcode isn't registered in the system — contact the field representative")}
          </p>
        </>
      ) : !generator.active ? (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-3xl">
            🚫
          </div>
          <h1 className="text-lg font-extrabold text-neutral-900">{t("المنشأة غير مفعّلة حاليًا", "This facility is currently disabled")}</h1>
          <p className="text-sm text-neutral-500">{t("تواصل مع إنفير لإعادة تفعيل الحساب", "Contact Invare to reactivate the account")}</p>
        </>
      ) : request && !request.collectorId ? (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-3xl">
            ⏳
          </div>
          <h1 className="text-lg font-extrabold text-neutral-900">{t("تم تسجيل طلبك", "Your request was recorded")}</h1>
          <p className="text-sm text-neutral-500">
            {t(
              "ما فيه مجمّع مفعّل يغطي منطقتك حاليًا — طلبك محفوظ وبيوصل مجمّع أول ما يتوفّر",
              "No active collector currently covers your area — your request is saved and will reach a collector as soon as one is available"
            )}
          </p>
        </>
      ) : (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-50 text-3xl">
            ✅
          </div>
          <h1 className="text-lg font-extrabold text-neutral-900">{t("تم إرسال طلب السحب", "Pickup request sent")}</h1>
          <p className="text-sm text-neutral-500">
            {generator.name} — {t("بانتظار وصول المجمّع لتحصيل الزيت المستخدم", "waiting for the collector to arrive and collect the used oil")}
          </p>
          {request && (
            <div className="w-full rounded-2xl border border-neutral-200 bg-white p-4 text-end text-sm">
              <div className="flex justify-between py-1">
                <span className="text-neutral-400">{t("رقم الطلب", "Request ID")}</span>
                <span className="font-mono font-semibold" dir="ltr">
                  {request.id}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-neutral-400">{t("المنطقة", "Area")}</span>
                <span className="font-semibold">
                  {generator.wilayat} — {generator.governorate}
                </span>
              </div>
            </div>
          )}
          {generator.contractStatus !== "approved" && (
            <Link
              href={`/contract/?g=${generator.id}`}
              className="w-full rounded-2xl bg-amber-500 py-3 text-center text-sm font-bold text-white active:scale-[0.98]"
            >
              📄 {t("وقّع العقد الإلكتروني (الإقرار الذاتي)", "Sign the electronic contract")}
            </Link>
          )}
          <p className="text-xs text-neutral-400">
            {t("يمكنك إغلاق هذه الصفحة الآن — سيصلك إشعار واتساب عند تأكيد السحب", "You can close this page now — you'll get a WhatsApp notification once the pickup is confirmed")}
          </p>
        </>
      )}
      {ready && (
        <button
          onClick={() => window.close()}
          className="mt-4 h-12 w-full rounded-2xl bg-neutral-900 text-sm font-bold text-white active:scale-[0.98]"
        >
          {t("✅ فهمت", "✅ Got it")}
        </button>
      )}
    </main>
  );
}

export default function ScanPage() {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <div className="border-b border-neutral-200 bg-white/90 px-5 py-3">
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          <Mark size={30} />
          <span className="text-sm font-extrabold text-neutral-900">
            {t("نظام سحب الزيت المستخدم", "Used Oil Pickup System")}
          </span>
        </div>
      </div>
      <Suspense fallback={<p className="flex-1 py-10 text-center text-sm text-neutral-400">{t("جارِ التحميل…", "Loading…")}</p>}>
        <ScanContent />
      </Suspense>
    </div>
  );
}

"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { useData } from "@/components/DataProvider";
import { PickupRequest } from "@/lib/types";

// نستخدم Query Param (?g=) بدل مسار ديناميكي [generatorId] عمدًا: المولّدون
// يُسجَّلون في وقت التشغيل عبر /register، والتصدير الثابت (Static Export)
// ما يقدر يبني صفحات مسبقًا لمعرّفات غير معروفة وقت البناء — الـ query param
// يحلّها بالكامل على المتصفح بدون أي قيد.
function ScanContent() {
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
  }, [generator, generatorId, createRequestForGenerator]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-5 py-10 text-center">
      {!ready ? (
        <p className="text-sm text-neutral-400">جارِ التحميل…</p>
      ) : !generatorId || !generator ? (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl">
            ⚠️
          </div>
          <h1 className="text-lg font-extrabold text-neutral-900">باركود غير معروف</h1>
          <p className="text-sm text-neutral-500">
            هذا الباركود غير مسجّل بالنظام — تواصل مع المندوب الميداني
          </p>
        </>
      ) : !generator.active ? (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-3xl">
            🚫
          </div>
          <h1 className="text-lg font-extrabold text-neutral-900">المنشأة غير مفعّلة حاليًا</h1>
          <p className="text-sm text-neutral-500">تواصل مع إنفير لإعادة تفعيل الحساب</p>
        </>
      ) : (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-50 text-3xl">
            ✅
          </div>
          <h1 className="text-lg font-extrabold text-neutral-900">تم إرسال طلب السحب</h1>
          <p className="text-sm text-neutral-500">
            {generator.name} — بانتظار وصول المجمّع لتحصيل الزيت المستخدم
          </p>
          {request && (
            <div className="w-full rounded-2xl border border-neutral-200 bg-white p-4 text-right text-sm">
              <div className="flex justify-between py-1">
                <span className="text-neutral-400">رقم الطلب</span>
                <span className="font-mono font-semibold" dir="ltr">
                  {request.id}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-neutral-400">المنطقة</span>
                <span className="font-semibold">
                  {generator.wilayat} — {generator.governorate}
                </span>
              </div>
            </div>
          )}
          <p className="text-xs text-neutral-400">
            يمكنك إغلاق هذه الصفحة الآن — سيصلك إشعار واتساب عند تأكيد السحب
          </p>
        </>
      )}
      <Link href="/" className="text-xs font-semibold text-neutral-400">
        ← الرئيسية
      </Link>
    </main>
  );
}

export default function ScanPage() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <Suspense fallback={<p className="flex-1 py-10 text-center text-sm text-neutral-400">جارِ التحميل…</p>}>
        <ScanContent />
      </Suspense>
    </div>
  );
}

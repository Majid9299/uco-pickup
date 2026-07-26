"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Header } from "@/components/Header";
import { useData } from "@/components/DataProvider";
import { GOVERNORATES } from "@/lib/mock-data";
import { Generator } from "@/lib/types";

function scanUrl(generatorId: string) {
  if (typeof window === "undefined") return "";
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${window.location.origin}${basePath}/scan/${generatorId}/`;
}

export default function RegisterPage() {
  const { addGenerator } = useData();
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [governorate, setGovernorate] = useState(GOVERNORATES[0].name);
  const [wilayat, setWilayat] = useState(GOVERNORATES[0].wilayats[0]);
  const [lat, setLat] = useState("23.6");
  const [lng, setLng] = useState("58.4");
  const [created, setCreated] = useState<Generator | null>(null);

  const wilayats = GOVERNORATES.find((g) => g.name === governorate)?.wilayats ?? [];
  const isValid = name.trim() && whatsapp.trim() && lat && lng;

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setLat(pos.coords.latitude.toFixed(5));
      setLng(pos.coords.longitude.toFixed(5));
    });
  }

  function submit() {
    const generator = addGenerator({
      name: name.trim(),
      whatsapp: whatsapp.trim(),
      governorate,
      wilayat,
      lat: Number(lat),
      lng: Number(lng),
    });
    setCreated(generator);
  }

  function reset() {
    setCreated(null);
    setName("");
    setWhatsapp("");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
        {!created ? (
          <>
            <div>
              <p className="text-xs font-medium text-neutral-400">زيارة ميدانية</p>
              <h1 className="text-lg font-extrabold text-neutral-900">تسجيل مولّد جديد</h1>
              <p className="mt-1 text-sm text-neutral-500">
                سجّل بيانات المطعم أو الفندق — سيصدر النظام باركود خاص به لطباعته ولصقه في
                الموقع
              </p>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-500">اسم المنشأة</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: مطعم الواحة الذهبية"
                  className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-500">رقم الواتساب</label>
                <input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+968 9xxx xxxx"
                  dir="ltr"
                  className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-500">المحافظة</label>
                  <select
                    value={governorate}
                    onChange={(e) => {
                      setGovernorate(e.target.value);
                      setWilayat(
                        GOVERNORATES.find((g) => g.name === e.target.value)?.wilayats[0] ?? ""
                      );
                    }}
                    className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                  >
                    {GOVERNORATES.map((g) => (
                      <option key={g.name} value={g.name}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-500">الولاية</label>
                  <select
                    value={wilayat}
                    onChange={(e) => setWilayat(e.target.value)}
                    className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                  >
                    {wilayats.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-500">
                    الموقع الجغرافي
                  </label>
                  <button
                    onClick={useMyLocation}
                    type="button"
                    className="text-[11px] font-bold text-brand-700"
                  >
                    📍 استخدام موقعي الحالي
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="خط العرض"
                    dir="ltr"
                    className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                  />
                  <input
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="خط الطول"
                    dir="ltr"
                    className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-neutral-400">
                  الأدق: طلب مشاركة الموقع من واتساب مباشرة من صاحب المنشأة
                </p>
              </div>
            </div>

            <button
              onClick={submit}
              disabled={!isValid}
              className="h-14 rounded-2xl bg-brand-600 text-lg font-bold text-white transition active:scale-[0.98] disabled:bg-neutral-200 disabled:text-neutral-400"
            >
              حفظ وإصدار الباركود
            </button>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center gap-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-50 text-3xl">
              ✅
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-neutral-900">تم تسجيل المولّد</h2>
              <p className="text-sm text-neutral-500">
                اطبع هذا الباركود وألصقه في موقع {created.name}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <QRCodeSVG value={scanUrl(created.id)} size={200} />
            </div>

            <div className="w-full rounded-2xl border border-neutral-200 bg-white p-4 text-right text-sm">
              <div className="flex justify-between py-1">
                <span className="text-neutral-400">المنشأة</span>
                <span className="font-semibold">{created.name}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-neutral-400">المنطقة</span>
                <span className="font-semibold">
                  {created.wilayat} — {created.governorate}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-neutral-400">رقم المولّد</span>
                <span className="font-mono font-semibold" dir="ltr">
                  {created.id}
                </span>
              </div>
            </div>

            <p className="text-xs text-neutral-400">
              أي مسح لهذا الباركود سيُنشئ تلقائيًا طلب سحب جديد يصل للمجمّع المسؤول عن المنطقة
              — بدون تطبيق أو تسجيل دخول
            </p>

            <button
              onClick={reset}
              className="mt-auto h-14 w-full rounded-2xl bg-neutral-900 text-lg font-bold text-white active:scale-[0.98]"
            >
              تسجيل مولّد آخر
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

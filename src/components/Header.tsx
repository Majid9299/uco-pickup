"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mark } from "./Mark";
import { useData } from "./DataProvider";
import { useLanguage } from "./LanguageProvider";
import { ImpersonationBanner } from "./ImpersonationBanner";

export function Header() {
  const pathname = usePathname();
  const { configured, loadError } = useData();
  const { lang, setLang, t } = useLanguage();

  const NAV = [
    { href: "/", label: t("الرئيسية", "Home") },
    { href: "/admin", label: t("لوحة الإدارة", "Admin") },
  ];

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
      {!configured && (
        <div className="bg-red-600 px-5 py-1.5 text-center text-[11px] font-bold text-white">
          {t(
            "⚠️ القاعدة غير مربوطة بعد (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY) — البيانات لن تُحفَظ",
            "⚠️ Database not connected yet (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY) — data won't be saved"
          )}
        </div>
      )}
      {configured && loadError && (
        <div className="bg-red-600 px-5 py-1.5 text-center text-[11px] font-bold text-white">
          {t(
            `⚠️ فشل تحميل البيانات من القاعدة — الأرقام الظاهرة أصفار لأن القراءة فشلت، مش لأن البيانات فاضية (${loadError})`,
            `⚠️ Failed to load data — the zeros shown mean the read failed, not that the data is empty (${loadError})`
          )}
        </div>
      )}
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-5 py-3">
        <Link href="/" className="flex min-w-0 shrink items-center gap-2">
          <Mark size={30} />
          <span className="truncate text-sm font-extrabold text-neutral-900">
            {t("نظام سحب الزيت المستخدم", "Used Oil Pickup System")}
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <nav className="flex items-center gap-1 overflow-x-auto">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-brand-600 text-white"
                      : "text-neutral-500 hover:bg-neutral-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="shrink-0 whitespace-nowrap rounded-full border border-neutral-200 px-2.5 py-1.5 text-xs font-bold text-neutral-500 hover:bg-neutral-100"
          >
            {lang === "ar" ? "EN" : "AR"}
          </button>
        </div>
      </div>
      <ImpersonationBanner />
    </header>
  );
}

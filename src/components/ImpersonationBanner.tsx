"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

const FLAG_KEY = "uco-admin-impersonate";
const SESSION_KEY = "uco-collector-id";

// شريط يظهر عندما يدخل الأدمن حساب مجمّع "كأنه صاحبه" للتجارب — يوضّح إنك بوضع
// إداري ويعطيك زر خروج يرجّعك للوحة الإدارة ويمسح الجلسة المؤقتة.
export function beginImpersonation(name: string, collectorId: string) {
  window.localStorage.setItem(FLAG_KEY, name);
  window.localStorage.setItem(SESSION_KEY, collectorId);
  window.dispatchEvent(new StorageEvent("storage"));
}

export function ImpersonationBanner() {
  const { t } = useLanguage();
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const read = () => setName(window.localStorage.getItem(FLAG_KEY));
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);

  if (!name) return null;

  function exit() {
    window.localStorage.removeItem(FLAG_KEY);
    window.localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new StorageEvent("storage"));
    router.push("/admin");
  }

  return (
    <div className="flex items-center justify-between gap-2 bg-amber-500 px-4 py-2 text-[11px] font-bold text-white print:hidden">
      <span className="truncate">
        🔑 {t("دخول إداري — تتصفّح كـ", "Admin access — browsing as")} {name}
      </span>
      <button onClick={exit} className="shrink-0 rounded-full bg-white/25 px-3 py-1 font-bold">
        {t("خروج ← الإدارة", "Exit ← Admin")}
      </button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mark } from "./Mark";

const NAV = [
  { href: "/", label: "الرئيسية" },
  { href: "/register", label: "تسجيل مولّد" },
  { href: "/collector", label: "لوحة المجمّع" },
  { href: "/admin", label: "لوحة الإدارة" },
];

export function Header() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Mark size={30} />
          <span className="text-sm font-extrabold text-neutral-900">
            نظام سحب الزيت المستخدم
          </span>
        </Link>
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
      </div>
    </header>
  );
}

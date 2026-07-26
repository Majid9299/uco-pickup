import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { DataProvider } from "@/components/DataProvider";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "نظام سحب زيت الطهي المستخدم",
  description:
    "نظام لإدارة طلبات سحب زيت الطهي المستخدم من المولّدين بواسطة المجمّعين، مع تتبّع كامل للطلب والكمية والعمولة.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900 antialiased">
        <DataProvider>{children}</DataProvider>
      </body>
    </html>
  );
}

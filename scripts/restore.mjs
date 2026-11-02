#!/usr/bin/env node
// يرجّع نسخة احتياطية إلى مشروع Supabase (نفسه أو مشروع جديد).
// التشغيل:  node scripts/restore.mjs backups/uco-backup-<التاريخ>.json
// ملاحظة  : لازم يكون schema.sql متنفّذ بالمشروع الهدف قبل التشغيل.
import { readFileSync } from "node:fs";

// ترتيب مهم — الجداول اللي غيرها يعتمد عليها تنزل أول (مفاتيح أجنبية)
const ORDER = [
  "collectors",
  "factories",
  "generator_groups",
  "generators",
  "drivers",
  "pickup_requests",
  "sales",
];

const file = process.argv[2];
if (!file) {
  console.error("الاستخدام: node scripts/restore.mjs <ملف-النسخة.json>");
  process.exit(1);
}

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const pick = (k) => env.match(new RegExp(`^${k}=(.+)$`, "m"))?.[1]?.trim();
const URL_ = pick("NEXT_PUBLIC_SUPABASE_URL");
const KEY = pick("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const backup = JSON.parse(readFileSync(file, "utf8"));
console.log(`النسخة مأخوذة: ${backup.takenAt}`);
console.log(`من المشروع  : ${backup.project}`);
console.log(`إلى المشروع : ${URL_}\n`);

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
  // upsert حتى إعادة التشغيل ما تصير أخطاء تكرار
  Prefer: "resolution=merge-duplicates,return=minimal",
};

let failed = 0;
for (const t of ORDER) {
  const rows = backup.tables?.[t];
  if (!rows?.length) {
    console.log(`- ${t.padEnd(18)} فاضي، تخطّي`);
    continue;
  }
  try {
    // دفعات 500 حتى ما يتجاوز حد حجم الطلب
    for (let i = 0; i < rows.length; i += 500) {
      const res = await fetch(`${URL_}/rest/v1/${t}`, {
        method: "POST",
        headers,
        body: JSON.stringify(rows.slice(i, i + 500)),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
    }
    console.log(`✓ ${t.padEnd(18)} ${rows.length} صف`);
  } catch (e) {
    failed++;
    console.error(`✗ ${t.padEnd(18)} ${e.message}`);
  }
}

console.log(failed ? `\n⚠️ ${failed} جدول فشل` : "\n✓ رجعت كل البيانات");
process.exit(failed ? 1 : 0);

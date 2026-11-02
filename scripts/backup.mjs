#!/usr/bin/env node
// نسخة احتياطية كاملة من كل جداول Supabase إلى ملف JSON محلي.
// التشغيل:  node scripts/backup.mjs
// الناتج :  backups/uco-backup-<التاريخ>.json
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const TABLES = [
  "collectors",
  "generators",
  "generator_groups",
  "pickup_requests",
  "drivers",
  "factories",
  "sales",
];

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const pick = (k) => env.match(new RegExp(`^${k}=(.+)$`, "m"))?.[1]?.trim();
const URL_ = pick("NEXT_PUBLIC_SUPABASE_URL");
const KEY = pick("NEXT_PUBLIC_SUPABASE_ANON_KEY");

if (!URL_ || !KEY) {
  console.error("✗ مفاتيح Supabase ناقصة في .env.local");
  process.exit(1);
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const out = { takenAt: new Date().toISOString(), project: URL_, tables: {} };
let failed = 0;

for (const t of TABLES) {
  try {
    // صفحات بحجم 1000 — الحد الافتراضي لـ PostgREST، حتى ما تنقص صفوف بصمت
    const rows = [];
    for (let from = 0; ; from += 1000) {
      const res = await fetch(`${URL_}/rest/v1/${t}?select=*&order=created_at.asc`, {
        headers: { ...headers, Range: `${from}-${from + 999}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
      const page = await res.json();
      rows.push(...page);
      if (page.length < 1000) break;
    }
    out.tables[t] = rows;
    console.log(`✓ ${t.padEnd(18)} ${rows.length} صف`);
  } catch (e) {
    failed++;
    console.error(`✗ ${t.padEnd(18)} ${e.message}`);
  }
}

if (failed === TABLES.length) {
  console.error("\n✗ فشلت كل الجداول — القاعدة موقوفة أو غير متاحة. ما انحفظ ملف.");
  process.exit(1);
}

mkdirSync(new URL("../backups/", import.meta.url), { recursive: true });
const stamp = out.takenAt.slice(0, 19).replace(/[:T]/g, "-");
const file = new URL(`../backups/uco-backup-${stamp}.json`, import.meta.url);
writeFileSync(file, JSON.stringify(out, null, 2), "utf8");

const total = Object.values(out.tables).reduce((n, r) => n + r.length, 0);
console.log(`\n✓ انحفظت ${total} صف في backups/uco-backup-${stamp}.json`);
if (failed) console.error(`⚠️ ${failed} جدول فشل — النسخة ناقصة`);

-- نظام إدارة طلبات سحب زيت الطهي المستخدم — سكيمة Supabase
-- نفّذ هذا الملف كامل من: Supabase Dashboard → SQL Editor → New query → Run

create table if not exists generators (
  id text primary key,
  name text not null,
  whatsapp text not null,
  governorate text not null,
  wilayat text not null,
  lat double precision not null,
  lng double precision not null,
  registered_at date not null default current_date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists collectors (
  id text primary key,
  name text not null,
  whatsapp text not null default '',
  governorates text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists pickup_requests (
  id text primary key,
  generator_id text not null references generators(id),
  generator_name text not null,
  governorate text not null,
  wilayat text not null,
  lat double precision not null,
  lng double precision not null,
  collector_id text not null references collectors(id),
  status text not null default 'pending' check (status in ('pending', 'completed')),
  created_at timestamptz not null default now(),
  liters double precision,
  price_per_liter_omr double precision,
  total_omr double precision,
  completed_at timestamptz
);

-- تفعيل أمان مستوى الصف (RLS) — هذا النموذج بدون تسجيل دخول (Zero-friction UX)
-- لذلك السياسات تسمح بالقراءة والكتابة العامة عبر مفتاح anon فقط.
-- ملاحظة أمنية: أي حد يعرف رابط الموقع يقدر يقرأ/يعدّل البيانات — هذا مقبول
-- لنموذج تشغيلي أولي، لكن لو صار فيه استخدام فعلي حساس لازم تُضاف طبقة
-- تسجيل دخول (Supabase Auth) قبل توسّع الاستخدام.
alter table generators enable row level security;
alter table collectors enable row level security;
alter table pickup_requests enable row level security;

drop policy if exists "public read generators" on generators;
create policy "public read generators" on generators for select using (true);
drop policy if exists "public insert generators" on generators;
create policy "public insert generators" on generators for insert with check (true);
drop policy if exists "public update generators" on generators;
create policy "public update generators" on generators for update using (true);

drop policy if exists "public read collectors" on collectors;
create policy "public read collectors" on collectors for select using (true);
drop policy if exists "public insert collectors" on collectors;
create policy "public insert collectors" on collectors for insert with check (true);
drop policy if exists "public update collectors" on collectors;
create policy "public update collectors" on collectors for update using (true);

drop policy if exists "public read pickup_requests" on pickup_requests;
create policy "public read pickup_requests" on pickup_requests for select using (true);
drop policy if exists "public insert pickup_requests" on pickup_requests;
create policy "public insert pickup_requests" on pickup_requests for insert with check (true);
drop policy if exists "public update pickup_requests" on pickup_requests;
create policy "public update pickup_requests" on pickup_requests for update using (true);

-- تفعيل التحديث اللحظي (Realtime) حتى تظهر الطلبات الجديدة عند المجمّع فورًا
alter publication supabase_realtime add table pickup_requests;
alter publication supabase_realtime add table generators;
alter publication supabase_realtime add table collectors;

-- بيانات أولية: مجمّع واحد جاهز لتغطية مسقط — عدّل الاسم ورقم الواتساب
-- من لوحة الإدارة (/admin) بعد الربط، أو مباشرة هنا قبل التنفيذ
insert into collectors (id, name, whatsapp, governorates, active) values
  ('col-1', 'المجمّع الأول', '', array['مسقط'], true)
on conflict (id) do nothing;

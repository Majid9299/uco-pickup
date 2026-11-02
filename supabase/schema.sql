-- نظام إدارة طلبات سحب زيت الطهي المستخدم — سكيمة Supabase
-- نفّذ هذا الملف كامل من: Supabase Dashboard → SQL Editor → New query → Run

create table if not exists collectors (
  id text primary key,
  name text not null,
  whatsapp text not null default '',
  governorates text[] not null default '{}',
  active boolean not null default true,
  -- رقم سري احتياطي لتسجيل الدخول بدون واتساب (لو تعطّل الـ OTP) — نص عادي
  -- بدون تشفير، بنفس مستوى الأمان المعتمد بباقي المشروع (نموذج Zero-friction)
  pin text,
  -- اسم الشركة الرسمي اللي يظهر بالفاتورة — لو فاضي، تُستخدم قيمة name نفسها
  company_name text,
  -- الرقم الضريبي ورقم السجل التجاري يظهران بفاتورة كل عملية سحب تُرسَل للمولّد
  tax_number text,
  cr_number text,
  -- إعدادات شكل الفاتورة الخاصة بكل مجمّع
  invoice_start_number integer not null default 1000,
  invoice_prefix text not null default 'INV-',
  invoice_page_size text not null default 'a4' check (invoice_page_size in ('a4', 'a5')),
  invoice_letterhead text,
  invoice_stamp text,
  email text,
  website text,
  created_at timestamptz not null default now()
);

-- مجموعة مولّدين: مولّد (شركة/مالك واحد) له عدة فروع بإدارة واحدة ورقم
-- واتساب واحد. كل فرع يبقى صفًّا في جدول generators بباركوده الخاص، لكن
-- مربوط بهذه المجموعة عبر group_id. إشعارات كل الفروع تروح لرقم المجموعة.
create table if not exists generator_groups (
  id text primary key,
  collector_id text references collectors(id),
  name text not null,
  whatsapp text not null default '',
  created_at timestamptz not null default now()
);

-- كل مولّد مربوط بالمجمّع اللي سجّله (باركوده الخاص) — نفس المولّد الفعلي
-- ممكن يسجّله أكثر من مجمّع بباركودات منفصلة، وكل باركود يوجّه لصاحبه فقط.
-- group_id (اختياري): لو معبّأ فالمولّد فرعٌ ضمن مجموعة، وإلا فهو مولّد مفرد
create table if not exists generators (
  id text primary key,
  collector_id text references collectors(id),
  group_id text references generator_groups(id),
  name text not null,
  whatsapp text not null,
  governorate text not null,
  wilayat text not null,
  lat double precision not null,
  lng double precision not null,
  registered_at date not null default current_date,
  active boolean not null default true,
  -- بيانات الإقرار الذاتي ISCC (نقطة المنشأ) — يعبّيها المجمّع عند التسجيل
  address text,
  post_code text,
  country text default 'عُمان',
  max_capacity_year numeric,
  renewable_capacity_year numeric,
  monthly_over_5t boolean,
  animal_origin boolean,
  -- حالة العقد الإلكتروني: draft (مسودّة) ← sent (أُرسل للمولّد) ← approved (وافق)
  contract_status text default 'draft',
  contract_approved_at timestamptz,
  contract_valid_from date,
  contract_valid_until date,
  created_at timestamptz not null default now()
);

-- سائقو أسطول كل مجمّع — يدخلون النظام برابط بدون تسجيل دخول (مثل نمط
-- /scan للمولّدين)، ويرسلون موقعهم الحي أثناء العمل لتتبّع الأسطول
create table if not exists drivers (
  id text primary key,
  collector_id text not null references collectors(id),
  name text not null,
  whatsapp text not null,
  active boolean not null default true,
  lat double precision,
  lng double precision,
  location_updated_at timestamptz,
  -- نفس فكرة رقم collectors.pin السري الاحتياطي، لكل سائق
  pin text,
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
  collector_id text references collectors(id),
  driver_id text references drivers(id),
  status text not null default 'pending' check (status in ('pending', 'completed')),
  created_at timestamptz not null default now(),
  liters double precision,
  price_per_liter_omr double precision,
  total_omr double precision,
  completed_at timestamptz
);

-- مصانع إعادة التدوير: الجهة المشترية النهائية اللي يبيع لها المجمّع (تُدار من
-- لوحة الإدارة فقط، مثل قائمة المجمّعين). هي الوجهة لـ sales.buyer_factory_id
create table if not exists factories (
  id text primary key,
  name text not null,
  whatsapp text not null default '',
  governorates text[] not null default '{}',
  tax_number text,
  cr_number text,
  active boolean not null default true,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

-- عمليات البيع (الحلقة التالية بالسلسلة): مجمّع يبيع زيته لمجمّع آخر أو لمصنع.
-- جدول مستقل تمامًا عن pickup_requests (ما نعيد استخدام صفوف الشراء). دورة
-- الحياة نفسها: pending ← completed. المشتري إما مجمّع أو مصنع (واحد فقط).
-- source_pickup_ids: لقطة FIFO لعمليات الشراء اللي جاءت منها الكمية (سلسلة عهدة).
create table if not exists sales (
  id text primary key,
  seller_collector_id text not null references collectors(id),
  buyer_type text not null check (buyer_type in ('collector', 'factory')),
  buyer_collector_id text references collectors(id),
  buyer_factory_id text references factories(id),
  buyer_name text not null default '',
  liters double precision,
  price_per_liter_omr double precision,
  total_omr double precision,
  commission_omr double precision,
  vat_omr double precision,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  -- من بدأ المعاملة: البائع (عرض) أو المشتري (طلب) — الطرف الآخر يقبل/يرفض
  initiated_by text,
  driver_id text references drivers(id),
  source_pickup_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (
    (buyer_type = 'collector' and buyer_collector_id is not null and buyer_factory_id is null)
    or (buyer_type = 'factory' and buyer_factory_id is not null and buyer_collector_id is null)
  )
);

-- تفعيل أمان مستوى الصف (RLS) — هذا النموذج بدون تسجيل دخول (Zero-friction UX)
-- لذلك السياسات تسمح بالقراءة والكتابة العامة عبر مفتاح anon فقط.
-- ملاحظة أمنية: أي حد يعرف رابط الموقع يقدر يقرأ/يعدّل البيانات — هذا مقبول
-- لنموذج تشغيلي أولي، لكن لو صار فيه استخدام فعلي حساس لازم تُضاف طبقة
-- تسجيل دخول (Supabase Auth) قبل توسّع الاستخدام.
alter table generators enable row level security;
alter table generator_groups enable row level security;
alter table collectors enable row level security;
alter table pickup_requests enable row level security;
alter table drivers enable row level security;
alter table factories enable row level security;
alter table sales enable row level security;

drop policy if exists "public read generators" on generators;
create policy "public read generators" on generators for select using (true);
drop policy if exists "public insert generators" on generators;
create policy "public insert generators" on generators for insert with check (true);
drop policy if exists "public update generators" on generators;
create policy "public update generators" on generators for update using (true);
drop policy if exists "public delete generators" on generators;
create policy "public delete generators" on generators for delete using (true);

drop policy if exists "public read generator_groups" on generator_groups;
create policy "public read generator_groups" on generator_groups for select using (true);
drop policy if exists "public insert generator_groups" on generator_groups;
create policy "public insert generator_groups" on generator_groups for insert with check (true);
drop policy if exists "public update generator_groups" on generator_groups;
create policy "public update generator_groups" on generator_groups for update using (true);
drop policy if exists "public delete generator_groups" on generator_groups;
create policy "public delete generator_groups" on generator_groups for delete using (true);

drop policy if exists "public read collectors" on collectors;
create policy "public read collectors" on collectors for select using (true);
drop policy if exists "public insert collectors" on collectors;
create policy "public insert collectors" on collectors for insert with check (true);
drop policy if exists "public update collectors" on collectors;
create policy "public update collectors" on collectors for update using (true);
drop policy if exists "public delete collectors" on collectors;
create policy "public delete collectors" on collectors for delete using (true);

drop policy if exists "public read pickup_requests" on pickup_requests;
create policy "public read pickup_requests" on pickup_requests for select using (true);
drop policy if exists "public insert pickup_requests" on pickup_requests;
create policy "public insert pickup_requests" on pickup_requests for insert with check (true);
drop policy if exists "public update pickup_requests" on pickup_requests;
create policy "public update pickup_requests" on pickup_requests for update using (true);
drop policy if exists "public delete pickup_requests" on pickup_requests;
create policy "public delete pickup_requests" on pickup_requests for delete using (true);

drop policy if exists "public read drivers" on drivers;
create policy "public read drivers" on drivers for select using (true);
drop policy if exists "public insert drivers" on drivers;
create policy "public insert drivers" on drivers for insert with check (true);
drop policy if exists "public update drivers" on drivers;
create policy "public update drivers" on drivers for update using (true);
drop policy if exists "public delete drivers" on drivers;
create policy "public delete drivers" on drivers for delete using (true);

drop policy if exists "public read factories" on factories;
create policy "public read factories" on factories for select using (true);
drop policy if exists "public insert factories" on factories;
create policy "public insert factories" on factories for insert with check (true);
drop policy if exists "public update factories" on factories;
create policy "public update factories" on factories for update using (true);
drop policy if exists "public delete factories" on factories;
create policy "public delete factories" on factories for delete using (true);

drop policy if exists "public read sales" on sales;
create policy "public read sales" on sales for select using (true);
drop policy if exists "public insert sales" on sales;
create policy "public insert sales" on sales for insert with check (true);
drop policy if exists "public update sales" on sales;
create policy "public update sales" on sales for update using (true);
drop policy if exists "public delete sales" on sales;
create policy "public delete sales" on sales for delete using (true);

-- تفعيل التحديث اللحظي (Realtime) حتى تظهر الطلبات الجديدة عند المجمّع فورًا
alter publication supabase_realtime add table pickup_requests;
alter publication supabase_realtime add table factories;
alter publication supabase_realtime add table sales;
alter publication supabase_realtime add table generators;
alter publication supabase_realtime add table generator_groups;
alter publication supabase_realtime add table collectors;
alter publication supabase_realtime add table drivers;

-- بيانات أولية: مجمّع واحد جاهز لتغطية مسقط — عدّل الاسم ورقم الواتساب
-- من لوحة الإدارة (/admin) بعد الربط، أو مباشرة هنا قبل التنفيذ
insert into collectors (id, name, whatsapp, governorates, active) values
  ('col-1', 'المجمّع الأول', '', array['مسقط'], true)
on conflict (id) do nothing;

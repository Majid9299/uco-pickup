"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { calculateSaleCommission, round } from "@/lib/commission";
import { Collector, Driver, Factory, Generator, GeneratorGroup, PickupRequest, Sale } from "@/lib/types";

interface DataContextValue {
  ready: boolean;
  configured: boolean;
  /** رسالة خطأ لو فشل تحميل البيانات من Supabase (قاعدة موقوفة/محذوفة، انقطاع شبكة…) */
  loadError: string | null;
  generators: Generator[];
  generatorGroups: GeneratorGroup[];
  collectors: Collector[];
  requests: PickupRequest[];
  drivers: Driver[];
  factories: Factory[];
  sales: Sale[];
  addGenerator: (
    input: Omit<Generator, "id" | "registeredAt" | "active">
  ) => Promise<Generator>;
  addGeneratorGroup: (input: {
    collectorId: string;
    name: string;
    whatsapp: string;
  }) => Promise<GeneratorGroup>;
  updateGeneratorGroup: (
    groupId: string,
    input: { name: string; whatsapp: string }
  ) => Promise<void>;
  deleteGeneratorGroup: (groupId: string) => Promise<void>;
  assignGeneratorToGroup: (generatorId: string, groupId: string | null) => Promise<void>;
  addCollector: (input: Omit<Collector, "id" | "active">) => Promise<Collector>;
  createRequestForGenerator: (generatorId: string) => Promise<PickupRequest | null>;
  completePickup: (
    requestId: string,
    liters: number,
    pricePerLiterOMR: number
  ) => Promise<void>;
  setCollectorWhatsapp: (collectorId: string, whatsapp: string) => Promise<void>;
  setCollectorPin: (collectorId: string, pin: string) => Promise<void>;
  setDriverPin: (driverId: string, pin: string) => Promise<void>;
  setCollectorTaxNumber: (collectorId: string, taxNumber: string) => Promise<void>;
  setCollectorInvoiceSettings: (
    collectorId: string,
    input: {
      companyName?: string;
      taxNumber: string;
      crNumber: string;
      invoiceStartNumber: number;
      invoicePrefix: string;
      invoicePageSize: "a4" | "a5";
      invoiceLetterhead?: string;
      invoiceStamp?: string;
      email?: string;
      website?: string;
    }
  ) => Promise<void>;
  toggleGeneratorActive: (generatorId: string) => Promise<void>;
  reassignGenerator: (generatorId: string, collectorId: string) => Promise<void>;
  updateGenerator: (
    generatorId: string,
    input: { name: string; whatsapp: string; governorate: string; wilayat: string }
  ) => Promise<void>;
  deleteGenerator: (generatorId: string) => Promise<void>;
  updateGeneratorDeclaration: (
    generatorId: string,
    input: {
      name?: string;
      whatsapp?: string;
      address?: string;
      postCode?: string;
      country?: string;
      maxCapacityYear?: number;
      renewableCapacityYear?: number;
      monthlyOver5t?: boolean;
      animalOrigin?: boolean;
    }
  ) => Promise<void>;
  approveGeneratorContract: (generatorId: string) => Promise<void>;
  toggleCollectorActive: (collectorId: string) => Promise<void>;
  deleteCollector: (collectorId: string) => Promise<void>;
  addDriver: (input: { collectorId: string; name: string; whatsapp: string }) => Promise<Driver>;
  toggleDriverActive: (driverId: string) => Promise<void>;
  assignRequestToDriver: (requestId: string, driverId: string | null) => Promise<void>;
  updateDriverLocation: (driverId: string, lat: number, lng: number) => Promise<void>;
  addFactory: (input: {
    name: string;
    whatsapp: string;
    governorates: string[];
    taxNumber?: string;
    crNumber?: string;
  }) => Promise<Factory>;
  updateFactory: (
    factoryId: string,
    input: { name: string; whatsapp: string; governorates: string[]; taxNumber?: string; crNumber?: string }
  ) => Promise<void>;
  toggleFactoryActive: (factoryId: string) => Promise<void>;
  deleteFactory: (factoryId: string) => Promise<void>;
  createSale: (input: {
    sellerCollectorId: string;
    buyerType: "collector" | "factory";
    buyerCollectorId?: string;
    buyerFactoryId?: string;
    buyerName: string;
    initiatedBy: "seller" | "buyer";
    liters: number;
    pricePerLiterOMR: number;
  }) => Promise<Sale>;
  // قبول عرض/طلب معلّق: تُحتسب العمولة وتُلتقط سلسلة العهدة وتُختم مكتملة
  acceptSale: (saleId: string) => Promise<void>;
  deleteSale: (saleId: string) => Promise<void>;
  // رصيد المجمّع من الزيت (محسوب): مشتريات مكتملة − مبيعات مكتملة
  collectorOnHandLiters: (collectorId: string) => number;
}

const DataContext = createContext<DataContextValue | null>(null);

function nextId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

interface GeneratorRow {
  id: string;
  collector_id: string | null;
  group_id: string | null;
  name: string;
  whatsapp: string;
  governorate: string;
  wilayat: string;
  lat: number;
  lng: number;
  registered_at: string;
  active: boolean;
  address: string | null;
  post_code: string | null;
  country: string | null;
  max_capacity_year: number | null;
  renewable_capacity_year: number | null;
  monthly_over_5t: boolean | null;
  animal_origin: boolean | null;
  contract_status: string | null;
  contract_approved_at: string | null;
  contract_valid_from: string | null;
  contract_valid_until: string | null;
}

interface GeneratorGroupRow {
  id: string;
  collector_id: string | null;
  name: string;
  whatsapp: string;
}

interface CollectorRow {
  id: string;
  name: string;
  whatsapp: string;
  governorates: string[];
  active: boolean;
  pin: string | null;
  company_name: string | null;
  tax_number: string | null;
  cr_number: string | null;
  invoice_start_number: number;
  invoice_prefix: string;
  invoice_page_size: "a4" | "a5";
  invoice_letterhead: string | null;
  invoice_stamp: string | null;
  email: string | null;
  website: string | null;
}

interface RequestRow {
  id: string;
  generator_id: string;
  generator_name: string;
  governorate: string;
  wilayat: string;
  lat: number;
  lng: number;
  collector_id: string | null;
  driver_id: string | null;
  status: "pending" | "completed";
  created_at: string;
  liters: number | null;
  price_per_liter_omr: number | null;
  total_omr: number | null;
  completed_at: string | null;
}

interface DriverRow {
  id: string;
  collector_id: string;
  name: string;
  whatsapp: string;
  active: boolean;
  lat: number | null;
  lng: number | null;
  location_updated_at: string | null;
  pin: string | null;
}

function fromGeneratorRow(r: GeneratorRow): Generator {
  return {
    id: r.id,
    collectorId: r.collector_id ?? "",
    groupId: r.group_id ?? undefined,
    name: r.name,
    whatsapp: r.whatsapp,
    governorate: r.governorate,
    wilayat: r.wilayat,
    lat: r.lat,
    lng: r.lng,
    registeredAt: r.registered_at,
    active: r.active,
    address: r.address ?? undefined,
    postCode: r.post_code ?? undefined,
    country: r.country ?? undefined,
    maxCapacityYear: r.max_capacity_year ?? undefined,
    renewableCapacityYear: r.renewable_capacity_year ?? undefined,
    monthlyOver5t: r.monthly_over_5t ?? undefined,
    animalOrigin: r.animal_origin ?? undefined,
    contractStatus: (r.contract_status as "draft" | "sent" | "approved" | null) ?? undefined,
    contractApprovedAt: r.contract_approved_at ?? undefined,
    contractValidFrom: r.contract_valid_from ?? undefined,
    contractValidUntil: r.contract_valid_until ?? undefined,
  };
}

function fromGeneratorGroupRow(r: GeneratorGroupRow): GeneratorGroup {
  return {
    id: r.id,
    collectorId: r.collector_id ?? "",
    name: r.name,
    whatsapp: r.whatsapp,
  };
}

function fromCollectorRow(r: CollectorRow): Collector {
  return {
    id: r.id,
    name: r.name,
    whatsapp: r.whatsapp,
    governorates: r.governorates,
    active: r.active,
    pin: r.pin ?? undefined,
    companyName: r.company_name ?? undefined,
    taxNumber: r.tax_number ?? undefined,
    crNumber: r.cr_number ?? undefined,
    invoiceStartNumber: r.invoice_start_number ?? 1000,
    invoicePrefix: r.invoice_prefix ?? "INV-",
    invoicePageSize: r.invoice_page_size ?? "a4",
    invoiceLetterhead: r.invoice_letterhead ?? undefined,
    invoiceStamp: r.invoice_stamp ?? undefined,
    email: r.email ?? undefined,
    website: r.website ?? undefined,
  };
}

function fromRequestRow(r: RequestRow): PickupRequest {
  return {
    id: r.id,
    generatorId: r.generator_id,
    generatorName: r.generator_name,
    governorate: r.governorate,
    wilayat: r.wilayat,
    lat: r.lat,
    lng: r.lng,
    collectorId: r.collector_id ?? "",
    driverId: r.driver_id ?? undefined,
    status: r.status,
    createdAt: r.created_at,
    liters: r.liters ?? undefined,
    pricePerLiterOMR: r.price_per_liter_omr ?? undefined,
    totalOMR: r.total_omr ?? undefined,
    completedAt: r.completed_at ?? undefined,
  };
}

function fromDriverRow(r: DriverRow): Driver {
  return {
    id: r.id,
    collectorId: r.collector_id,
    name: r.name,
    whatsapp: r.whatsapp,
    active: r.active,
    lat: r.lat ?? undefined,
    lng: r.lng ?? undefined,
    locationUpdatedAt: r.location_updated_at ?? undefined,
    pin: r.pin ?? undefined,
  };
}

interface FactoryRow {
  id: string;
  name: string;
  whatsapp: string;
  governorates: string[];
  tax_number: string | null;
  cr_number: string | null;
  active: boolean;
  lat: number | null;
  lng: number | null;
}

interface SaleRow {
  id: string;
  seller_collector_id: string;
  buyer_type: "collector" | "factory";
  buyer_collector_id: string | null;
  buyer_factory_id: string | null;
  buyer_name: string;
  liters: number | null;
  price_per_liter_omr: number | null;
  total_omr: number | null;
  commission_omr: number | null;
  vat_omr: number | null;
  status: "pending" | "completed";
  initiated_by: string | null;
  driver_id: string | null;
  source_pickup_ids: string[] | null;
  created_at: string;
  completed_at: string | null;
}

function fromFactoryRow(r: FactoryRow): Factory {
  return {
    id: r.id,
    name: r.name,
    whatsapp: r.whatsapp,
    governorates: r.governorates ?? [],
    taxNumber: r.tax_number ?? undefined,
    crNumber: r.cr_number ?? undefined,
    active: r.active,
    lat: r.lat ?? undefined,
    lng: r.lng ?? undefined,
  };
}

function fromSaleRow(r: SaleRow): Sale {
  return {
    id: r.id,
    sellerCollectorId: r.seller_collector_id,
    buyerType: r.buyer_type,
    buyerCollectorId: r.buyer_collector_id ?? undefined,
    buyerFactoryId: r.buyer_factory_id ?? undefined,
    buyerName: r.buyer_name,
    liters: r.liters ?? undefined,
    pricePerLiterOMR: r.price_per_liter_omr ?? undefined,
    totalOMR: r.total_omr ?? undefined,
    commissionOMR: r.commission_omr ?? undefined,
    vatOMR: r.vat_omr ?? undefined,
    status: r.status,
    initiatedBy: (r.initiated_by as "seller" | "buyer" | null) ?? undefined,
    driverId: r.driver_id ?? undefined,
    sourcePickupIds: r.source_pickup_ids ?? [],
    createdAt: r.created_at,
    completedAt: r.completed_at ?? undefined,
  };
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [generators, setGenerators] = useState<Generator[]>([]);
  const [generatorGroups, setGeneratorGroups] = useState<GeneratorGroup[]>([]);
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [requests, setRequests] = useState<PickupRequest[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let cancelled = false;

    async function loadAll() {
      let g, gg, c, r, d, f, s;
      try {
        [g, gg, c, r, d, f, s] = await Promise.all([
          supabase.from("generators").select("*").order("created_at", { ascending: true }),
          supabase.from("generator_groups").select("*").order("created_at", { ascending: true }),
          supabase.from("collectors").select("*").order("created_at", { ascending: true }),
          supabase.from("pickup_requests").select("*").order("created_at", { ascending: false }),
          supabase.from("drivers").select("*").order("created_at", { ascending: true }),
          supabase.from("factories").select("*").order("created_at", { ascending: true }),
          supabase.from("sales").select("*").order("created_at", { ascending: false }),
        ]);
      } catch (e) {
        // فشل شبكي كامل (القاعدة موقوفة/محذوفة، لا إنترنت) — Promise.all يرمي هنا
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : String(e));
        setReady(true);
        return;
      }
      if (cancelled) return;

      // مهم: ما نبتلع الأخطاء بصمت. لو فشل أي جدول، الصفر اللي يظهر بالواجهة
      // معناه "ما قدرنا نقرأ" مش "ما فيه بيانات" — لازم يبان للمستخدم
      const failed = ([
        ["generators", g],
        ["generator_groups", gg],
        ["collectors", c],
        ["pickup_requests", r],
        ["drivers", d],
        ["factories", f],
        ["sales", s],
      ] as const).filter(([, res]) => res.error);
      setLoadError(
        failed.length
          ? `${failed.map(([name]) => name).join("، ")} — ${failed[0][1].error?.message ?? "خطأ غير معروف"}`
          : null
      );

      if (g.data) setGenerators((g.data as GeneratorRow[]).map(fromGeneratorRow));
      if (gg.data) setGeneratorGroups((gg.data as GeneratorGroupRow[]).map(fromGeneratorGroupRow));
      if (c.data) setCollectors((c.data as CollectorRow[]).map(fromCollectorRow));
      if (r.data) setRequests((r.data as RequestRow[]).map(fromRequestRow));
      if (d.data) setDrivers((d.data as DriverRow[]).map(fromDriverRow));
      if (f.data) setFactories((f.data as FactoryRow[]).map(fromFactoryRow));
      if (s.data) setSales((s.data as SaleRow[]).map(fromSaleRow));
      setReady(true);
    }

    loadAll();

    const channel = supabase
      .channel("uco-pickup-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "generators" },
        (payload) => {
          const row = payload.new as GeneratorRow;
          if (!row?.id) return;
          const mapped = fromGeneratorRow(row);
          setGenerators((prev) =>
            prev.some((g) => g.id === mapped.id)
              ? prev.map((g) => (g.id === mapped.id ? mapped : g))
              : [...prev, mapped]
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "generator_groups" },
        (payload) => {
          const row = payload.new as GeneratorGroupRow;
          if (!row?.id) {
            const removed = payload.old as { id?: string };
            if (removed?.id) setGeneratorGroups((prev) => prev.filter((gr) => gr.id !== removed.id));
            return;
          }
          const mapped = fromGeneratorGroupRow(row);
          setGeneratorGroups((prev) =>
            prev.some((gr) => gr.id === mapped.id)
              ? prev.map((gr) => (gr.id === mapped.id ? mapped : gr))
              : [...prev, mapped]
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "collectors" },
        (payload) => {
          const row = payload.new as CollectorRow;
          if (!row?.id) return;
          const mapped = fromCollectorRow(row);
          setCollectors((prev) =>
            prev.some((c) => c.id === mapped.id)
              ? prev.map((c) => (c.id === mapped.id ? mapped : c))
              : [...prev, mapped]
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pickup_requests" },
        (payload) => {
          const row = payload.new as RequestRow;
          if (!row?.id) return;
          const mapped = fromRequestRow(row);
          setRequests((prev) =>
            prev.some((r) => r.id === mapped.id)
              ? prev.map((r) => (r.id === mapped.id ? mapped : r))
              : [mapped, ...prev]
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drivers" },
        (payload) => {
          const row = payload.new as DriverRow;
          if (!row?.id) return;
          const mapped = fromDriverRow(row);
          setDrivers((prev) =>
            prev.some((d) => d.id === mapped.id)
              ? prev.map((d) => (d.id === mapped.id ? mapped : d))
              : [...prev, mapped]
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "factories" },
        (payload) => {
          const row = payload.new as FactoryRow;
          if (!row?.id) {
            const removed = payload.old as { id?: string };
            if (removed?.id) setFactories((prev) => prev.filter((f) => f.id !== removed.id));
            return;
          }
          const mapped = fromFactoryRow(row);
          setFactories((prev) =>
            prev.some((f) => f.id === mapped.id)
              ? prev.map((f) => (f.id === mapped.id ? mapped : f))
              : [...prev, mapped]
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales" },
        (payload) => {
          const row = payload.new as SaleRow;
          if (!row?.id) {
            const removed = payload.old as { id?: string };
            if (removed?.id) setSales((prev) => prev.filter((s) => s.id !== removed.id));
            return;
          }
          const mapped = fromSaleRow(row);
          setSales((prev) =>
            prev.some((s) => s.id === mapped.id)
              ? prev.map((s) => (s.id === mapped.id ? mapped : s))
              : [mapped, ...prev]
          );
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  async function addGenerator(input: Omit<Generator, "id" | "registeredAt" | "active">) {
    const generator: Generator = {
      ...input,
      id: nextId("gen"),
      registeredAt: new Date().toISOString().slice(0, 10),
      active: true,
    };
    // نبني كائن الإدخال بدون group_id افتراضيًا حتى يبقى تسجيل المولّد المفرد
    // شغّالًا حتى لو عمود group_id لسا ما اتضاف بقاعدة البيانات؛ نضيفه فقط
    // عند تسجيل فرع ضمن مجموعة (وهي ميزة تُستخدم بعد تنفيذ الهجرة)
    const insert: Record<string, unknown> = {
      id: generator.id,
      collector_id: generator.collectorId || null,
      name: generator.name,
      whatsapp: generator.whatsapp,
      governorate: generator.governorate,
      wilayat: generator.wilayat,
      lat: generator.lat,
      lng: generator.lng,
      registered_at: generator.registeredAt,
      active: true,
    };
    if (generator.groupId) insert.group_id = generator.groupId;
    // بيانات الإقرار الذاتي — نضيفها فقط لو معبّأة حتى يبقى التسجيل شغّالًا حتى
    // قبل تنفيذ هجرة الأعمدة الجديدة
    if (generator.address !== undefined) insert.address = generator.address;
    if (generator.postCode !== undefined) insert.post_code = generator.postCode;
    if (generator.country !== undefined) insert.country = generator.country;
    if (generator.maxCapacityYear !== undefined) insert.max_capacity_year = generator.maxCapacityYear;
    if (generator.renewableCapacityYear !== undefined) insert.renewable_capacity_year = generator.renewableCapacityYear;
    if (generator.monthlyOver5t !== undefined) insert.monthly_over_5t = generator.monthlyOver5t;
    if (generator.animalOrigin !== undefined) insert.animal_origin = generator.animalOrigin;
    await supabase.from("generators").insert(insert);
    setGenerators((prev) => [...prev, generator]);
    return generator;
  }

  // المولّد يعدّل بيانات إقراره الذاتي من صفحة العقد (المجمّع عبّاها عند التسجيل)
  async function updateGeneratorDeclaration(
    generatorId: string,
    input: {
      name?: string;
      whatsapp?: string;
      address?: string;
      postCode?: string;
      country?: string;
      maxCapacityYear?: number;
      renewableCapacityYear?: number;
      monthlyOver5t?: boolean;
      animalOrigin?: boolean;
    }
  ) {
    const { error } = await supabase
      .from("generators")
      .update({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.whatsapp !== undefined ? { whatsapp: input.whatsapp } : {}),
        address: input.address ?? null,
        post_code: input.postCode ?? null,
        country: input.country ?? null,
        max_capacity_year: input.maxCapacityYear ?? null,
        renewable_capacity_year: input.renewableCapacityYear ?? null,
        monthly_over_5t: input.monthlyOver5t ?? null,
        animal_origin: input.animalOrigin ?? null,
      })
      .eq("id", generatorId);
    if (error) throw new Error(error.message);
    setGenerators((prev) => prev.map((g) => (g.id === generatorId ? { ...g, ...input } : g)));
  }

  // موافقة المولّد على العقد الإلكتروني (توقيع) — صالح 5 سنوات (متطلب ISCC)
  async function approveGeneratorContract(generatorId: string) {
    const now = new Date();
    const approvedAt = now.toISOString();
    const validFrom = approvedAt.slice(0, 10);
    const validUntil = `${now.getFullYear() + 5}${approvedAt.slice(4, 10)}`;
    const { error } = await supabase
      .from("generators")
      .update({
        contract_status: "approved",
        contract_approved_at: approvedAt,
        contract_valid_from: validFrom,
        contract_valid_until: validUntil,
      })
      .eq("id", generatorId);
    if (error) throw new Error(error.message);
    setGenerators((prev) =>
      prev.map((g) =>
        g.id === generatorId
          ? {
              ...g,
              contractStatus: "approved",
              contractApprovedAt: approvedAt,
              contractValidFrom: validFrom,
              contractValidUntil: validUntil,
            }
          : g
      )
    );
  }

  async function addGeneratorGroup(input: {
    collectorId: string;
    name: string;
    whatsapp: string;
  }) {
    const group: GeneratorGroup = { ...input, id: nextId("grp") };
    const { error } = await supabase.from("generator_groups").insert({
      id: group.id,
      collector_id: group.collectorId || null,
      name: group.name,
      whatsapp: group.whatsapp,
    });
    if (error) throw new Error(error.message);
    setGeneratorGroups((prev) => [...prev, group]);
    return group;
  }

  async function updateGeneratorGroup(
    groupId: string,
    input: { name: string; whatsapp: string }
  ) {
    const { error } = await supabase
      .from("generator_groups")
      .update({ name: input.name, whatsapp: input.whatsapp })
      .eq("id", groupId);
    if (error) throw new Error(error.message);
    setGeneratorGroups((prev) =>
      prev.map((gr) => (gr.id === groupId ? { ...gr, ...input } : gr))
    );
  }

  async function deleteGeneratorGroup(groupId: string) {
    // نفكّ ربط الفروع أولًا (تصير مولّدات مفردة) ثم نحذف المجموعة — لا نحذف
    // أي مولّد أو عمليات سحب، فقط نلغي التجميع
    await supabase.from("generators").update({ group_id: null }).eq("group_id", groupId);
    const { error } = await supabase.from("generator_groups").delete().eq("id", groupId);
    if (error) throw new Error(error.message);
    setGenerators((prev) =>
      prev.map((g) => (g.groupId === groupId ? { ...g, groupId: undefined } : g))
    );
    setGeneratorGroups((prev) => prev.filter((gr) => gr.id !== groupId));
  }

  async function assignGeneratorToGroup(generatorId: string, groupId: string | null) {
    const { error } = await supabase
      .from("generators")
      .update({ group_id: groupId })
      .eq("id", generatorId);
    if (error) throw new Error(error.message);
    setGenerators((prev) =>
      prev.map((g) => (g.id === generatorId ? { ...g, groupId: groupId ?? undefined } : g))
    );
  }

  async function addCollector(input: Omit<Collector, "id" | "active">) {
    const collector: Collector = { ...input, id: nextId("col"), active: true };
    await supabase.from("collectors").insert({
      id: collector.id,
      name: collector.name,
      whatsapp: collector.whatsapp,
      governorates: collector.governorates,
      active: true,
    });
    setCollectors((prev) => [...prev, collector]);
    return collector;
  }

  async function createRequestForGenerator(generatorId: string) {
    const generator = generators.find((g) => g.id === generatorId);
    if (!generator) return null;

    // كل باركود مربوط بالمجمّع اللي سجّل المولّد أصلًا — الطلب يروح له هو
    // بالتحديد دايمًا، مو لأي مجمّع تاني يغطي نفس المحافظة جغرافيًا
    const request: PickupRequest = {
      id: nextId("req"),
      generatorId: generator.id,
      generatorName: generator.name,
      governorate: generator.governorate,
      wilayat: generator.wilayat,
      lat: generator.lat,
      lng: generator.lng,
      collectorId: generator.collectorId,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    await supabase.from("pickup_requests").insert({
      id: request.id,
      generator_id: request.generatorId,
      generator_name: request.generatorName,
      governorate: request.governorate,
      wilayat: request.wilayat,
      lat: request.lat,
      lng: request.lng,
      collector_id: request.collectorId || null,
      status: "pending",
      created_at: request.createdAt,
    });
    setRequests((prev) => [request, ...prev]);
    return request;
  }

  async function completePickup(requestId: string, liters: number, pricePerLiterOMR: number) {
    const totalOMR = Math.round(liters * pricePerLiterOMR * 1000) / 1000;
    const completedAt = new Date().toISOString();
    await supabase
      .from("pickup_requests")
      .update({
        status: "completed",
        liters,
        price_per_liter_omr: pricePerLiterOMR,
        total_omr: totalOMR,
        completed_at: completedAt,
      })
      .eq("id", requestId);
    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, status: "completed", liters, pricePerLiterOMR, totalOMR, completedAt }
          : r
      )
    );
  }

  async function setCollectorWhatsapp(collectorId: string, whatsapp: string) {
    await supabase.from("collectors").update({ whatsapp }).eq("id", collectorId);
    setCollectors((prev) =>
      prev.map((c) => (c.id === collectorId ? { ...c, whatsapp } : c))
    );
  }

  async function setCollectorPin(collectorId: string, pin: string) {
    await supabase.from("collectors").update({ pin }).eq("id", collectorId);
    setCollectors((prev) => prev.map((c) => (c.id === collectorId ? { ...c, pin } : c)));
  }

  async function setDriverPin(driverId: string, pin: string) {
    await supabase.from("drivers").update({ pin }).eq("id", driverId);
    setDrivers((prev) => prev.map((d) => (d.id === driverId ? { ...d, pin } : d)));
  }

  async function setCollectorTaxNumber(collectorId: string, taxNumber: string) {
    await supabase.from("collectors").update({ tax_number: taxNumber }).eq("id", collectorId);
    setCollectors((prev) =>
      prev.map((c) => (c.id === collectorId ? { ...c, taxNumber } : c))
    );
  }

  async function setCollectorInvoiceSettings(
    collectorId: string,
    input: {
      companyName?: string;
      taxNumber: string;
      crNumber: string;
      invoiceStartNumber: number;
      invoicePrefix: string;
      invoicePageSize: "a4" | "a5";
      invoiceLetterhead?: string;
      invoiceStamp?: string;
      email?: string;
      website?: string;
    }
  ) {
    const { data, error } = await supabase
      .from("collectors")
      .update({
        company_name: input.companyName ?? null,
        tax_number: input.taxNumber,
        cr_number: input.crNumber,
        invoice_start_number: input.invoiceStartNumber,
        invoice_prefix: input.invoicePrefix,
        invoice_page_size: input.invoicePageSize,
        invoice_letterhead: input.invoiceLetterhead ?? null,
        invoice_stamp: input.invoiceStamp ?? null,
        email: input.email ?? null,
        website: input.website ?? null,
      })
      .eq("id", collectorId)
      .select("id");
    // نتحقق من الخطأ صراحة هنا (بدل ما نتجاهله زي باقي نداءات القاعدة) لأن
    // عمود ناقص بقاعدة البيانات كان يسبب فشل صامت متكرر بدون أي رسالة للمستخدم.
    // ونتحقق كمان إن صف فعلًا تحدّث — لو الـ id ما طابق أي صف، Supabase يرجّع
    // error فاضي وdata فاضية بدون أي تنبيه، وده كان ممكن يبان للمستخدم إنه "حفظ" بينما فعليًا ما تغيّر شي
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      throw new Error("لم يتم العثور على المجمّع لتحديثه — تأكد من تسجيل الدخول");
    }
    setCollectors((prev) =>
      prev.map((c) => (c.id === collectorId ? { ...c, ...input } : c))
    );
  }

  async function reassignGenerator(generatorId: string, collectorId: string) {
    await supabase.from("generators").update({ collector_id: collectorId }).eq("id", generatorId);
    setGenerators((prev) =>
      prev.map((g) => (g.id === generatorId ? { ...g, collectorId } : g))
    );
  }

  async function updateGenerator(
    generatorId: string,
    input: { name: string; whatsapp: string; governorate: string; wilayat: string }
  ) {
    await supabase
      .from("generators")
      .update({
        name: input.name,
        whatsapp: input.whatsapp,
        governorate: input.governorate,
        wilayat: input.wilayat,
      })
      .eq("id", generatorId);
    setGenerators((prev) =>
      prev.map((g) => (g.id === generatorId ? { ...g, ...input } : g))
    );
  }

  async function toggleGeneratorActive(generatorId: string) {
    const generator = generators.find((g) => g.id === generatorId);
    if (!generator) return;
    const active = !generator.active;
    await supabase.from("generators").update({ active }).eq("id", generatorId);
    setGenerators((prev) => prev.map((g) => (g.id === generatorId ? { ...g, active } : g)));
  }

  async function deleteGenerator(generatorId: string) {
    // نحذف عمليات السحب المرتبطة بالمولّد أولًا (لتفادي قيد المفتاح الأجنبي)
    // ثم المولّد نفسه — عملية لا رجعة فيها. نطلب select عشان نتأكد إن صفًّا
    // فعلاً انحذف؛ لو RLS يمنع الحذف يرجع 0 صفوف بدون خطأ، ونبلّغ المستخدم
    await supabase.from("pickup_requests").delete().eq("generator_id", generatorId);
    const { data, error } = await supabase
      .from("generators")
      .delete()
      .eq("id", generatorId)
      .select("id");
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      throw new Error(
        "تعذّر الحذف من قاعدة البيانات — لازم تشغّل كود أذونات الحذف (RLS) مرة واحدة (راجع الرسالة المرسلة)."
      );
    }
    setRequests((prev) => prev.filter((r) => r.generatorId !== generatorId));
    setGenerators((prev) => prev.filter((g) => g.id !== generatorId));
  }

  async function toggleCollectorActive(collectorId: string) {
    const collector = collectors.find((c) => c.id === collectorId);
    if (!collector) return;
    const active = !collector.active;
    await supabase.from("collectors").update({ active }).eq("id", collectorId);
    setCollectors((prev) => prev.map((c) => (c.id === collectorId ? { ...c, active } : c)));
  }

  async function deleteCollector(collectorId: string) {
    const genIds = generators.filter((g) => g.collectorId === collectorId).map((g) => g.id);
    if (genIds.length > 0) {
      await supabase.from("pickup_requests").delete().in("generator_id", genIds);
    }
    // نحذف أي مبيعات يكون فيها المجمّع بائعًا أو مشتريًا قبل حذفه (قيود FK)
    await supabase.from("sales").delete().eq("seller_collector_id", collectorId);
    await supabase.from("sales").delete().eq("buyer_collector_id", collectorId);
    await supabase.from("pickup_requests").delete().eq("collector_id", collectorId);
    await supabase.from("generators").delete().eq("collector_id", collectorId);
    await supabase.from("drivers").delete().eq("collector_id", collectorId);
    await supabase.from("collectors").delete().eq("id", collectorId);

    setSales((prev) =>
      prev.filter((s) => s.sellerCollectorId !== collectorId && s.buyerCollectorId !== collectorId)
    );
    setRequests((prev) =>
      prev.filter((r) => r.collectorId !== collectorId && !genIds.includes(r.generatorId))
    );
    setGenerators((prev) => prev.filter((g) => g.collectorId !== collectorId));
    setDrivers((prev) => prev.filter((d) => d.collectorId !== collectorId));
    setCollectors((prev) => prev.filter((c) => c.id !== collectorId));
  }

  async function addDriver(input: { collectorId: string; name: string; whatsapp: string }) {
    const driver: Driver = {
      id: nextId("drv"),
      collectorId: input.collectorId,
      name: input.name,
      whatsapp: input.whatsapp,
      active: true,
    };
    await supabase.from("drivers").insert({
      id: driver.id,
      collector_id: driver.collectorId,
      name: driver.name,
      whatsapp: driver.whatsapp,
      active: true,
    });
    setDrivers((prev) => [...prev, driver]);
    return driver;
  }

  async function toggleDriverActive(driverId: string) {
    const driver = drivers.find((d) => d.id === driverId);
    if (!driver) return;
    const active = !driver.active;
    await supabase.from("drivers").update({ active }).eq("id", driverId);
    setDrivers((prev) => prev.map((d) => (d.id === driverId ? { ...d, active } : d)));
  }

  async function assignRequestToDriver(requestId: string, driverId: string | null) {
    await supabase.from("pickup_requests").update({ driver_id: driverId }).eq("id", requestId);
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, driverId: driverId ?? undefined } : r))
    );
  }

  async function updateDriverLocation(driverId: string, lat: number, lng: number) {
    const locationUpdatedAt = new Date().toISOString();
    await supabase
      .from("drivers")
      .update({ lat, lng, location_updated_at: locationUpdatedAt })
      .eq("id", driverId);
    setDrivers((prev) =>
      prev.map((d) => (d.id === driverId ? { ...d, lat, lng, locationUpdatedAt } : d))
    );
  }

  // ===== مصانع إعادة التدوير (تُدار من الأدمن) =====
  async function addFactory(input: {
    name: string;
    whatsapp: string;
    governorates: string[];
    taxNumber?: string;
    crNumber?: string;
  }) {
    const factory: Factory = { ...input, id: nextId("fac"), active: true };
    const { error } = await supabase.from("factories").insert({
      id: factory.id,
      name: factory.name,
      whatsapp: factory.whatsapp,
      governorates: factory.governorates,
      tax_number: factory.taxNumber ?? null,
      cr_number: factory.crNumber ?? null,
      active: true,
    });
    if (error) throw new Error(error.message);
    setFactories((prev) => [...prev, factory]);
    return factory;
  }

  async function updateFactory(
    factoryId: string,
    input: { name: string; whatsapp: string; governorates: string[]; taxNumber?: string; crNumber?: string }
  ) {
    const { error } = await supabase
      .from("factories")
      .update({
        name: input.name,
        whatsapp: input.whatsapp,
        governorates: input.governorates,
        tax_number: input.taxNumber ?? null,
        cr_number: input.crNumber ?? null,
      })
      .eq("id", factoryId);
    if (error) throw new Error(error.message);
    setFactories((prev) => prev.map((f) => (f.id === factoryId ? { ...f, ...input } : f)));
  }

  async function toggleFactoryActive(factoryId: string) {
    const factory = factories.find((f) => f.id === factoryId);
    if (!factory) return;
    const active = !factory.active;
    await supabase.from("factories").update({ active }).eq("id", factoryId);
    setFactories((prev) => prev.map((f) => (f.id === factoryId ? { ...f, active } : f)));
  }

  async function deleteFactory(factoryId: string) {
    // نحذف أي مبيعات موجّهة لهذا المصنع أولًا (قيد FK)
    await supabase.from("sales").delete().eq("buyer_factory_id", factoryId);
    const { data, error } = await supabase.from("factories").delete().eq("id", factoryId).select("id");
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      throw new Error("تعذّر الحذف — لازم تشغّل كود أذونات الحذف (RLS) مرة واحدة.");
    }
    setSales((prev) => prev.filter((s) => s.buyerFactoryId !== factoryId));
    setFactories((prev) => prev.filter((f) => f.id !== factoryId));
  }

  // ===== المخزون المحسوب: مشتريات مكتملة − مبيعات مكتملة =====
  function collectorOnHandLiters(collectorId: string) {
    const bought = requests
      .filter((r) => r.collectorId === collectorId && r.status === "completed")
      .reduce((sum, r) => sum + (r.liters ?? 0), 0);
    const boughtViaSale = sales
      .filter((s) => s.status === "completed" && s.buyerType === "collector" && s.buyerCollectorId === collectorId)
      .reduce((sum, s) => sum + (s.liters ?? 0), 0);
    const sold = sales
      .filter((s) => s.status === "completed" && s.sellerCollectorId === collectorId)
      .reduce((sum, s) => sum + (s.liters ?? 0), 0);
    return round(bought + boughtViaSale - sold, 3);
  }

  // ===== عمليات البيع (عرض/طلب → قبول/رفض) =====
  // createSale ينشئ معاملة معلّقة بشروطها (الكمية والسعر ومن بدأها). الطرف الآخر
  // يقبلها عبر acceptSale (تُحتسب العمولة وتُلتقط العهدة وتُختم مكتملة) أو يرفضها
  // عبر deleteSale. بيع المصنع ما له طرف يقبل، فالواجهة تنشئه ثم تقبله فورًا.
  async function createSale(input: {
    sellerCollectorId: string;
    buyerType: "collector" | "factory";
    buyerCollectorId?: string;
    buyerFactoryId?: string;
    buyerName: string;
    initiatedBy: "seller" | "buyer";
    liters: number;
    pricePerLiterOMR: number;
  }) {
    const totalOMR = round(input.liters * input.pricePerLiterOMR, 3);
    const sale: Sale = {
      id: nextId("sale"),
      sellerCollectorId: input.sellerCollectorId,
      buyerType: input.buyerType,
      buyerCollectorId: input.buyerType === "collector" ? input.buyerCollectorId : undefined,
      buyerFactoryId: input.buyerType === "factory" ? input.buyerFactoryId : undefined,
      buyerName: input.buyerName,
      liters: input.liters,
      pricePerLiterOMR: input.pricePerLiterOMR,
      totalOMR,
      status: "pending",
      initiatedBy: input.initiatedBy,
      sourcePickupIds: [],
      createdAt: new Date().toISOString(),
    };
    const { error } = await supabase.from("sales").insert({
      id: sale.id,
      seller_collector_id: sale.sellerCollectorId,
      buyer_type: sale.buyerType,
      buyer_collector_id: sale.buyerCollectorId ?? null,
      buyer_factory_id: sale.buyerFactoryId ?? null,
      buyer_name: sale.buyerName,
      liters: sale.liters,
      price_per_liter_omr: sale.pricePerLiterOMR,
      total_omr: totalOMR,
      status: "pending",
      initiated_by: sale.initiatedBy,
    });
    if (error) throw new Error(error.message);
    setSales((prev) => [sale, ...prev]);
    return sale;
  }

  async function acceptSale(saleId: string) {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;
    const liters = sale.liters ?? 0;
    // عمولة إنفير على المعاملة: ريال/طن من كل طرف (النخزّن الإجمالي: طرفان للمجمّع، طرف للمصنع)
    const fee = calculateSaleCommission(liters, sale.buyerType);
    const completedAt = new Date().toISOString();
    // لقطة سلسلة العهدة (FIFO): أقدم عمليات شراء مكتملة للبائع تغطي الكمية المباعة
    const sellerPickups = requests
      .filter((r) => r.collectorId === sale.sellerCollectorId && r.status === "completed")
      .sort((a, b) => (a.completedAt ?? a.createdAt).localeCompare(b.completedAt ?? b.createdAt));
    const sourcePickupIds: string[] = [];
    let covered = 0;
    for (const p of sellerPickups) {
      if (covered >= liters) break;
      sourcePickupIds.push(p.id);
      covered += p.liters ?? 0;
    }
    const { error } = await supabase
      .from("sales")
      .update({
        commission_omr: fee.commissionOMR,
        vat_omr: fee.vatOMR,
        status: "completed",
        source_pickup_ids: sourcePickupIds,
        completed_at: completedAt,
      })
      .eq("id", saleId);
    if (error) throw new Error(error.message);
    setSales((prev) =>
      prev.map((s) =>
        s.id === saleId
          ? {
              ...s,
              commissionOMR: fee.commissionOMR,
              vatOMR: fee.vatOMR,
              status: "completed",
              sourcePickupIds,
              completedAt,
            }
          : s
      )
    );
  }

  async function deleteSale(saleId: string) {
    const { data, error } = await supabase.from("sales").delete().eq("id", saleId).select("id");
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      throw new Error("تعذّر الحذف — لازم تشغّل كود أذونات الحذف (RLS) مرة واحدة.");
    }
    setSales((prev) => prev.filter((s) => s.id !== saleId));
  }

  return (
    <DataContext.Provider
      value={{
        ready,
        configured: isSupabaseConfigured,
        loadError,
        generators,
        generatorGroups,
        collectors,
        requests,
        drivers,
        factories,
        sales,
        addGenerator,
        addGeneratorGroup,
        updateGeneratorGroup,
        deleteGeneratorGroup,
        assignGeneratorToGroup,
        addCollector,
        createRequestForGenerator,
        completePickup,
        setCollectorWhatsapp,
        setCollectorPin,
        setDriverPin,
        setCollectorTaxNumber,
        setCollectorInvoiceSettings,
        toggleGeneratorActive,
        reassignGenerator,
        updateGenerator,
        deleteGenerator,
        updateGeneratorDeclaration,
        approveGeneratorContract,
        toggleCollectorActive,
        deleteCollector,
        addDriver,
        toggleDriverActive,
        assignRequestToDriver,
        updateDriverLocation,
        addFactory,
        updateFactory,
        toggleFactoryActive,
        deleteFactory,
        createSale,
        acceptSale,
        deleteSale,
        collectorOnHandLiters,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

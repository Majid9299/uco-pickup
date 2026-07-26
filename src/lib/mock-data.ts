import { Collector, Generator, GovernorateGroup, PickupRequest } from "./types";

export const LITERS_PER_TON = 1000;
export const COMMISSION_PER_TON_OMR = 2;
export const VAT_RATE = 0.05;

export const GOVERNORATES: GovernorateGroup[] = [
  { name: "مسقط", wilayats: ["القرم", "الخوض", "بوشر", "مطرح", "السيب"] },
  { name: "ظفار", wilayats: ["صلالة", "طاقة", "مرباط", "ثمريت"] },
  { name: "الباطنة شمال", wilayats: ["صحار", "شناص", "لوى", "صحم"] },
  { name: "الباطنة جنوب", wilayats: ["الرستاق", "العوابي", "نخل", "بركاء"] },
  { name: "الداخلية", wilayats: ["نزوى", "بهلاء", "إزكي", "سمائل"] },
  { name: "الشرقية جنوب", wilayats: ["صور", "الكامل والوافي", "جعلان بني بو علي"] },
];

export const CURRENT_COLLECTOR_ID = "col-1";

export const COLLECTORS: Collector[] = [
  {
    id: "col-1",
    name: "شركة الخليج لتجميع الزيوت",
    whatsapp: "",
    governorates: ["مسقط", "الباطنة جنوب"],
    active: true,
  },
  {
    id: "col-2",
    name: "مؤسسة النور للتجميع",
    whatsapp: "+968 9500 1122",
    governorates: ["ظفار"],
    active: true,
  },
];

export const GENERATORS: Generator[] = [
  {
    id: "gen-1",
    name: "مطعم الواحة الذهبية",
    whatsapp: "+968 9123 4567",
    governorate: "مسقط",
    wilayat: "القرم",
    lat: 23.6055,
    lng: 58.4478,
    registeredAt: "2026-06-10",
    active: true,
  },
  {
    id: "gen-2",
    name: "مطعم بيت المندي",
    whatsapp: "+968 9234 5678",
    governorate: "مسقط",
    wilayat: "الخوض",
    lat: 23.5989,
    lng: 58.2758,
    registeredAt: "2026-06-14",
    active: true,
  },
  {
    id: "gen-3",
    name: "فندق مرجان الخليج",
    whatsapp: "+968 9345 6789",
    governorate: "الباطنة جنوب",
    wilayat: "بركاء",
    lat: 23.7089,
    lng: 57.8886,
    registeredAt: "2026-06-20",
    active: true,
  },
];

export const INITIAL_REQUESTS: PickupRequest[] = [
  {
    id: "req-1",
    generatorId: "gen-1",
    generatorName: "مطعم الواحة الذهبية",
    governorate: "مسقط",
    wilayat: "القرم",
    lat: 23.6055,
    lng: 58.4478,
    collectorId: "col-1",
    status: "pending",
    createdAt: "2026-07-24T09:10:00.000Z",
  },
  {
    id: "req-2",
    generatorId: "gen-2",
    generatorName: "مطعم بيت المندي",
    governorate: "مسقط",
    wilayat: "الخوض",
    lat: 23.5989,
    lng: 58.2758,
    collectorId: "col-1",
    status: "pending",
    createdAt: "2026-07-24T11:45:00.000Z",
  },
  {
    id: "req-3",
    generatorId: "gen-3",
    generatorName: "فندق مرجان الخليج",
    governorate: "الباطنة جنوب",
    wilayat: "بركاء",
    lat: 23.7089,
    lng: 57.8886,
    collectorId: "col-1",
    status: "completed",
    createdAt: "2026-07-20T08:00:00.000Z",
    liters: 640,
    pricePerLiterOMR: 0.09,
    totalOMR: 57.6,
    completedAt: "2026-07-20T13:30:00.000Z",
  },
];

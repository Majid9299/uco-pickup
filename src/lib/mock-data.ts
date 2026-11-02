import { GovernorateGroup } from "./types";

export const LITERS_PER_TON = 1000;
// عمولة إنفير على سحب المولّدين: ريالان لكل طن، يدفعها المجمّع
export const COMMISSION_PER_TON_OMR = 2;
// عمولة إنفير على معاملات البيع/الشراء بين مجمّعين: ريال لكل طن من كل طرف
export const SALE_COMMISSION_PER_TON_OMR = 1;
export const VAT_RATE = 0.05;

export const GOVERNORATES: GovernorateGroup[] = [
  { name: "مسقط", wilayats: ["القرم", "الخوض", "بوشر", "مطرح", "السيب"] },
  { name: "ظفار", wilayats: ["صلالة", "طاقة", "مرباط", "ثمريت"] },
  { name: "الباطنة شمال", wilayats: ["صحار", "شناص", "لوى", "صحم"] },
  { name: "الباطنة جنوب", wilayats: ["الرستاق", "العوابي", "نخل", "بركاء"] },
  { name: "الداخلية", wilayats: ["نزوى", "بهلاء", "إزكي", "سمائل"] },
  { name: "الشرقية جنوب", wilayats: ["صور", "الكامل والوافي", "جعلان بني بو علي"] },
];

// Approximate wilayat-center coordinates, used to reverse-geocode a lat/lng into a governorate + wilayat.
export const WILAYAT_COORDS: Record<string, { lat: number; lng: number }> = {
  القرم: { lat: 23.6139, lng: 58.4515 },
  الخوض: { lat: 23.5836, lng: 58.1783 },
  بوشر: { lat: 23.588, lng: 58.4059 },
  مطرح: { lat: 23.628, lng: 58.594 },
  السيب: { lat: 23.6703, lng: 58.1889 },
  صلالة: { lat: 17.0151, lng: 54.0924 },
  طاقة: { lat: 17.0378, lng: 54.39 },
  مرباط: { lat: 16.9963, lng: 54.6899 },
  ثمريت: { lat: 17.6672, lng: 54.0244 },
  صحار: { lat: 24.3459, lng: 56.7098 },
  شناص: { lat: 24.7414, lng: 56.4694 },
  لوى: { lat: 24.6274, lng: 56.5978 },
  صحم: { lat: 24.1685, lng: 56.8894 },
  الرستاق: { lat: 23.3908, lng: 57.4247 },
  العوابي: { lat: 23.35, lng: 57.45 },
  نخل: { lat: 23.3833, lng: 57.8333 },
  بركاء: { lat: 23.6667, lng: 57.8833 },
  نزوى: { lat: 22.9333, lng: 57.5333 },
  بهلاء: { lat: 22.9667, lng: 57.3 },
  إزكي: { lat: 22.9333, lng: 57.75 },
  سمائل: { lat: 23.2833, lng: 58.0333 },
  صور: { lat: 22.5667, lng: 59.5289 },
  "الكامل والوافي": { lat: 22.15, lng: 59.2 },
  "جعلان بني بو علي": { lat: 22.0554, lng: 59.2967 },
};

function haversineDistanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function findNearestLocation(lat: number, lng: number) {
  let nearestWilayat: string | null = null;
  let nearestDistance = Infinity;
  for (const [wilayat, coords] of Object.entries(WILAYAT_COORDS)) {
    const distance = haversineDistanceKm({ lat, lng }, coords);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestWilayat = wilayat;
    }
  }
  if (!nearestWilayat) return null;
  const governorate = GOVERNORATES.find((g) => g.wilayats.includes(nearestWilayat as string));
  if (!governorate) return null;
  return { governorate: governorate.name, wilayat: nearestWilayat };
}

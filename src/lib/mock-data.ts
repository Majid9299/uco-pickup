import { GovernorateGroup } from "./types";

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

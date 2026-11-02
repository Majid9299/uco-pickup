"use client";

import { useLanguage } from "./LanguageProvider";

const COUNTRY_CODES = [
  { code: "+968", label: "عُمان", labelEn: "Oman" },
  { code: "+971", label: "الإمارات", labelEn: "UAE" },
  { code: "+966", label: "السعودية", labelEn: "Saudi Arabia" },
  { code: "+974", label: "قطر", labelEn: "Qatar" },
  { code: "+965", label: "الكويت", labelEn: "Kuwait" },
  { code: "+973", label: "البحرين", labelEn: "Bahrain" },
  { code: "+964", label: "العراق", labelEn: "Iraq" },
  { code: "+962", label: "الأردن", labelEn: "Jordan" },
  { code: "+961", label: "لبنان", labelEn: "Lebanon" },
  { code: "+963", label: "سوريا", labelEn: "Syria" },
  { code: "+970", label: "فلسطين", labelEn: "Palestine" },
  { code: "+20", label: "مصر", labelEn: "Egypt" },
  { code: "+212", label: "المغرب", labelEn: "Morocco" },
  { code: "+213", label: "الجزائر", labelEn: "Algeria" },
  { code: "+216", label: "تونس", labelEn: "Tunisia" },
  { code: "+218", label: "ليبيا", labelEn: "Libya" },
  { code: "+249", label: "السودان", labelEn: "Sudan" },
  { code: "+967", label: "اليمن", labelEn: "Yemen" },
  { code: "+93", label: "أفغانستان", labelEn: "Afghanistan" },
  { code: "+355", label: "ألبانيا", labelEn: "Albania" },
  { code: "+376", label: "أندورا", labelEn: "Andorra" },
  { code: "+244", label: "أنغولا", labelEn: "Angola" },
  { code: "+1268", label: "أنتيغوا وباربودا", labelEn: "Antigua and Barbuda" },
  { code: "+54", label: "الأرجنتين", labelEn: "Argentina" },
  { code: "+374", label: "أرمينيا", labelEn: "Armenia" },
  { code: "+61", label: "أستراليا", labelEn: "Australia" },
  { code: "+43", label: "النمسا", labelEn: "Austria" },
  { code: "+994", label: "أذربيجان", labelEn: "Azerbaijan" },
  { code: "+1242", label: "الباهاما", labelEn: "Bahamas" },
  { code: "+880", label: "بنغلاديش", labelEn: "Bangladesh" },
  { code: "+1246", label: "باربادوس", labelEn: "Barbados" },
  { code: "+375", label: "بيلاروسيا", labelEn: "Belarus" },
  { code: "+32", label: "بلجيكا", labelEn: "Belgium" },
  { code: "+501", label: "بليز", labelEn: "Belize" },
  { code: "+229", label: "بنين", labelEn: "Benin" },
  { code: "+975", label: "بوتان", labelEn: "Bhutan" },
  { code: "+591", label: "بوليفيا", labelEn: "Bolivia" },
  { code: "+387", label: "البوسنة والهرسك", labelEn: "Bosnia and Herzegovina" },
  { code: "+267", label: "بوتسوانا", labelEn: "Botswana" },
  { code: "+55", label: "البرازيل", labelEn: "Brazil" },
  { code: "+673", label: "بروناي", labelEn: "Brunei" },
  { code: "+359", label: "بلغاريا", labelEn: "Bulgaria" },
  { code: "+226", label: "بوركينا فاسو", labelEn: "Burkina Faso" },
  { code: "+257", label: "بوروندي", labelEn: "Burundi" },
  { code: "+238", label: "الرأس الأخضر", labelEn: "Cape Verde" },
  { code: "+855", label: "كمبوديا", labelEn: "Cambodia" },
  { code: "+237", label: "الكاميرون", labelEn: "Cameroon" },
  { code: "+1", label: "كندا", labelEn: "Canada" },
  { code: "+236", label: "أفريقيا الوسطى", labelEn: "Central African Republic" },
  { code: "+235", label: "تشاد", labelEn: "Chad" },
  { code: "+56", label: "تشيلي", labelEn: "Chile" },
  { code: "+86", label: "الصين", labelEn: "China" },
  { code: "+57", label: "كولومبيا", labelEn: "Colombia" },
  { code: "+269", label: "جزر القمر", labelEn: "Comoros" },
  { code: "+242", label: "الكونغو برازافيل", labelEn: "Congo-Brazzaville" },
  { code: "+243", label: "الكونغو الديمقراطية", labelEn: "DR Congo" },
  { code: "+506", label: "كوستاريكا", labelEn: "Costa Rica" },
  { code: "+225", label: "ساحل العاج", labelEn: "Ivory Coast" },
  { code: "+385", label: "كرواتيا", labelEn: "Croatia" },
  { code: "+53", label: "كوبا", labelEn: "Cuba" },
  { code: "+357", label: "قبرص", labelEn: "Cyprus" },
  { code: "+420", label: "التشيك", labelEn: "Czechia" },
  { code: "+45", label: "الدنمارك", labelEn: "Denmark" },
  { code: "+253", label: "جيبوتي", labelEn: "Djibouti" },
  { code: "+1767", label: "دومينيكا", labelEn: "Dominica" },
  { code: "+1809", label: "جمهورية الدومينيكان", labelEn: "Dominican Republic" },
  { code: "+670", label: "تيمور الشرقية", labelEn: "Timor-Leste" },
  { code: "+593", label: "الإكوادور", labelEn: "Ecuador" },
  { code: "+503", label: "السلفادور", labelEn: "El Salvador" },
  { code: "+240", label: "غينيا الاستوائية", labelEn: "Equatorial Guinea" },
  { code: "+291", label: "إريتريا", labelEn: "Eritrea" },
  { code: "+372", label: "إستونيا", labelEn: "Estonia" },
  { code: "+268", label: "إسواتيني", labelEn: "Eswatini" },
  { code: "+251", label: "إثيوبيا", labelEn: "Ethiopia" },
  { code: "+679", label: "فيجي", labelEn: "Fiji" },
  { code: "+358", label: "فنلندا", labelEn: "Finland" },
  { code: "+33", label: "فرنسا", labelEn: "France" },
  { code: "+241", label: "الغابون", labelEn: "Gabon" },
  { code: "+220", label: "غامبيا", labelEn: "Gambia" },
  { code: "+995", label: "جورجيا", labelEn: "Georgia" },
  { code: "+49", label: "ألمانيا", labelEn: "Germany" },
  { code: "+233", label: "غانا", labelEn: "Ghana" },
  { code: "+30", label: "اليونان", labelEn: "Greece" },
  { code: "+1473", label: "غرينادا", labelEn: "Grenada" },
  { code: "+502", label: "غواتيمالا", labelEn: "Guatemala" },
  { code: "+224", label: "غينيا", labelEn: "Guinea" },
  { code: "+245", label: "غينيا بيساو", labelEn: "Guinea-Bissau" },
  { code: "+592", label: "غيانا", labelEn: "Guyana" },
  { code: "+509", label: "هايتي", labelEn: "Haiti" },
  { code: "+504", label: "هندوراس", labelEn: "Honduras" },
  { code: "+36", label: "المجر", labelEn: "Hungary" },
  { code: "+354", label: "آيسلندا", labelEn: "Iceland" },
  { code: "+91", label: "الهند", labelEn: "India" },
  { code: "+62", label: "إندونيسيا", labelEn: "Indonesia" },
  { code: "+98", label: "إيران", labelEn: "Iran" },
  { code: "+353", label: "أيرلندا", labelEn: "Ireland" },
  { code: "+972", label: "إسرائيل", labelEn: "Israel" },
  { code: "+39", label: "إيطاليا", labelEn: "Italy" },
  { code: "+1876", label: "جامايكا", labelEn: "Jamaica" },
  { code: "+81", label: "اليابان", labelEn: "Japan" },
  { code: "+254", label: "كينيا", labelEn: "Kenya" },
  { code: "+686", label: "كيريباتي", labelEn: "Kiribati" },
  { code: "+383", label: "كوسوفو", labelEn: "Kosovo" },
  { code: "+996", label: "قيرغيزستان", labelEn: "Kyrgyzstan" },
  { code: "+856", label: "لاوس", labelEn: "Laos" },
  { code: "+371", label: "لاتفيا", labelEn: "Latvia" },
  { code: "+231", label: "ليبيريا", labelEn: "Liberia" },
  { code: "+423", label: "ليختنشتاين", labelEn: "Liechtenstein" },
  { code: "+370", label: "ليتوانيا", labelEn: "Lithuania" },
  { code: "+352", label: "لوكسمبورغ", labelEn: "Luxembourg" },
  { code: "+261", label: "مدغشقر", labelEn: "Madagascar" },
  { code: "+265", label: "مالاوي", labelEn: "Malawi" },
  { code: "+60", label: "ماليزيا", labelEn: "Malaysia" },
  { code: "+960", label: "المالديف", labelEn: "Maldives" },
  { code: "+223", label: "مالي", labelEn: "Mali" },
  { code: "+356", label: "مالطا", labelEn: "Malta" },
  { code: "+692", label: "جزر مارشال", labelEn: "Marshall Islands" },
  { code: "+222", label: "موريتانيا", labelEn: "Mauritania" },
  { code: "+230", label: "موريشيوس", labelEn: "Mauritius" },
  { code: "+52", label: "المكسيك", labelEn: "Mexico" },
  { code: "+691", label: "ميكرونيزيا", labelEn: "Micronesia" },
  { code: "+373", label: "مولدوفا", labelEn: "Moldova" },
  { code: "+377", label: "موناكو", labelEn: "Monaco" },
  { code: "+976", label: "منغوليا", labelEn: "Mongolia" },
  { code: "+382", label: "الجبل الأسود", labelEn: "Montenegro" },
  { code: "+258", label: "موزمبيق", labelEn: "Mozambique" },
  { code: "+95", label: "ميانمار", labelEn: "Myanmar" },
  { code: "+264", label: "ناميبيا", labelEn: "Namibia" },
  { code: "+674", label: "ناورو", labelEn: "Nauru" },
  { code: "+977", label: "نيبال", labelEn: "Nepal" },
  { code: "+31", label: "هولندا", labelEn: "Netherlands" },
  { code: "+64", label: "نيوزيلندا", labelEn: "New Zealand" },
  { code: "+505", label: "نيكاراغوا", labelEn: "Nicaragua" },
  { code: "+227", label: "النيجر", labelEn: "Niger" },
  { code: "+234", label: "نيجيريا", labelEn: "Nigeria" },
  { code: "+850", label: "كوريا الشمالية", labelEn: "North Korea" },
  { code: "+389", label: "مقدونيا الشمالية", labelEn: "North Macedonia" },
  { code: "+47", label: "النرويج", labelEn: "Norway" },
  { code: "+92", label: "باكستان", labelEn: "Pakistan" },
  { code: "+680", label: "بالاو", labelEn: "Palau" },
  { code: "+507", label: "بنما", labelEn: "Panama" },
  { code: "+675", label: "بابوا غينيا الجديدة", labelEn: "Papua New Guinea" },
  { code: "+595", label: "باراغواي", labelEn: "Paraguay" },
  { code: "+51", label: "بيرو", labelEn: "Peru" },
  { code: "+63", label: "الفلبين", labelEn: "Philippines" },
  { code: "+48", label: "بولندا", labelEn: "Poland" },
  { code: "+351", label: "البرتغال", labelEn: "Portugal" },
  { code: "+40", label: "رومانيا", labelEn: "Romania" },
  { code: "+7", label: "روسيا", labelEn: "Russia" },
  { code: "+250", label: "رواندا", labelEn: "Rwanda" },
  { code: "+1869", label: "سانت كيتس ونيفيس", labelEn: "Saint Kitts and Nevis" },
  { code: "+1758", label: "سانت لوسيا", labelEn: "Saint Lucia" },
  { code: "+1784", label: "سانت فنسنت والغرينادين", labelEn: "Saint Vincent and the Grenadines" },
  { code: "+685", label: "ساموا", labelEn: "Samoa" },
  { code: "+378", label: "سان مارينو", labelEn: "San Marino" },
  { code: "+239", label: "ساو تومي وبرينسيبي", labelEn: "Sao Tome and Principe" },
  { code: "+221", label: "السنغال", labelEn: "Senegal" },
  { code: "+381", label: "صربيا", labelEn: "Serbia" },
  { code: "+248", label: "سيشل", labelEn: "Seychelles" },
  { code: "+232", label: "سيراليون", labelEn: "Sierra Leone" },
  { code: "+65", label: "سنغافورة", labelEn: "Singapore" },
  { code: "+421", label: "سلوفاكيا", labelEn: "Slovakia" },
  { code: "+386", label: "سلوفينيا", labelEn: "Slovenia" },
  { code: "+677", label: "جزر سليمان", labelEn: "Solomon Islands" },
  { code: "+252", label: "الصومال", labelEn: "Somalia" },
  { code: "+27", label: "جنوب أفريقيا", labelEn: "South Africa" },
  { code: "+82", label: "كوريا الجنوبية", labelEn: "South Korea" },
  { code: "+211", label: "جنوب السودان", labelEn: "South Sudan" },
  { code: "+34", label: "إسبانيا", labelEn: "Spain" },
  { code: "+94", label: "سريلانكا", labelEn: "Sri Lanka" },
  { code: "+597", label: "سورينام", labelEn: "Suriname" },
  { code: "+46", label: "السويد", labelEn: "Sweden" },
  { code: "+41", label: "سويسرا", labelEn: "Switzerland" },
  { code: "+886", label: "تايوان", labelEn: "Taiwan" },
  { code: "+992", label: "طاجيكستان", labelEn: "Tajikistan" },
  { code: "+255", label: "تنزانيا", labelEn: "Tanzania" },
  { code: "+66", label: "تايلاند", labelEn: "Thailand" },
  { code: "+228", label: "توغو", labelEn: "Togo" },
  { code: "+676", label: "تونغا", labelEn: "Tonga" },
  { code: "+1868", label: "ترينيداد وتوباغو", labelEn: "Trinidad and Tobago" },
  { code: "+90", label: "تركيا", labelEn: "Turkey" },
  { code: "+993", label: "تركمانستان", labelEn: "Turkmenistan" },
  { code: "+688", label: "توفالو", labelEn: "Tuvalu" },
  { code: "+256", label: "أوغندا", labelEn: "Uganda" },
  { code: "+380", label: "أوكرانيا", labelEn: "Ukraine" },
  { code: "+44", label: "بريطانيا", labelEn: "United Kingdom" },
  { code: "+1", label: "الولايات المتحدة", labelEn: "United States" },
  { code: "+598", label: "أوروغواي", labelEn: "Uruguay" },
  { code: "+998", label: "أوزبكستان", labelEn: "Uzbekistan" },
  { code: "+678", label: "فانواتو", labelEn: "Vanuatu" },
  { code: "+379", label: "الفاتيكان", labelEn: "Vatican City" },
  { code: "+58", label: "فنزويلا", labelEn: "Venezuela" },
  { code: "+84", label: "فيتنام", labelEn: "Vietnam" },
  { code: "+260", label: "زامبيا", labelEn: "Zambia" },
  { code: "+263", label: "زيمبابوي", labelEn: "Zimbabwe" },
];

function splitPhone(value: string) {
  const trimmed = value.trim();
  const plusMatches = COUNTRY_CODES.filter((c) => trimmed.startsWith(c.code));
  const plusMatch = plusMatches.sort((a, b) => b.code.length - a.code.length)[0];
  if (plusMatch) {
    return { dialCode: plusMatch.code, number: trimmed.slice(plusMatch.code.length).replace(/[^\d]/g, "") };
  }
  const digitsOnly = trimmed.replace(/[^\d]/g, "");
  const digitMatches = COUNTRY_CODES.filter((c) => {
    const codeDigits = c.code.slice(1);
    return digitsOnly.startsWith(codeDigits) && digitsOnly.length - codeDigits.length >= 7;
  });
  const digitMatch = digitMatches.sort((a, b) => b.code.length - a.code.length)[0];
  if (digitMatch) {
    return { dialCode: digitMatch.code, number: digitsOnly.slice(digitMatch.code.length - 1) };
  }
  return { dialCode: COUNTRY_CODES[0].code, number: digitsOnly };
}

const SIZE_CLASSES = {
  md: {
    select: "rounded-xl border border-neutral-200 bg-neutral-50 px-2 text-sm focus:border-brand-500 focus:outline-none",
    input: "rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none",
  },
  sm: {
    select: "rounded-lg border border-neutral-200 bg-white px-2 text-sm focus:border-brand-500 focus:outline-none",
    input: "rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none",
  },
};

export function PhoneInput({
  value,
  onChange,
  placeholder = "9xxx xxxx",
  size = "md",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  size?: "md" | "sm";
}) {
  const { t } = useLanguage();
  const { dialCode, number } = splitPhone(value);
  const classes = SIZE_CLASSES[size];

  function update(nextDialCode: string, nextNumber: string) {
    const digits = nextNumber.replace(/[^\d]/g, "");
    onChange(digits ? `${nextDialCode} ${digits}` : "");
  }

  return (
    <div className="flex gap-2">
      <select
        value={dialCode}
        onChange={(e) => update(e.target.value, number)}
        dir="ltr"
        className={classes.select}
      >
        {COUNTRY_CODES.map((c, i) => (
          <option key={`${c.code}-${i}`} value={c.code}>
            {c.code} {t(c.label, c.labelEn)}
          </option>
        ))}
      </select>
      <input
        value={number}
        onChange={(e) => update(dialCode, e.target.value)}
        placeholder={placeholder}
        dir="ltr"
        inputMode="numeric"
        className={`flex-1 ${classes.input}`}
      />
    </div>
  );
}

/**
 * MawashiDZ — محرك بورصة المواشي (مرجع وطني + تذبذب كل ثانية)
 * يُستخدم من prices.mjs ومن assets/market-engine.js (نسخة متطابقة).
 */

export const MDZ_PRODUCTS = [
  { id: 'sheep_meat', category: 'meat', base: 3100, spread: 0.14, source: 'https://madr.gov.dz', sourceName: 'وزارة الفلاحة' },
  { id: 'beef', category: 'meat', base: 2450, spread: 0.12, source: 'https://madr.gov.dz', sourceName: 'وزارة الفلاحة' },
  { id: 'goat_meat', category: 'meat', base: 2900, spread: 0.13, source: 'https://madr.gov.dz', sourceName: 'وزارة الفلاحة' },
  { id: 'cow_milk', category: 'milk', base: 95, spread: 0.10, source: 'https://madr.gov.dz', sourceName: 'وزارة الفلاحة' },
  { id: 'goat_milk', category: 'milk', base: 175, spread: 0.11, source: 'https://madr.gov.dz', sourceName: 'وزارة الفلاحة' },
  { id: 'camel_milk', category: 'milk', base: 265, spread: 0.12, source: 'https://madr.gov.dz', sourceName: 'وزارة الفلاحة' },
  { id: 'barley', category: 'feed', base: 52, spread: 0.11, source: 'https://madr.gov.dz', sourceName: 'وزارة الفلاحة' },
  { id: 'corn', category: 'feed', base: 46, spread: 0.10, source: 'https://madr.gov.dz', sourceName: 'وزارة الفلاحة' },
  { id: 'bran', category: 'feed', base: 38, spread: 0.09, source: 'https://madr.gov.dz', sourceName: 'وزارة الفلاحة' },
];

export const MDZ_WILAYAS = [
  { code: '01', name: 'أدرار' }, { code: '02', name: 'الشلف' }, { code: '03', name: 'الأغواط' },
  { code: '04', name: 'أم البواقي' }, { code: '05', name: 'باتنة' }, { code: '06', name: 'بجاية' },
  { code: '07', name: 'بسكرة' }, { code: '08', name: 'بشار' }, { code: '09', name: 'البليدة' },
  { code: '10', name: 'البويرة' }, { code: '11', name: 'تمنراست' }, { code: '12', name: 'تبسة' },
  { code: '13', name: 'تلمسان' }, { code: '14', name: 'تيارت' }, { code: '15', name: 'تيزي وزو' },
  { code: '16', name: 'الجزائر' }, { code: '17', name: 'الجلفة' }, { code: '18', name: 'جيجل' },
  { code: '19', name: 'سطيف' }, { code: '20', name: 'سعيدة' }, { code: '21', name: 'سكيكدة' },
  { code: '22', name: 'سيدي بلعباس' }, { code: '23', name: 'عنابة' }, { code: '24', name: 'قالمة' },
  { code: '25', name: 'قسنطينة' }, { code: '26', name: 'المدية' }, { code: '27', name: 'مستغانم' },
  { code: '28', name: 'المسيلة' }, { code: '29', name: 'معسكر' }, { code: '30', name: 'ورقلة' },
  { code: '31', name: 'وهران' }, { code: '32', name: 'البيض' }, { code: '33', name: 'إليزي' },
  { code: '34', name: 'برج بوعريريج' }, { code: '35', name: 'بومرداس' }, { code: '36', name: 'الطارف' },
  { code: '37', name: 'تندوف' }, { code: '38', name: 'تيسمسيلت' }, { code: '39', name: 'الوادي' },
  { code: '40', name: 'خنشلة' }, { code: '41', name: 'سوق أهراس' }, { code: '42', name: 'تيبازة' },
  { code: '43', name: 'ميلة' }, { code: '44', name: 'عين الدفلى' }, { code: '45', name: 'النعامة' },
  { code: '46', name: 'عين تموشنت' }, { code: '47', name: 'غرداية' }, { code: '48', name: 'غليزان' },
  { code: '49', name: 'تيميمون' }, { code: '50', name: 'برج باجي مختار' }, { code: '51', name: 'أولاد جلال' },
  { code: '52', name: 'بني عباس' }, { code: '53', name: 'عين صالح' }, { code: '54', name: 'عين قزام' },
  { code: '55', name: 'تقرت' }, { code: '56', name: 'جانت' }, { code: '57', name: 'المغير' },
  { code: '58', name: 'المنيعة' },
];

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function wilayaFactor(code) {
  const h = hashSeed(`wilaya-${code}`);
  return 0.88 + h * 0.24;
}

function tickDelta(productId, wilayaCode, tickBucket) {
  const a = hashSeed(`${productId}-${wilayaCode}-${tickBucket}`) * Math.PI * 2;
  const b = hashSeed(`${wilayaCode}-${productId}-${tickBucket - 1}`) * Math.PI * 2;
  return Math.sin(a) * 0.002 + Math.sin(b) * 0.0012;
}

function roundPrice(value, category) {
  if (category === 'feed' || category === 'milk') return Math.round(value);
  return Math.round(value / 10) * 10;
}

function unitForCategory(category) {
  return category === 'milk' ? 'DZD/L' : 'DZD/kg';
}

export function buildMarketSnapshot(tickBucket = Math.floor(Date.now() / 1000)) {
  const rows = [];
  for (const w of MDZ_WILAYAS) {
    for (const p of MDZ_PRODUCTS) {
      const factor = wilayaFactor(w.code);
      const delta = tickDelta(p.id, w.code, tickBucket);
      const prevDelta = tickDelta(p.id, w.code, tickBucket - 1);
      const price = roundPrice(p.base * factor * (1 + delta), p.category);
      const prevPrice = roundPrice(p.base * factor * (1 + prevDelta), p.category);
      const changePct = prevPrice ? ((price - prevPrice) / prevPrice) * 100 : 0;
      rows.push({
        wilayaCode: w.code,
        wilaya: w.name,
        productId: p.id,
        category: p.category,
        price,
        unit: unitForCategory(p.category),
        changePct: Math.round(changePct * 100) / 100,
        source: p.source,
        sourceName: p.sourceName,
      });
    }
  }

  const cheapestByProduct = {};
  for (const p of MDZ_PRODUCTS) {
    const subset = rows.filter((r) => r.productId === p.id);
    const min = subset.reduce((a, b) => (a.price <= b.price ? a : b));
    cheapestByProduct[p.id] = { wilaya: min.wilaya, wilayaCode: min.wilayaCode, price: min.price };
  }

  return {
    updatedAt: new Date(tickBucket * 1000).toISOString(),
    tickBucket,
    secondBucket: tickBucket,
    minuteBucket: Math.floor(tickBucket / 60),
    products: MDZ_PRODUCTS.map((p) => ({ id: p.id, category: p.category })),
    rows,
    cheapestByProduct,
  };
}

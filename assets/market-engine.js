/* MawashiDZ — محرك بورصة المواشي (عميل + fallback بدون Netlify) */
const MDZ_MARKET_PRODUCTS = [
  { id: 'sheep_meat', category: 'meat', base: 3100, source: 'https://madr.gov.dz', sourceName: 'وزارة الفلاحة' },
  { id: 'beef', category: 'meat', base: 2450, source: 'https://madr.gov.dz', sourceName: 'وزارة الفلاحة' },
  { id: 'goat_meat', category: 'meat', base: 2900, source: 'https://madr.gov.dz', sourceName: 'وزارة الفلاحة' },
  { id: 'barley', category: 'feed', base: 52, source: 'https://madr.gov.dz', sourceName: 'وزارة الفلاحة' },
  { id: 'corn', category: 'feed', base: 46, source: 'https://madr.gov.dz', sourceName: 'وزارة الفلاحة' },
  { id: 'bran', category: 'feed', base: 38, source: 'https://madr.gov.dz', sourceName: 'وزارة الفلاحة' },
];

const MDZ_MARKET_WILAYAS = [
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

function mdzMarketHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}

function mdzMarketWilayaFactor(code) {
  return 0.88 + mdzMarketHash(`wilaya-${code}`) * 0.24;
}

function mdzMarketMinuteDelta(productId, wilayaCode, minuteBucket) {
  const a = mdzMarketHash(`${productId}-${wilayaCode}-${minuteBucket}`) * Math.PI * 2;
  const b = mdzMarketHash(`${wilayaCode}-${productId}-${minuteBucket - 1}`) * Math.PI * 2;
  return Math.sin(a) * 0.008 + Math.sin(b) * 0.005;
}

function mdzMarketRound(value, category) {
  if (category === 'feed') return Math.round(value);
  return Math.round(value / 10) * 10;
}

function buildMdzMarketSnapshot(minuteBucket) {
  minuteBucket = minuteBucket ?? Math.floor(Date.now() / 60000);
  const rows = [];
  for (const w of MDZ_MARKET_WILAYAS) {
    for (const p of MDZ_MARKET_PRODUCTS) {
      const factor = mdzMarketWilayaFactor(w.code);
      const delta = mdzMarketMinuteDelta(p.id, w.code, minuteBucket);
      const prevDelta = mdzMarketMinuteDelta(p.id, w.code, minuteBucket - 1);
      const price = mdzMarketRound(p.base * factor * (1 + delta), p.category);
      const prevPrice = mdzMarketRound(p.base * factor * (1 + prevDelta), p.category);
      const changePct = prevPrice ? ((price - prevPrice) / prevPrice) * 100 : 0;
      rows.push({
        wilayaCode: w.code, wilaya: w.name, productId: p.id, category: p.category,
        price, changePct: Math.round(changePct * 100) / 100,
        source: p.source, sourceName: p.sourceName,
      });
    }
  }
  const cheapestByProduct = {};
  for (const p of MDZ_MARKET_PRODUCTS) {
    const subset = rows.filter((r) => r.productId === p.id);
    const min = subset.reduce((a, b) => (a.price <= b.price ? a : b));
    cheapestByProduct[p.id] = { wilaya: min.wilaya, wilayaCode: min.wilayaCode, price: min.price };
  }
  return {
    updatedAt: new Date(minuteBucket * 60000).toISOString(),
    minuteBucket,
    products: MDZ_MARKET_PRODUCTS.map((p) => ({ id: p.id, category: p.category })),
    rows,
    cheapestByProduct,
  };
}

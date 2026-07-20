/* MawashiDZ — Arabic corrections for wilaya / daira / commune names (ONS + verified forms) */
const MDZ_ARABIC_LOCATION_FIXES = {
  'اقبلي': 'أقبلي',
  'اقبيل': 'أقبيل',
  'اغرم': 'إغرام',
  'ابلسة': 'أبلعة',
  'اربوات': 'أربوات',
  'اعميرة اراس': 'عميرة أراس',
  'امجدل': 'أمجدل',
  'اميه وانسة': 'أمية ونسة',
  'انسيغة': 'أنسيغة',
  'انقوسة': 'النقوسة',
  'ايت تيزي': 'آيت تيزي',
  'اولاد سلامة': 'أولاد سلامة',
  'اولاد شبل': 'أولاد شبل',
  'اولاد فايت': 'أولاد فايت',
  'سيدي امحمد': 'سيدي أمحمد',
  'سيدي امحمد بن عودة': 'سيدي أمحمد بن عودة',
  'ابن عكنون': 'بن عكنون',
  'عوامري': 'وامري',
  'أولاد ابراهيم': 'أولاد إبراهيم',
  'أولاد سيدي ابراهيم': 'أولاد سيدي إبراهيم',
  'مصطفى بن ابراهيم': 'مصطفى بن إبراهيم',
};

function normalizeArabicLocationName(name) {
  if (name == null) return '';
  let n = String(name).trim().replace(/\s+/g, ' ');
  if (!n) return '';
  if (MDZ_ARABIC_LOCATION_FIXES[n]) return MDZ_ARABIC_LOCATION_FIXES[n];
  n = n.replace(/سيدي امحمد/g, 'سيدي أمحمد');
  n = n.replace(/^اولاد /g, 'أولاد ');
  n = n.replace(/^ايت /g, 'آيت ');
  n = n.replace(/ابراهيم/g, 'إبراهيم');
  return n;
}

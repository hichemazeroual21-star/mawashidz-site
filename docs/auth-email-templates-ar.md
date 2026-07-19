# قوالب البريد العربية — Supabase Auth

هذه الخطوات يدوية داخل لوحة Supabase. لا تُنفَّذ تلقائيًا.

## 1) Redirect URLs
Auth → URL Configuration → Redirect URLs، أضف:
- `https://mawashidz.com/**`
- `https://mawashidz.com`
- أي نطاق Preview تستخدمه للتجربة

Site URL الموصى به: `https://mawashidz.com`

## 2) Confirm signup (تأكيد البريد)

Auth → Emails → Confirm signup

**Subject**
```
أكد بريدك لتفعيل حسابك في MawashiDZ
```

**Body (HTML)**
```html
<h2 style="font-family:Tahoma,Arial,sans-serif;color:#123326">مرحبًا {{ .Data.first_name }}،</h2>
<p style="font-family:Tahoma,Arial,sans-serif;line-height:1.8;color:#24362d">
يسعدنا انضمامك إلى <strong>MawashiDZ</strong>
بصفة: <strong>{{ .Data.role_label }}</strong>.
</p>
<p style="font-family:Tahoma,Arial,sans-serif;line-height:1.8;color:#24362d">
رقم متابعة طلبك: <strong>{{ .Data.registration_id }}</strong><br>
يُخصَّص رقم عضويتك تلقائيًا من النظام ويظهر داخل حسابك بعد التفعيل.
</p>
<p style="font-family:Tahoma,Arial,sans-serif;margin:24px 0">
  <a href="{{ .ConfirmationURL }}"
     style="background:#0d5a3e;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">
    تأكيد البريد وتفعيل الدخول
  </a>
</p>
<p style="font-family:Tahoma,Arial,sans-serif;color:#5a6d63;font-size:14px">
إذا لم تطلب إنشاء حساب، تجاهل هذه الرسالة.<br>
فريق MawashiDZ
</p>
```

## 3) Reset password
Subject: `استرجاع كلمة المرور — MawashiDZ`  
استخدم `{{ .ConfirmationURL }}` بنفس أسلوب الزر الأخضر أعلاه.

## 4) بعد التأكيد
الواجهة تقرأ `#access_token=...` من رابط التأكيد، تحفظ الجلسة، وتفتح لوحة «حسابي».

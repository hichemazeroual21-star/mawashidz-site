/**
 * MawashiDZ registration orchestration — testable, decoupled from DOM.
 * Success = auth account created (profile via DB trigger).
 * Email / founding registrations row failures do not flip success to failure.
 */

export const REGISTRATION_ERROR = {
  DUPLICATE_EMAIL: 'DUPLICATE_EMAIL',
  DUPLICATE_PHONE: 'DUPLICATE_PHONE',
  DUPLICATE_REGISTRATION: 'DUPLICATE_REGISTRATION',
  AUTH_FAILED: 'AUTH_FAILED',
  VALIDATION: 'VALIDATION',
  NETWORK: 'NETWORK',
  REGISTRATION_ROW_FAILED: 'REGISTRATION_ROW_FAILED',
};

export function isAuthDuplicateError(error) {
  const text = String(error?.message || error?.error_description || '').toLowerCase();
  return (
    text.includes('already registered')
    || text.includes('user already registered')
    || text.includes('email address is already registered')
    || error?.status === 422 && text.includes('already')
  );
}

export function isRegistrationDuplicateError(error) {
  return error?.code === '23505' || error?.status === 409;
}

export function isNetworkError(error) {
  return error?.name === 'AbortError' || error instanceof TypeError;
}

/**
 * Map Postgres / PostgREST duplicate errors to user-facing Arabic messages.
 * Never returns a phone/email duplicate message for unrelated errors.
 */
export function duplicateRegistrationMessage(error) {
  if (!isRegistrationDuplicateError(error)) return '';

  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();

  if (text.includes('email') || text.includes('registrations_email')) {
    return 'هذا البريد الإلكتروني مسجل من قبل.';
  }
  if (text.includes('phone') || text.includes('registrations_phone')) {
    return 'رقم الهاتف هذا مسجل من قبل.';
  }
  return 'هذا البريد الإلكتروني أو رقم الهاتف مسجل من قبل.';
}

export function authDuplicateMessage() {
  return 'هذا البريد الإلكتروني مرتبط بحساب موجود. يمكنك تسجيل الدخول أو استرجاع كلمة المرور.';
}

export function registrationFailureMessage(error) {
  if (isNetworkError(error)) {
    return 'تعذر الاتصال بالخادم الآن. أعد المحاولة بعد لحظات.';
  }
  const duplicate = duplicateRegistrationMessage(error);
  if (duplicate) return duplicate;
  return `تعذر حفظ الطلب (${error?.status || 'خطأ غير معروف'}).`;
}

export const EMAIL_WARNING_AR =
  'تم التسجيل بنجاح، لكن تعذر إرسال رسالة التأكيد.';

export const REGISTRATION_ROW_WARNING_AR =
  'تم إنشاء حسابك بنجاح. تعذر حفظ نسخة الطلب في سجل التسجيل — احتفظ برقم عضويتك وتواصل مع الدعم عند الحاجة.';

/**
 * @param {object} deps
 * @param {Function} deps.signUpAccount
 * @param {Function} deps.memberIdAfterSignup
 * @param {Function} deps.supabaseInsert
 * @param {Function} deps.sendRegistrationEmail
 * @param {object} context
 * @param {string} context.email
 * @param {string} context.password
 * @param {object} context.authMetadata
 * @param {object} context.registrationPayload
 * @param {object} context.emailData
 */
export async function runRegistrationPipeline(deps, context) {
  const {
    signUpAccount,
    memberIdAfterSignup,
    supabaseInsert,
    sendRegistrationEmail,
  } = deps;

  const result = {
    success: false,
    accountCreated: false,
    registrationSaved: false,
    emailSent: false,
    emailSkipped: false,
    emailWarning: null,
    registrationWarning: null,
    authResult: null,
    memberId: null,
    error: null,
    duplicateKind: null,
  };

  // --- Phase 1: Auth signup (never auto-retried inside this function) ---
  try {
    result.authResult = await signUpAccount(
      context.email,
      context.password,
      context.authMetadata,
    );
    result.accountCreated = true;
  } catch (authError) {
    if (isAuthDuplicateError(authError)) {
      result.error = {
        code: REGISTRATION_ERROR.DUPLICATE_EMAIL,
        message: authDuplicateMessage(),
        cause: authError,
      };
      result.duplicateKind = 'email';
      // Account may exist from a prior partial attempt — try founding row only.
      try {
        await supabaseInsert('registrations', context.registrationPayload);
        result.registrationSaved = true;
        result.success = true;
        result.registrationWarning =
          'تم العثور على حساب موجود مسبقًا. أُكمل حفظ طلب التسجيل — يمكنك تسجيل الدخول.';
      } catch (regError) {
        const dupMsg = duplicateRegistrationMessage(regError);
        if (dupMsg) {
          result.error = {
            code: dupMsg.includes('هاتف')
              ? REGISTRATION_ERROR.DUPLICATE_PHONE
              : REGISTRATION_ERROR.DUPLICATE_REGISTRATION,
            message: dupMsg,
            cause: regError,
          };
          result.duplicateKind = dupMsg.includes('هاتف') ? 'phone' : 'registration';
        } else {
          result.error = {
            code: REGISTRATION_ERROR.DUPLICATE_EMAIL,
            message: authDuplicateMessage(),
            cause: authError,
          };
        }
      }
      return finalizeEmail(deps, context, result);
    }

    result.error = {
      code: isNetworkError(authError) ? REGISTRATION_ERROR.NETWORK : REGISTRATION_ERROR.AUTH_FAILED,
      message: isNetworkError(authError)
        ? 'تعذر الاتصال بالخادم الآن. أعد المحاولة بعد لحظات.'
        : String(authError?.message || 'تعذر إنشاء الحساب.'),
      cause: authError,
    };
    return result;
  }

  // --- Phase 2: member_id from server ---
  result.memberId = await memberIdAfterSignup(result.authResult);

  // Enrich founding registration payload with server-assigned member_id when available.
  const registrationPayload = { ...context.registrationPayload };
  if (result.memberId && registrationPayload.message) {
    try {
      const extra = JSON.parse(registrationPayload.message);
      extra.member_id = result.memberId;
      extra.member_id_sequential = true;
      registrationPayload.message = JSON.stringify(extra);
    } catch {
      /* keep original message if not JSON */
    }
  }

  // --- Phase 3: founding registrations row (secondary; must not undo account success) ---
  try {
    await supabaseInsert('registrations', registrationPayload);
    result.registrationSaved = true;
  } catch (regError) {
    console.error('Registration row save failed after account creation', regError);
    if (isRegistrationDuplicateError(regError)) {
      // Likely a prior timeout/double-submit — treat as saved, surface specific duplicate text.
      result.registrationSaved = true;
      const dupMsg = duplicateRegistrationMessage(regError);
      if (dupMsg) {
        result.registrationWarning = dupMsg;
      }
    } else {
      result.registrationWarning = REGISTRATION_ROW_WARNING_AR;
    }
  }

  result.success = result.accountCreated;
  const emailContext = {
    ...context,
    emailData: {
      ...context.emailData,
      member_id: result.memberId || context.emailData?.member_id || null,
    },
  };
  return finalizeEmail(deps, emailContext, result);
}

async function finalizeEmail(deps, context, result) {
  if (!result.success) return result;

  const { sendRegistrationEmail } = deps;
  try {
    const emailOutcome = await sendRegistrationEmail(context.emailData);
    if (emailOutcome?.skipped) {
      result.emailSkipped = true;
    } else {
      result.emailSent = true;
    }
  } catch (emailError) {
    console.error('Admin registration email failed', emailError);
    result.emailWarning = EMAIL_WARNING_AR;
  }
  return result;
}

export function buildSuccessConfirmHtml({
  memberId,
  registrationId,
  email,
  memberInviteCode,
  inviteUrl,
  authSession,
  emailWarning,
  registrationWarning,
  safeText,
}) {
  const memberIdLabel = memberId
    ? `<span dir="ltr">${memberId}</span>`
    : 'سيصلك في رسالة التأكيد وفي حسابك بعد الدخول';

  const warnings = [
    registrationWarning ? `<div class="success-warn">⚠️ ${registrationWarning}</div>` : '',
    emailWarning ? `<div class="success-warn">⚠️ ${emailWarning}</div>` : '',
  ].filter(Boolean).join('');

  return `<div class="success-mark">✓</div><div class="success-title">أهلًا بك ضمن مجتمع MawashiDZ</div><div class="success-copy">تم استلام طلبك بنجاح وهو الآن قيد المراجعة المهنية. رقم الطلب مخصص لمتابعة ملفك، أما كود الدعوة فهو لمشاركة المنصة واحتساب مساهمتك.</div><div class="success-id">رقم عضويتك: ${memberIdLabel}</div><div class="success-id">رقم متابعة الطلب: ${registrationId}</div>${warnings}<div class="auth-status ${authSession ? 'ok' : ''}">${authSession ? 'تم تفعيل جلسة حسابك ويمكنك الدخول الآن.' : 'افتح رسالة MawashiDZ لتأكيد بريدك وتفعيل الدخول. ستجد فيها صفتك ورقم عضويتك ورقم الطلب.'}</div><div class="invite-panel"><div class="invite-label">كود دعوتك الشخصي</div><div class="invite-code">${memberInviteCode}</div><div class="invite-actions"><button type="button" id="copyInviteCode">نسخ الكود</button><button type="button" id="shareInviteLink">مشاركة رابط الدعوة</button></div></div><div class="success-mail">✉ أرسلنا رسالة تأكيد واحدة إلى ${safeText(email, 254)}</div>`;
}

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
  RATE_LIMITED: 'RATE_LIMITED',
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

/**
 * Supabase built-in SMTP throttles confirmation emails (HTTP 429,
 * error_code=over_email_send_rate_limit). Signup is rejected — no account
 * is created — so this must be surfaced as a clear retry-later message.
 */
export function isRateLimitError(error) {
  const text = String(error?.message || error?.error_description || '').toLowerCase();
  return error?.status === 429 || text.includes('rate limit');
}

export const RATE_LIMIT_MESSAGE_AR =
  'وصل الخادم إلى الحد المؤقت لإرسال رسائل التأكيد. لم يُنشأ حسابك بعد — انتظر نحو ساعة ثم أعد المحاولة بنفس البريد. الطلبات المتكررة لا تسرّع القبول.';

export function isNetworkError(error) {
  return error?.name === 'AbortError' || error instanceof TypeError;
}

/** Enumeration-safe message for auth/registration conflicts (no phone/email disclosure). */
export const GENERIC_CONFLICT_MESSAGE_AR =
  'لا يمكن إكمال التسجيل بهذه البيانات. إن كان لديك حساب بالفعل، جرّب تسجيل الدخول أو استرجاع كلمة المرور.';

export const REGISTRATION_RECOVERY_WARNING_AR =
  'تم العثور على حساب أو طلب سابق. أُكمل حفظ الطلب — يمكنك تسجيل الدخول للمتابعة.';

/**
 * Map Postgres / PostgREST duplicate errors to user-facing Arabic messages.
 * Returns a single generic conflict text — never reveals which field collided.
 */
export function duplicateRegistrationMessage(error) {
  if (!isRegistrationDuplicateError(error)) return '';
  return GENERIC_CONFLICT_MESSAGE_AR;
}

export function authDuplicateMessage() {
  return GENERIC_CONFLICT_MESSAGE_AR;
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
    if (isRateLimitError(authError)) {
      result.error = {
        code: REGISTRATION_ERROR.RATE_LIMITED,
        message: RATE_LIMIT_MESSAGE_AR,
        cause: authError,
      };
      return result;
    }
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
        result.registrationWarning = REGISTRATION_RECOVERY_WARNING_AR;
      } catch (regError) {
        const dupMsg = duplicateRegistrationMessage(regError);
        if (dupMsg) {
          const text = `${regError?.message || ''} ${regError?.details || ''}`.toLowerCase();
          result.error = {
            code: text.includes('phone') || text.includes('registrations_phone')
              ? REGISTRATION_ERROR.DUPLICATE_PHONE
              : REGISTRATION_ERROR.DUPLICATE_REGISTRATION,
            message: dupMsg,
            cause: regError,
          };
          result.duplicateKind = text.includes('phone') ? 'phone' : 'registration';
        } else {
          result.error = {
            code: REGISTRATION_ERROR.DUPLICATE_EMAIL,
            message: authDuplicateMessage(),
            cause: authError,
          };
        }
      }
      // Recovery path: the original submission already notified the admin.
      // Re-sending here spams the inbox on every duplicate resubmit.
      result.emailSkipped = true;
      return result;
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
      result.registrationWarning = REGISTRATION_RECOVERY_WARNING_AR;
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

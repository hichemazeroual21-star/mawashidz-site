/**
 * Admin mutations — Supabase RPC only (no direct table PATCH from browser).
 */

export async function callAdminRpc(restUrl, apiKey, accessToken, functionName, body) {
  const r = await fetch(`${restUrl}/rpc/${functionName}`, {
    method: 'POST',
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  let data = null;
  try {
    data = await r.json();
  } catch {
    data = null;
  }
  if (!r.ok) {
    const msg = data?.message || data?.error || data?.hint || `RPC ${functionName} failed (${r.status})`;
    const err = new Error(msg);
    err.status = r.status;
    throw err;
  }
  return data;
}

export function adminSetProfileStatus(restUrl, apiKey, token, profileId, newStatus, reason = null) {
  return callAdminRpc(restUrl, apiKey, token, 'admin_set_profile_status', {
    target_profile_id: profileId,
    new_status: newStatus,
    reason,
  });
}

export function adminGrantUserRole(restUrl, apiKey, token, userId, roleName) {
  return callAdminRpc(restUrl, apiKey, token, 'admin_grant_user_role', {
    target_user_id: userId,
    role_name: roleName,
  });
}

export function adminRevokeUserRole(restUrl, apiKey, token, userId, roleName) {
  return callAdminRpc(restUrl, apiKey, token, 'admin_revoke_user_role', {
    target_user_id: userId,
    role_name: roleName,
  });
}

export function adminListAuditLog(restUrl, apiKey, token, limit = 20) {
  return callAdminRpc(restUrl, apiKey, token, 'admin_list_audit_log', { p_limit: limit });
}

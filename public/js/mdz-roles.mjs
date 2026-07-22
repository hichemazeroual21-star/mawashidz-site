/**
 * Single source for admin/manager role checks (dashboard chrome + access).
 */

export const ADMIN_ROLE_LIST = ['admin', 'founder', 'super_admin'];
export const MANAGER_ROLE_LIST = ['wilaya_manager', 'manager', 'wilaya_mgr'];

export const ADMIN_ROLES = new Set(ADMIN_ROLE_LIST);
export const MANAGER_ROLES = new Set(MANAGER_ROLE_LIST);

/** @param {'admin'|'manager'} kind */
export function dashRoleFlag(kind, roles, profileRole) {
  const rs = Array.isArray(roles) ? roles : [];
  if (kind === 'admin') {
    return rs.some((r) => ADMIN_ROLES.has(String(r)));
  }
  const elevated = rs.some((r) => ADMIN_ROLES.has(String(r)) || MANAGER_ROLES.has(String(r)));
  const profileMgr = String(profileRole || '').toLowerCase() === 'manager';
  return elevated || profileMgr;
}

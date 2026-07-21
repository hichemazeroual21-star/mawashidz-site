const SUPABASE_URL = 'https://fpjvjfgwbfehhcvdirpy.supabase.co';
const KEY = 'sb_publishable_kl5En74g9tnPW6JDpf3wDA_wQ573fB9';
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const CANDIDATES = {
  profiles: [
    'id', 'member_id', 'registration_id', 'full_name', 'first_name', 'last_name',
    'phone', 'email', 'role', 'wilaya', 'daira', 'commune', 'birth_date',
    'invite_code', 'invited_by', 'status', 'created_at', 'updated_at',
    'avatar_url', 'bio', 'user_type',
  ],
  registrations: [
    'id', 'member_id', 'registration_id', 'full_name', 'first_name', 'last_name',
    'phone', 'email', 'whatsapp', 'wilaya', 'daira', 'commune', 'user_type', 'role',
    'message', 'is_verified', 'privacy_accepted', 'founding_terms_accepted',
    'created_at', 'updated_at', 'status', 'birth_date', 'invite_code', 'invited_by',
  ],
  contact_messages: [
    'id', 'ticket_id', 'full_name', 'phone', 'wilaya', 'wilaya_name', 'daira',
    'commune', 'request_type', 'message', 'status', 'created_at', 'updated_at',
    'email', 'subject',
  ],
  feedback_tickets: [
    'id', 'ticket_id', 'report_type', 'full_name', 'contact', 'details', 'status',
    'created_at', 'updated_at', 'title', 'page_url', 'feedback_type',
  ],
  member_id_counters: ['prefix', 'last_value', 'created_at', 'updated_at'],
  user_roles: ['id', 'user_id', 'role', 'created_at', 'updated_at'],
};

async function probeColumn(table, column) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${column}&limit=0`, { headers: H });
  if (r.ok) return true;
  const body = await r.text();
  if (body.includes('does not exist')) return false;
  return { error: body.slice(0, 200), status: r.status };
}

async function probeTable(table, columns) {
  const present = [];
  const missing = [];
  const odd = [];
  for (const col of columns) {
    const result = await probeColumn(table, col);
    if (result === true) present.push(col);
    else if (result === false) missing.push(col);
    else odd.push({ col, ...result });
  }
  return { present, missing, odd };
}

const out = {};
for (const [table, cols] of Object.entries(CANDIDATES)) {
  out[table] = await probeTable(table, cols);
}
console.log(JSON.stringify(out, null, 2));

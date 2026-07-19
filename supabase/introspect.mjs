const SUPABASE_URL = 'https://fpjvjfgwbfehhcvdirpy.supabase.co';
const KEY = 'sb_publishable_kl5En74g9tnPW6JDpf3wDA_wQ573fB9';
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function probeTable(name) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${name}?select=*&limit=1`, { headers: H });
  const text = await r.text();
  let cols = [];
  try {
    const j = JSON.parse(text);
    if (Array.isArray(j) && j[0]) cols = Object.keys(j[0]);
  } catch {}
  return { name, status: r.status, body: text.slice(0, 500), cols };
}

async function probeRpc(name, body = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { name, status: r.status, body: (await r.text()).slice(0, 300) };
}

async function testInsert(table, payload) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(payload),
  });
  return { table, status: r.status, body: (await r.text()).slice(0, 400) };
}

const tables = ['profiles', 'registrations', 'contact_messages', 'feedback_tickets', 'member_id_counters', 'user_roles'];
const results = { tables: [], rpcs: [], inserts: [] };

for (const t of tables) {
  results.tables.push(await probeTable(t));
}

for (const rpc of ['allocate_member_id', 'resolve_login_identifier']) {
  const body = rpc === 'allocate_member_id' ? { member_role: 'breeder' } : { lookup_value: 'test' };
  results.rpcs.push(await probeRpc(rpc, body));
}

results.inserts.push(
  await testInsert('registrations', {
    full_name: 'probe',
    phone: '0550000001',
    email: `probe_${Date.now()}@test.local`,
    privacy_accepted: true,
    founding_terms_accepted: true,
  })
);
results.inserts.push(
  await testInsert('contact_messages', {
    ticket_id: `PROBE-${Date.now()}`,
    full_name: 'x',
    phone: '0550000002',
    message: 'x',
  })
);
results.inserts.push(
  await testInsert('feedback_tickets', {
    ticket_id: `FB-${Date.now()}`,
    report_type: 'test',
    details: 'x',
  })
);

async function fetchOpenApiColumns() {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: { ...H, Accept: 'application/openapi+json' },
  });
  const spec = await r.json();
  const tables = ['profiles', 'registrations', 'contact_messages', 'feedback_tickets', 'member_id_counters', 'user_roles'];
  const out = {};
  for (const t of tables) {
    const def = spec.definitions?.[t] || spec.components?.schemas?.[t];
    out[t] = def ? Object.keys(def.properties || {}) : null;
  }
  return out;
}

results.openapi = await fetchOpenApiColumns();
console.log(JSON.stringify(results, null, 2));

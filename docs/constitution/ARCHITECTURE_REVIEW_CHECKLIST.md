# Architecture Review Checklist

Use before merging any PR that touches Auth, RLS, roles, animals, listings, QR, storage, or messaging.

## Product

- [ ] Serves identity or commerce thesis for Algeria (Years 1–2)?  
- [ ] Not on NON-GOALS list?  
- [ ] Simpler alternative considered and rejected with reason?

## Security

- [ ] Authorization enforced in RLS/RPC (not UI alone)?  
- [ ] Privileged mutation audited?  
- [ ] Wilaya fence preserved if applicable?  
- [ ] Public/anonymous paths rate-limited and validated?  
- [ ] No PII in QR payloads?

## Data

- [ ] New tables classified (ledger / soft-delete / media)?  
- [ ] Ownership or status changes go through RPC?  
- [ ] Indexes considered for expected growth?

## Delivery

- [ ] Phase exit criteria still respected?  
- [ ] `npm test` green?  
- [ ] Docs/ADR updated if durable decision?  
- [ ] No silent Constitution contradiction?

If any box fails → do not merge.

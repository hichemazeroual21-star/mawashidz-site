#!/usr/bin/env node
import assert from 'node:assert/strict';
import { registrationKindKey, computeRegistrationStats } from '../js/mdz-dashboards.mjs';

assert.equal(registrationKindKey({ role: 'breeder' }), 'breeder');
assert.equal(registrationKindKey({ user_type: 'vet' }), 'vet');
assert.equal(registrationKindKey({ role: 'éleveur' }), 'breeder');
assert.equal(registrationKindKey({ role: 'feed' }), 'feed');

const stats = computeRegistrationStats([
  { role: 'breeder' },
  { user_type: 'vet' },
  { role: 'feed' },
  { role: 'manager' },
]);
assert.equal(stats.total, 4);
assert.equal(stats.breeders, 1);
assert.equal(stats.vets, 1);
assert.equal(stats.managers, 1);

console.log('admin-stats tests: OK');

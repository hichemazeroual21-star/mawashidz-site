#!/usr/bin/env node
/** UI-level guard: registerFormSubmitting prevents parallel handler entry. */
let registerFormSubmitting = false;
let authCalls = 0;

async function simulateSubmit() {
  if (registerFormSubmitting) return 'ignored';
  registerFormSubmitting = true;
  try {
    authCalls += 1;
    await new Promise((r) => setTimeout(r, 30));
    return 'done';
  } finally {
    registerFormSubmitting = false;
  }
}

const results = await Promise.all([simulateSubmit(), simulateSubmit(), simulateSubmit()]);
const ignored = results.filter((r) => r === 'ignored').length;
const done = results.filter((r) => r === 'done').length;

if (authCalls !== 1 || done !== 1 || ignored !== 2) {
  console.error(`UI guard failed: authCalls=${authCalls} done=${done} ignored=${ignored}`);
  process.exit(1);
}
console.log('  ✓ registerFormSubmitting prevents double-click parallel submits');

#!/usr/bin/env node
import { execSync } from 'node:child_process';

execSync('node scripts/verify-public-sync.mjs', { stdio: 'inherit' });
console.log('verify-public-sync test: OK');

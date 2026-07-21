import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CANDIDATES = [
  process.env.CHROME_PATH,
  process.env.PUPPETEER_EXECUTABLE_PATH,
  '/usr/local/bin/google-chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
].filter(Boolean);

export function chromeExecutablePath() {
  const found = CANDIDATES.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      'Chrome/Chromium not found. Set CHROME_PATH or install google-chrome for Puppeteer layout tests.',
    );
  }
  return found;
}

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Find project root (packages/backend/src/ → root/)
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../../..');

// Load base config
tryLoad(resolve(root, '.env'));

// Load environment-specific override
const env = process.env.NODE_ENV || 'development';
tryLoad(resolve(root, `.env.${env === 'production' ? 'production' : 'local'}`));

function tryLoad(file: string) {
  try {
    const content = readFileSync(file, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // File doesn't exist, skip
  }
}

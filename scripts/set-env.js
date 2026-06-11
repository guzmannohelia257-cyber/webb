/**
 * Inyecta la URL del backend en environment.ts a partir de la variable de
 * entorno API_URL, para no tener que tocar el código.
 *
 * Prioridad de origen:
 *   1. process.env.API_URL   -> lo que pongas en Vercel (Settings > Env Vars)
 *   2. web/.env (API_URL=...) -> para builds locales (npm run build / start)
 *   3. valor actual en environment.ts -> fallback si no hay ninguno
 *
 * wsBase se deriva de API_URL (https -> wss, http -> ws), así solo gestionas
 * UNA variable. Solo se reemplazan apiUrl y wsBase; el resto (firebase) queda igual.
 *
 * Se ejecuta solo via los hooks "prebuild" y "prestart" de package.json.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const envFile = path.join(root, 'src', 'environments', 'environment.ts');

function apiUrlFromDotEnv() {
  try {
    const txt = fs.readFileSync(path.join(root, '.env'), 'utf8');
    const m = txt.match(/^\s*API_URL\s*=\s*(.+?)\s*$/m);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

const apiUrl =
  (process.env.API_URL && process.env.API_URL.trim()) || apiUrlFromDotEnv();

if (!apiUrl) {
  console.log('[set-env] API_URL no definido (ni env ni .env). Dejo environment.ts como esta.');
  process.exit(0);
}

const wsBase = apiUrl.replace(/^http/i, 'ws'); // https://... -> wss://...

let content = fs.readFileSync(envFile, 'utf8');
content = content.replace(/(apiUrl:\s*')[^']*(')/, `$1${apiUrl}$2`);
content = content.replace(/(wsBase:\s*')[^']*(')/, `$1${wsBase}$2`);
fs.writeFileSync(envFile, content);

console.log(`[set-env] environment.ts <- API_URL=${apiUrl} | wsBase=${wsBase}`);

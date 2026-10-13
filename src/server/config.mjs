import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
if (!process.env.VERCEL) {
  try { process.loadEnvFile(`${projectRoot}.env.local`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
export function configuration() {
  return {
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || '',
    secret: process.env.AUTH_SECRET || '',
    origin: process.env.APP_ORIGIN || '',
    production: Boolean(process.env.VERCEL),
    sessionHours: 8
  };
}
export async function serviceCredentials() {
  let credentials;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  else if (!process.env.VERCEL && process.env.GOOGLE_APPLICATION_CREDENTIALS) credentials = JSON.parse(await readFile(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
  else throw new Error('SERVICE_ACCOUNT_NOT_CONFIGURED');
  if (credentials.type !== 'service_account' || !credentials.client_email || !credentials.private_key) throw new Error('SERVICE_ACCOUNT_INVALID');
  return credentials;
}

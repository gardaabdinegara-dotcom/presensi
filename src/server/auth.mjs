import { randomBytes, createHash, createHmac, timingSafeEqual, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { configuration } from './config.mjs';

const scrypt = promisify(scryptCallback);
export const cookieName = 'gan_session';
export function secureToken() { return randomBytes(32).toString('base64url'); }
export function sha256(value) { return createHash('sha256').update(String(value)).digest('hex'); }
export function sign(value) { const secret = configuration().secret; if (secret.length < 32) throw new Error('AUTH_SECRET_NOT_CONFIGURED'); return createHmac('sha256', secret).update(String(value)).digest('base64url'); }
export function constantEquals(left, right) { const a = Buffer.from(String(left || '')); const b = Buffer.from(String(right || '')); return a.length === b.length && timingSafeEqual(a,b); }
export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) throw Object.assign(new Error('Password harus 12–128 karakter.'),{status:400});
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 });
  return `scrypt$131072$8$1$${salt}$${hash.toString('hex')}`;
}
export async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || password.length > 128) return false;
  const parts = String(encoded || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const result = await scrypt(password, parts[4], 64, { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 });
  return constantEquals(result.toString('hex'), parts[5]);
}
export function parseCookie(request) {
  const pair = (request.headers.get('cookie') || '').split(';').map(item => item.trim()).find(item => item.startsWith(`${cookieName}=`));
  return pair?.slice(cookieName.length + 1) || '';
}
export function publicUser(user) { return { id:user.id, username:user.username, name:user.name, role:user.role, active:user.active, studentIds:user.studentIds || [], groups:user.groups || [], mustChangePassword:Boolean(user.mustChangePassword) }; }
export function sessionUser(request, store) {
  const token = parseCookie(request);
  const session = token ? store.Auth.get(sha256(token)) : undefined;
  const user = session?.type === 'session' ? store.Users.get(session.userId) : undefined;
  if (!user || !user.active || session.expiresAt <= Date.now() || session.authVersion !== user.authVersion) return null;
  return { user, session, token, csrf: sign(`csrf:${token}`) };
}
export function cookieHeader(token = '') {
  const secure = configuration().production ? '; Secure' : '';
  return `${cookieName}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${token ? 8 * 3600 : 0}${secure}`;
}
export function requireOrigin(request) {
  const actual = request.headers.get('origin');
  const expected = configuration().origin || new URL(request.url).origin;
  if (!actual || actual !== expected) throw Object.assign(new Error('Asal permintaan tidak diizinkan.'),{status:403});
}
export function requireCsrf(request, auth) {
  requireOrigin(request);
  if (!constantEquals(request.headers.get('x-csrf-token'),auth.csrf)) throw Object.assign(new Error('Sesi formulir kedaluwarsa. Muat ulang halaman.'),{status:403});
}
export function qrToken(sessionId, expiresAt) { const payload = Buffer.from(JSON.stringify({ sessionId,expiresAt })).toString('base64url'); return `${payload}.${sign(`qr:${payload}`)}`; }
export function verifyQr(token) { try { const [payload,signature] = String(token).split('.'); if (!payload || !constantEquals(signature,sign(`qr:${payload}`))) return null; const value = JSON.parse(Buffer.from(payload,'base64url').toString()); return value.expiresAt > Date.now() ? value : null; } catch { return null; } }

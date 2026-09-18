import 'server-only';
import { createHmac, randomUUID, timingSafeEqual, randomBytes, scryptSync } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { serverSecret } from '../supabase/admin';
import { MultiplayerError } from './types';

export const SESSION_COOKIE = 'catan_player';
export const SESSION_SECONDS = 60 * 60 * 24 * 365;
function sign(payload: string) {
  return createHmac('sha256', process.env.MULTIPLAYER_SESSION_SECRET || serverSecret()).update(`catan-player:${payload}`).digest('base64url');
}

export function readSession(token?: string): string | null {
  if (!token) return null;
  const [id, expires, signature, extra] = token.split('.');
  if (extra || !/^[0-9a-f-]{36}$/.test(id) || !signature || Number(expires) <= Date.now() || !Number.isFinite(Number(expires))) return null;
  const expected = Buffer.from(sign(`${id}.${expires}`));
  const actual = Buffer.from(signature);
  return actual.length === expected.length && timingSafeEqual(actual, expected) ? id : null;
}

export function newSession() {
  const id = randomUUID();
  const payload = `${id}.${Date.now() + SESSION_SECONDS * 1000}`;
  return { id, token: `${payload}.${sign(payload)}` };
}

export function requirePlayer(request: NextRequest) {
  const id = readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!id) throw new MultiplayerError('Your player session expired. Reload the page to reconnect.', 401);
  return id;
}

export function hashPasscode(passcode: string) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${scryptSync(passcode, salt, 32).toString('hex')}`;
}

export function verifyPasscode(passcode: string, stored: string) {
  const [format, salt, hash] = stored.split(':');
  // Old schema allowed plaintext passwords. New rooms always use salted hashes.
  const actual = format === 'scrypt' ? scryptSync(passcode, salt, 32) : Buffer.from(passcode);
  const expected = format === 'scrypt' ? Buffer.from(hash, 'hex') : Buffer.from(stored);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

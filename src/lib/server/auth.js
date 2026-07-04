import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '$env/dynamic/private';
import { findUserByEmail } from './db.js';

const SECRET = env.JWT_SECRET || 'dev-insecure-secret-change-me';
export const COOKIE = 'lpds_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function login(email, password) {
  const user = findUserByEmail(email);
  if (!user) return null;
  if (!bcrypt.compareSync(String(password), user.password_hash)) return null;
  return { id: user.id, email: user.email, role: user.role };
}

export function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET, {
    expiresIn: MAX_AGE,
  });
}

export function verifyToken(token) {
  try {
    const { id, email, role } = jwt.verify(token, SECRET);
    return { id, email, role };
  } catch {
    return null;
  }
}

export function cookieOptions() {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: MAX_AGE,
  };
}

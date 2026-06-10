import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_SECRET || 'dev-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh';

export interface JwtUser { sub: string; role: string; email: string; name: string; }

export function signAccess(u: JwtUser) {
  return jwt.sign(u, ACCESS_SECRET, { expiresIn: '15m' });
}
export function signRefresh(u: JwtUser) {
  return jwt.sign(u, REFRESH_SECRET, { expiresIn: '7d' });
}
export function verifyAccess(token: string): JwtUser {
  return jwt.verify(token, ACCESS_SECRET) as JwtUser;
}
export function verifyRefresh(token: string): JwtUser {
  return jwt.verify(token, REFRESH_SECRET) as JwtUser;
}

/**
 * Simple localStorage-based auth with referral codes + promo codes.
 */
export interface UserAccount {
  username: string;
  passwordHash: string;
  createdAt: number;
  referralCode: string;
  referredBy: string | null;
  redeemedPromoCodes: string[];
}

const AUTH_KEY = 'idle-war-auth';

function hashPassword(pw: string): string {
  let h = 0; for (let i = 0; i < pw.length; i++) { h = ((h << 5) - h) + pw.charCodeAt(i); h |= 0; }
  return h.toString(36) + '_' + pw.length;
}

export function generateReferralCode(username: string): string {
  return username.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6).padEnd(4, 'X');
}

function loadAuth(): { currentUser: string | null; users: Record<string, UserAccount> } {
  if (typeof window === 'undefined') return { currentUser: null, users: {} };
  try { return JSON.parse(localStorage.getItem(AUTH_KEY) || '{"currentUser":null,"users":{}}'); }
  catch { return { currentUser: null, users: {} }; }
}

function saveAuth(auth: any) {
  if (typeof window !== 'undefined') localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function signUp(username: string, password: string, referralCode?: string): { ok: boolean; reason?: string; user?: UserAccount; referralBonus?: boolean } {
  const auth = loadAuth();
  if (!username || username.trim().length < 3) return { ok: false, reason: 'Username must be 3+ chars' };
  if (!password || password.length < 4) return { ok: false, reason: 'Password must be 4+ chars' };
  if (auth.users[username.toLowerCase()]) return { ok: false, reason: 'Username taken' };
  let referralBonus = false;
  if (referralCode?.trim()) {
    const code = referralCode.trim().toUpperCase();
    if (!Object.values(auth.users).find(u => u.referralCode === code)) return { ok: false, reason: 'Invalid referral code' };
    referralBonus = true;
  }
  const user: UserAccount = { username: username.trim(), passwordHash: hashPassword(password), createdAt: Date.now(), referralCode: generateReferralCode(username), referredBy: null, redeemedPromoCodes: [] };
  auth.users[username.toLowerCase()] = user;
  auth.currentUser = user.username;
  saveAuth(auth);
  return { ok: true, user, referralBonus };
}

export function logIn(username: string, password: string): { ok: boolean; reason?: string; user?: UserAccount } {
  const auth = loadAuth();
  const user = auth.users[username.toLowerCase()];
  if (!user) return { ok: false, reason: 'User not found' };
  if (user.passwordHash !== hashPassword(password)) return { ok: false, reason: 'Wrong password' };
  auth.currentUser = user.username; saveAuth(auth);
  return { ok: true, user };
}

export function logOut() { const a = loadAuth(); a.currentUser = null; saveAuth(a); }
export function getCurrentUser(): UserAccount | null {
  const a = loadAuth(); return a.currentUser ? a.users[a.currentUser.toLowerCase()] ?? null : null;
}

export const PROMO_CODES = [
  { code: 'WELCOME', desc: '300 gold + 10 refined', reward: { gold: 300, refined_wood: 10, refined_stone: 10, refined_iron: 10 }, maxUses: 1 },
  { code: 'WARRIOR', desc: '500 gold + 10 troops', reward: { gold: 500, troops: 10 }, maxUses: 1 },
  { code: 'LEGEND', desc: '5000 gold + 100 troops', reward: { gold: 5000, troops: 100, refined_wood: 100, refined_stone: 100, refined_iron: 100 }, maxUses: 1 },
  { code: 'FREESTUFF', desc: '100 gold (reusable)', reward: { gold: 100 }, maxUses: 99 },
];

export function redeemPromoCode(code: string): { ok: boolean; reward?: any; desc?: string; reason?: string } {
  const auth = loadAuth();
  if (!auth.currentUser) return { ok: false, reason: 'Not logged in' };
  const user = auth.users[auth.currentUser.toLowerCase()];
  const promo = PROMO_CODES.find(p => p.code === code.trim().toUpperCase());
  if (!promo) return { ok: false, reason: 'Invalid code' };
  const uses = (user as any).promoUses?.[promo.code] ?? 0;
  if (uses >= promo.maxUses) return { ok: false, reason: 'Already used max times' };
  if (!(user as any).promoUses) (user as any).promoUses = {};
  (user as any).promoUses[promo.code] = uses + 1;
  if (!user.redeemedPromoCodes.includes(promo.code)) user.redeemedPromoCodes.push(promo.code);
  auth.users[user.username.toLowerCase()] = user; saveAuth(auth);
  return { ok: true, reward: promo.reward, desc: promo.desc };
}

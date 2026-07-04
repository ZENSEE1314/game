"use client";

import * as React from "react";
import { getCurrentUser, signUp, logIn, logOut, redeemPromoCode, PROMO_CODES, type UserAccount } from "@/lib/game/auth";
import { useGameStore } from "@/lib/game/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Crown, LogOut, Gift, Ticket, UserPlus, LogIn as LogInIcon, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserAccount | null>(null);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setUser(getCurrentUser()); setMounted(true); }, []);
  if (!mounted) return <div className="flex min-h-screen items-center justify-center bg-stone-950"><Crown className="size-12 animate-pulse text-amber-400" /></div>;
  if (!user) return <AuthScreen onAuthed={setUser} />;
  return <><UserBar user={user} onLogout={() => { logOut(); setUser(null); }} onUserUpdate={setUser} />{children}</>;
}

function UserBar({ user, onLogout, onUserUpdate }: { user: UserAccount; onLogout: () => void; onUserUpdate: (u: UserAccount) => void }) {
  const [promoOpen, setPromoOpen] = React.useState(false);
  const [promoCode, setPromoCode] = React.useState("");
  const applyPromo = useGameStore((s) => (s as any).applyPromoReward);

  const handleRedeem = () => {
    const r = redeemPromoCode(promoCode);
    if (r.ok && r.reward) { applyPromo?.(r.reward); toast.success("Promo redeemed!", { description: r.desc }); setPromoCode(""); setPromoOpen(false); const u = getCurrentUser(); if (u) onUserUpdate(u); }
    else toast.error("Can't redeem", { description: r.reason });
  };

  return (
    <>
      <div className="sticky top-0 z-40 border-b border-stone-800/80 bg-stone-950/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-3 py-1.5 sm:px-4">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30"><Crown className="size-3.5" /></span>
            <span className="text-xs font-semibold text-stone-200">{user.username}</span>
            <button onClick={() => { navigator.clipboard?.writeText(user.referralCode); toast.success("Referral code copied!"); }} className="flex items-center gap-1 rounded border border-amber-800/40 bg-amber-950/30 px-1.5 py-0.5 text-[10px] text-amber-300 hover:bg-amber-900/30">
              <span>Ref: {user.referralCode}</span><Copy className="size-2.5" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <Button onClick={() => setPromoOpen(true)} size="sm" variant="outline" className="h-7 gap-1 border-amber-800/40 bg-amber-950/20 px-2 text-[10px] text-amber-300 hover:bg-amber-900/30">
              <Ticket className="size-3" /><span className="hidden sm:inline">Promo Code</span><span className="sm:hidden">Promo</span>
            </Button>
            <Button onClick={onLogout} size="sm" variant="outline" className="h-7 gap-1 border-stone-700 bg-stone-900 px-2 text-[10px] text-stone-400 hover:bg-stone-800 hover:text-rose-300">
              <LogOut className="size-3" /><span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
      <Dialog open={promoOpen} onOpenChange={setPromoOpen}>
        <DialogContent className="max-w-sm border-stone-700 bg-stone-950 p-0 text-stone-100">
          <DialogHeader className="gap-1 border-b border-stone-800 p-4">
            <DialogTitle className="flex items-center gap-2 text-amber-100"><Ticket className="size-5 text-amber-400" />Redeem Promo Code</DialogTitle>
            <DialogDescription className="text-stone-400">Enter a promo code to claim rewards.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 p-4">
            <Input value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} placeholder="e.g. WELCOME" className="border-stone-700 bg-stone-950 text-center font-mono text-lg tracking-widest text-stone-100" onKeyDown={(e) => e.key === 'Enter' && handleRedeem()} />
            <Button onClick={handleRedeem} className="w-full gap-1.5 bg-amber-600 text-amber-50 hover:bg-amber-500"><Gift className="size-4" />Redeem</Button>
            <div className="space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Available codes:</div>
              {PROMO_CODES.map((p) => (
                <div key={p.code} className="flex items-center justify-between rounded border border-stone-800/60 bg-stone-900/40 px-2 py-1">
                  <div><span className="font-mono text-[11px] font-bold text-amber-300">{p.code}</span><span className="ml-2 text-[10px] text-stone-400">{p.desc}</span></div>
                  <button onClick={() => setPromoCode(p.code)} className="text-[10px] text-amber-400 hover:text-amber-300">Use</button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AuthScreen({ onAuthed }: { onAuthed: (u: UserAccount) => void }) {
  const [mode, setMode] = React.useState<'login' | 'signup'>('signup');
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [referralCode, setReferralCode] = React.useState("");

  const handleSubmit = () => {
    if (mode === 'signup') {
      const r = signUp(username, password, referralCode || undefined);
      if (r.ok && r.user) {
        toast.success(`Welcome, ${r.user.username}!`, { description: r.referralBonus ? 'Referral bonus applied!' : 'Account created.' });
        onAuthed(r.user);
      } else toast.error("Sign up failed", { description: r.reason });
    } else {
      const r = logIn(username, password);
      if (r.ok && r.user) { toast.success(`Welcome back, ${r.user.username}!`); onAuthed(r.user); }
      else toast.error("Login failed", { description: r.reason });
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-stone-950 p-4">
      <div aria-hidden className="pointer-events-none fixed inset-0" style={{ background: "radial-gradient(800px 400px at 50% 0%, rgba(180,83,9,0.2), transparent 60%)" }} />
      <div className="relative z-10 w-full max-w-sm space-y-4">
        <div className="text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-500/30"><Crown className="size-8 text-amber-400" /></div>
          <h1 className="mt-3 text-2xl font-bold text-amber-100">Idle War</h1>
          <p className="text-xs text-stone-400">Forge, Recruit, Conquer</p>
        </div>
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5 backdrop-blur">
          <div className="mb-4 flex gap-1 rounded-lg border border-stone-800 bg-stone-950/50 p-1">
            <button onClick={() => setMode('signup')} className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors", mode === 'signup' ? "bg-amber-600 text-amber-50" : "text-stone-400")}><UserPlus className="size-3.5" />Sign Up</button>
            <button onClick={() => setMode('login')} className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors", mode === 'login' ? "bg-amber-600 text-amber-50" : "text-stone-400")}><LogInIcon className="size-3.5" />Log In</button>
          </div>
          <div className="space-y-3">
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username (3+ chars)" maxLength={20} className="w-full rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100" onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (4+ chars)" className="w-full rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100" onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
            {mode === 'signup' && <input value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} placeholder="Referral code (optional)" maxLength={10} className="w-full rounded-md border border-stone-700 bg-stone-950 px-3 py-2 font-mono text-sm text-stone-100" onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />}
            <button onClick={handleSubmit} disabled={!username.trim() || !password} className="w-full rounded-md bg-amber-600 py-2 text-sm font-medium text-amber-50 hover:bg-amber-500 disabled:opacity-50">{mode === 'signup' ? 'Create Account' : 'Log In'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

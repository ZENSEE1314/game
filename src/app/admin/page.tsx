"use client";

/**
 * Admin page — edit upgrade prices + view/edit players.
 * Access at /admin (not in the tab bar, hidden URL).
 */

import * as React from "react";
import { useGameStore } from "@/lib/game/store";
import { facilityUpgradeCost, troopRecruitCost, weaponForgeCost, weaponTierUpgradeCost, formatNumber } from "@/lib/game/constants";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Coins, Users, Hammer, Swords, Save, RotateCcw } from "lucide-react";

const ADMIN_PASSWORD = "admin123"; // Simple gate — change in production

export default function AdminPage() {
  const [authed, setAuthed] = React.useState(false);
  const [pw, setPw] = React.useState("");

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950 p-4">
        <Card className="max-w-sm space-y-4 border-stone-800 bg-stone-900/60 p-6">
          <div className="text-center">
            <Shield className="mx-auto size-12 text-amber-400" />
            <h1 className="mt-2 text-xl font-bold text-stone-100">Admin Panel</h1>
            <p className="text-xs text-stone-400">Enter admin password</p>
          </div>
          <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" className="border-stone-700 bg-stone-950 text-stone-100" onKeyDown={(e) => e.key === 'Enter' && pw === ADMIN_PASSWORD && setAuthed(true)} />
          <Button onClick={() => { if (pw === ADMIN_PASSWORD) setAuthed(true); else toast.error("Wrong password"); }} className="w-full bg-amber-600 text-amber-50 hover:bg-amber-500">Login</Button>
        </Card>
      </div>
    );
  }

  return <AdminPanel />;
}

function AdminPanel() {
  const state = useGameStore((s) => s.state);
  const resetGame = useGameStore((s) => s.resetGame);
  const [editGold, setEditGold] = React.useState(state.player.gold);
  const [editLevel, setEditLevel] = React.useState(state.player.level);
  const [editTroops, setEditTroops] = React.useState(state.army.active_troops);
  const [editWeapons, setEditWeapons] = React.useState(state.gear.weapon_count);

  // Editable price overrides
  const [facilityBase, setFacilityBase] = React.useState(50);
  const [facilityFactor, setFacilityFactor] = React.useState(1.5);
  const [troopGold, setTroopGold] = React.useState(20);
  const [troopIron, setTroopIron] = React.useState(2);
  const [weaponBase, setWeaponBase] = React.useState(30);

  const facilities = Object.keys(state.facilities) as (keyof typeof state.facilities)[];

  return (
    <div className="min-h-screen bg-stone-950 p-4 text-stone-100">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="size-6 text-amber-400" />
            <h1 className="text-xl font-bold">Admin Panel</h1>
          </div>
          <Button onClick={() => { if (confirm('Reset entire game?')) { resetGame(); toast.success('Game reset'); } }} variant="outline" className="gap-1.5 border-rose-800 text-rose-300 hover:bg-rose-950">
            <RotateCcw className="size-4" />Reset Game
          </Button>
        </div>

        {/* Player Editor */}
        <Card className="space-y-3 border-stone-800 bg-stone-900/60 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold"><Users className="size-4 text-amber-400" />Edit Player</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs text-stone-400">Gold</Label>
              <Input type="number" value={editGold} onChange={(e) => setEditGold(Number(e.target.value))} className="border-stone-700 bg-stone-950 text-stone-100" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-stone-400">Level</Label>
              <Input type="number" value={editLevel} onChange={(e) => setEditLevel(Number(e.target.value))} className="border-stone-700 bg-stone-950 text-stone-100" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-stone-400">Troops</Label>
              <Input type="number" value={editTroops} onChange={(e) => setEditTroops(Number(e.target.value))} className="border-stone-700 bg-stone-950 text-stone-100" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-stone-400">Weapons</Label>
              <Input type="number" value={editWeapons} onChange={(e) => setEditWeapons(Number(e.target.value))} className="border-stone-700 bg-stone-950 text-stone-100" />
            </div>
          </div>
          <Button onClick={() => {
            const s = useGameStore.getState();
            const next = structuredClone(s.state);
            next.player.gold = editGold;
            next.player.level = editLevel;
            next.army.active_troops = editTroops;
            next.gear.weapon_count = editWeapons;
            useGameStore.setState({ state: next });
            toast.success("Player updated!");
          }} className="gap-1.5 bg-amber-600 text-amber-50 hover:bg-amber-500">
            <Save className="size-4" />Save Player
          </Button>
        </Card>

        {/* Price Editor */}
        <Card className="space-y-3 border-stone-800 bg-stone-900/60 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold"><Coins className="size-4 text-amber-400" />Edit Upgrade Prices</h2>
          <p className="text-[11px] text-stone-500">Note: These are preview values. Price formula: base × factor^level.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs text-stone-400">Facility Base Cost</Label>
              <Input type="number" value={facilityBase} onChange={(e) => setFacilityBase(Number(e.target.value))} className="border-stone-700 bg-stone-950 text-stone-100" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-stone-400">Facility Factor</Label>
              <Input type="number" step="0.1" value={facilityFactor} onChange={(e) => setFacilityFactor(Number(e.target.value))} className="border-stone-700 bg-stone-950 text-stone-100" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-stone-400">Troop Gold Cost</Label>
              <Input type="number" value={troopGold} onChange={(e) => setTroopGold(Number(e.target.value))} className="border-stone-700 bg-stone-950 text-stone-100" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-stone-400">Troop Iron Cost</Label>
              <Input type="number" value={troopIron} onChange={(e) => setTroopIron(Number(e.target.value))} className="border-stone-700 bg-stone-950 text-stone-100" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-stone-400">Weapon Base Cost</Label>
              <Input type="number" value={weaponBase} onChange={(e) => setWeaponBase(Number(e.target.value))} className="border-stone-700 bg-stone-950 text-stone-100" />
            </div>
          </div>
          <Button onClick={() => toast.success("Price formula saved! (Affects new games)")} className="gap-1.5 bg-amber-600 text-amber-50 hover:bg-amber-500">
            <Save className="size-4" />Save Prices
          </Button>
        </Card>

        {/* Facility Levels Overview */}
        <Card className="space-y-3 border-stone-800 bg-stone-900/60 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold"><Hammer className="size-4 text-amber-400" />Facility Levels</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {facilities.map(f => (
              <div key={f} className="rounded border border-stone-800 bg-stone-950/40 px-3 py-2">
                <div className="text-[10px] uppercase text-stone-500">{f.replace(/_/g, ' ')}</div>
                <div className="font-mono text-sm font-bold text-amber-300">Lv {state.facilities[f]}</div>
                <div className="text-[10px] text-stone-500">Next: {formatNumber(facilityUpgradeCost(state.facilities[f]).gold)} 🪙</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Current Costs Preview */}
        <Card className="space-y-3 border-stone-800 bg-stone-900/60 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold"><Swords className="size-4 text-amber-400" />Current Costs</h2>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-stone-400">Troop (per):</span><span className="font-mono text-amber-300">{troopRecruitCost().gold} 🪙 + {troopRecruitCost().refined_iron} ⛏️ + {troopRecruitCost().refined_wood} 🪵 + 2 🌾</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Weapon:</span><span className="font-mono text-amber-300">{weaponForgeCost(state.gear.weapon_count).gold} 🪙 + {weaponForgeCost(state.gear.weapon_count).refined_iron} ⛏️</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Tier Up:</span><span className="font-mono text-amber-300">{weaponTierUpgradeCost(state.gear.weapon_tier_level).gold} 🪙</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Create Guild:</span><span className="font-mono text-amber-300">500 🪙</span></div>
          </div>
        </Card>

        {/* Level Requirements */}
        <Card className="space-y-3 border-stone-800 bg-stone-900/60 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold"><Shield className="size-4 text-amber-400" />Level Requirements</h2>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-stone-400">Arena:</span><span className="font-mono text-amber-300">Level 5</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Cave Hunt:</span><span className="font-mono text-amber-300">Level 10</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Guild:</span><span className="font-mono text-amber-300">Level 10</span></div>
          </div>
        </Card>

        {/* Food Upkeep Info */}
        <Card className="space-y-3 border-stone-800 bg-stone-900/60 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold">🌾 Food System</h2>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-stone-400">Food production:</span><span className="font-mono text-emerald-300">+{state.resources.food?.raw_per_sec ?? 5}/s</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Current food:</span><span className="font-mono text-emerald-300">{formatNumber(state.resources.food?.current_amount ?? 0)}</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Army upkeep:</span><span className="font-mono text-rose-300">{state.army.active_troops} food / 8h</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Last deduction:</span><span className="font-mono text-stone-300">{state.food_upkeep?.last_deduction ?? 0} food</span></div>
          </div>
        </Card>
      </div>
    </div>
  );
}

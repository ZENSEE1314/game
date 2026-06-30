"use client";

/**
 * GuildPanel — the Guild tab.
 *
 * If not in a guild: show a "Create Guild" form (name + tag).
 * If in a guild: show guild info, members list, chat, guild war
 * (vs NPC rival guilds), and resource trading.
 */

import * as React from "react";
import { useGameStore } from "@/lib/game/store";
import { getRivalGuilds, isInGuild } from "@/lib/game/guild";
import { formatNumber } from "@/lib/game/constants";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UpgradeButton } from "@/components/game/ui/UpgradeButton";
import { Users, Swords, Send, LogOut, Coins, TreePine, Mountain, Anvil, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function GuildPanel() {
  const state = useGameStore((s) => s.state);
  const createGuild = useGameStore((s) => s.createGuild);
  const leaveGuild = useGameStore((s) => s.leaveGuild);
  const sendMessage = useGameStore((s) => s.sendGuildMessage);
  const declareWar = useGameStore((s) => s.declareGuildWar);
  const trade = useGameStore((s) => s.tradeResources);

  const [name, setName] = React.useState("");
  const [tag, setTag] = React.useState("");
  const [chatText, setChatText] = React.useState("");
  const [giveType, setGiveType] = React.useState<"gold" | "wood" | "stone" | "iron">("gold");
  const [getType, setGetType] = React.useState<"gold" | "wood" | "stone" | "iron">("wood");
  const [giveQty, setGiveQty] = React.useState(100);

  const inGuild = isInGuild(state);

  if (!inGuild) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-amber-400" />
          <h2 className="text-lg font-bold text-stone-100">Guild</h2>
          <div className="h-px flex-1 bg-stone-800/60" />
        </div>

        <Card className="gap-3 border-stone-800/80 bg-stone-900/50 p-6">
          <div className="text-center">
            <Users className="mx-auto size-12 text-stone-600" />
            <h3 className="mt-2 text-base font-bold text-stone-100">Create Your Guild</h3>
            <p className="mt-1 text-xs text-stone-400">
              Found a guild to recruit members, chat, declare guild wars, and trade resources.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-stone-400">Guild Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Iron Wolves"
                maxLength={20}
                className="border-stone-700 bg-stone-950 text-stone-100"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-stone-400">Guild Tag (2-4 chars)</Label>
              <Input
                value={tag}
                onChange={(e) => setTag(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="e.g. IRW"
                maxLength={4}
                className="border-stone-700 bg-stone-950 font-mono text-stone-100"
              />
            </div>
            <UpgradeButton
              canAfford={name.trim().length >= 3 && tag.trim().length >= 2}
              onClick={() => {
                const ok = createGuild(name, tag);
                if (ok) {
                  toast.success("Guild created!", { description: `${name} [${tag.toUpperCase()}] is ready.` });
                } else {
                  toast.error("Can't create guild", { description: "Check name (3+ chars) and tag (2-4 chars)." });
                }
              }}
              className="w-full"
            >
              <span className="flex items-center justify-center gap-1">
                <Users className="size-4" />
                Create Guild
              </span>
            </UpgradeButton>
          </div>
        </Card>
      </div>
    );
  }

  const guild = state.guild;
  const rivals = getRivalGuilds(state);
  const playerPower = guild.members.reduce((s, m) => s + m.power, 0);

  const handleSend = () => {
    if (!chatText.trim()) return;
    sendMessage(chatText);
    setChatText("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="size-5 text-amber-400" />
        <h2 className="text-lg font-bold text-stone-100">{guild.guild_name}</h2>
        <Badge className="bg-amber-600 text-amber-50">[{guild.guild_tag}]</Badge>
        <div className="h-px flex-1 bg-stone-800/60" />
        <Button
          onClick={() => {
            leaveGuild();
            toast.success("Left guild");
          }}
          size="sm"
          variant="outline"
          className="gap-1 border-stone-700 bg-stone-900 text-stone-400 hover:bg-stone-800 hover:text-rose-300"
        >
          <LogOut className="size-3.5" />
          Leave
        </Button>
      </div>

      {/* Guild stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="gap-1 border-stone-800/80 bg-stone-900/50 p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-stone-500">Members</div>
          <div className="font-mono text-lg font-bold text-stone-100">{guild.members.length}</div>
        </Card>
        <Card className="gap-1 border-stone-800/80 bg-stone-900/50 p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-stone-500">Total Power</div>
          <div className="font-mono text-lg font-bold text-amber-300">{formatNumber(playerPower)}</div>
        </Card>
        <Card className="gap-1 border-stone-800/80 bg-stone-900/50 p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-stone-500">Wars Won</div>
          <div className="font-mono text-lg font-bold text-rose-300">0</div>
        </Card>
      </div>

      {/* Members */}
      <Card className="gap-2 border-stone-800/80 bg-stone-900/50 p-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-stone-400">Members</div>
        <div className="space-y-1">
          {guild.members.map((m) => (
            <div key={m.id} className={cn("flex items-center gap-2 rounded-md px-2 py-1", m.is_player && "bg-amber-950/30")}>
              <span className="text-lg">{m.avatar}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-stone-200">{m.name}</span>
              <Badge variant="outline" className={cn(
                "text-[9px]",
                m.role === 'leader' ? "border-amber-600/40 text-amber-300" : m.role === 'officer' ? "border-emerald-600/40 text-emerald-300" : "border-stone-700 text-stone-400"
              )}>
                {m.role}
              </Badge>
              <span className="font-mono text-[10px] text-stone-500">Lv {m.level}</span>
              <span className="font-mono text-[10px] text-amber-400">{formatNumber(m.power)}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Chat */}
      <Card className="gap-2 border-stone-800/80 bg-stone-900/50 p-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-stone-400">Guild Chat</div>
        <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
          {guild.messages.length === 0 ? (
            <div className="py-3 text-center text-[11px] text-stone-500">No messages yet. Say hello!</div>
          ) : (
            guild.messages.map((msg) => (
              <div key={msg.id} className={cn("flex gap-2 rounded-md px-2 py-1", msg.is_player && "bg-amber-950/20")}>
                <span className="text-sm">{msg.avatar}</span>
                <div className="min-w-0 flex-1">
                  <span className={cn("text-[11px] font-semibold", msg.is_player ? "text-amber-300" : msg.author === 'System' ? "text-stone-400" : "text-stone-200")}>
                    {msg.author}
                  </span>
                  <span className="ml-1.5 text-[11px] text-stone-300">{msg.text}</span>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-1.5">
          <Input
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            maxLength={200}
            className="border-stone-700 bg-stone-950 text-sm text-stone-100"
          />
          <Button onClick={handleSend} size="sm" className="gap-1 bg-amber-600 text-amber-50 hover:bg-amber-500">
            <Send className="size-3.5" />
          </Button>
        </div>
      </Card>

      {/* Guild War */}
      <Card className="gap-2 border-rose-900/40 bg-rose-950/15 p-3">
        <div className="flex items-center gap-2">
          <Swords className="size-4 text-rose-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-300">Guild War</span>
        </div>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {rivals.map((rival, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border border-stone-800/60 bg-stone-950/40 p-2">
              <span className="text-xl">{rival.avatar}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-stone-200">{rival.name}</div>
                <div className="text-[10px] text-stone-500">[{rival.tag}] · Power {formatNumber(rival.power)}</div>
              </div>
              <Button
                onClick={() => {
                  const r = declareWar(i);
                  if (r.success) {
                    if (r.won) {
                      toast.success("Victory!", { description: `Looted ${formatNumber(r.goldGained)} gold!` });
                    } else {
                      toast.error("Defeat", { description: "Your guild was overwhelmed." });
                    }
                  } else {
                    toast.error("Can't declare war", { description: r.reason });
                  }
                }}
                size="sm"
                className="gap-1 bg-rose-700 text-rose-50 hover:bg-rose-600"
              >
                <Swords className="size-3" />
                War
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Resource Trading */}
      <Card className="gap-2 border-stone-800/80 bg-stone-900/50 p-3">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="size-4 text-amber-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-300">Trade Resources</span>
        </div>
        <p className="text-[10px] text-stone-500">Exchange resources at a 10% tax. Rates: Gold 1.0, Wood 0.5, Stone 0.5, Iron 1.5</p>
        <div className="flex items-center gap-2">
          {/* Give */}
          <div className="flex-1 space-y-1">
            <Label className="text-[10px] text-stone-500">Give</Label>
            <select
              value={giveType}
              onChange={(e) => setGiveType(e.target.value as typeof giveType)}
              className="w-full rounded-md border border-stone-700 bg-stone-950 px-2 py-1 text-xs text-stone-100"
            >
              <option value="gold">Gold</option>
              <option value="wood">Wood</option>
              <option value="stone">Stone</option>
              <option value="iron">Iron</option>
            </select>
            <Input
              type="number"
              value={giveQty}
              onChange={(e) => setGiveQty(Math.max(1, parseInt(e.target.value) || 0))}
              className="border-stone-700 bg-stone-950 text-xs text-stone-100"
            />
          </div>
          <ArrowLeftRight className="mt-4 size-4 text-stone-600" />
          {/* Get */}
          <div className="flex-1 space-y-1">
            <Label className="text-[10px] text-stone-500">Get</Label>
            <select
              value={getType}
              onChange={(e) => setGetType(e.target.value as typeof getType)}
              className="w-full rounded-md border border-stone-700 bg-stone-950 px-2 py-1 text-xs text-stone-100"
            >
              <option value="gold">Gold</option>
              <option value="wood">Wood</option>
              <option value="stone">Stone</option>
              <option value="iron">Iron</option>
            </select>
            <div className="rounded-md border border-stone-700 bg-stone-950 px-2 py-1 text-xs text-amber-300">
              ≈ {Math.floor(giveQty * (giveType === 'gold' ? 1 : giveType === 'iron' ? 1.5 : 0.5) / (getType === 'gold' ? 1 : getType === 'iron' ? 1.5 : 0.5) * 0.9)}
            </div>
          </div>
        </div>
        <Button
          onClick={() => {
            const r = trade(giveType, giveQty, getType);
            if (r.success) {
              toast.success("Trade complete", { description: `Received ${formatNumber(r.received)} ${getType}.` });
            } else {
              toast.error("Trade failed", { description: r.reason });
            }
          }}
          size="sm"
          className="w-full gap-1 bg-amber-600 text-amber-50 hover:bg-amber-500"
        >
          <ArrowLeftRight className="size-3.5" />
          Trade
        </Button>
      </Card>
    </div>
  );
}

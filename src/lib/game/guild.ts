/**
 * ============================================================
 * GUILD SYSTEM
 * ============================================================
 * Players can create a guild, recruit NPC members, chat, declare
 * guild wars (vs NPC guilds), and trade resources. This is a
 * single-player simulation (NPC members + NPC rival guilds).
 * ============================================================
 */

import type { GameState, GuildState, GuildMember, GuildMessage } from './types';

/** NPC name + avatar pool for guild members. */
const NPC_NAMES: Array<{ name: string; avatar: string }> = [
  { name: 'Kael Ironfist', avatar: '⚔️' },
  { name: 'Mira Shadowblade', avatar: '🗡️' },
  { name: 'Dorn Hammerfall', avatar: '🔨' },
  { name: 'Sera Moonwhisper', avatar: '🌙' },
  { name: 'Vex Stormrider', avatar: '⚡' },
  { name: 'Lyra Goldhand', avatar: '💰' },
  { name: 'Gar Stoneheart', avatar: '🪨' },
  { name: 'Nyx Bloodthorn', avatar: '🌹' },
  { name: 'Thane Wolfkin', avatar: '🐺' },
  { name: 'Ash Firebrand', avatar: '🔥' },
];

/** Rival guild names for guild wars. */
const RIVAL_GUILDS: Array<{ name: string; tag: string; avatar: string; power: number }> = [
  { name: 'Crimson Vanguard', tag: 'CRM', avatar: '🔴', power: 5000 },
  { name: 'Iron Brotherhood', tag: 'IRN', avatar: '⚙️', power: 8000 },
  { name: 'Shadow Covenant', tag: 'SHD', avatar: '🌑', power: 12000 },
  { name: 'Dragon Legion', tag: 'DRG', avatar: '🐉', power: 20000 },
  { name: 'Eternal Flame', tag: 'ETN', avatar: '🔥', power: 30000 },
];

/** Pre-existing NPC guilds the player can browse and join. */
export interface JoinableGuild {
  id: string;
  name: string;
  tag: string;
  avatar: string;
  description: string;
  member_count: number;
  power: number;
  /** Minimum player level to join. */
  min_level: number;
  /** Speciality / theme. */
  theme: string;
}

/** The list of NPC guilds available to join. */
export const JOINABLE_GUILDS: JoinableGuild[] = [
  { id: 'g_wolves', name: 'Iron Wolves', tag: 'IRW', avatar: '🐺', description: 'A pack of fierce warriors who value loyalty and strength.', member_count: 8, power: 3200, min_level: 1, theme: 'Balanced' },
  { id: 'g_phoenix', name: 'Phoenix Reborn', tag: 'PHX', avatar: '🔥', description: 'Rising from ashes, this guild specializes in aggressive PvP.', member_count: 12, power: 8500, min_level: 3, theme: 'PvP Focus' },
  { id: 'g_stone', name: 'Stone Guard', tag: 'STG', avatar: '🪨', description: 'Defenders and builders. Masters of fortification.', member_count: 6, power: 4100, min_level: 1, theme: 'Defense' },
  { id: 'g_shadow', name: 'Shadow Syndicate', tag: 'SHD', avatar: '🌑', description: 'Rogues and assassins. Strike from the shadows.', member_count: 10, power: 6700, min_level: 5, theme: 'Stealth' },
  { id: 'g_dragon', name: 'Dragon Slayers', tag: 'DRS', avatar: '🐉', description: 'Elite hunters who slay the mightiest beasts.', member_count: 15, power: 15000, min_level: 8, theme: 'Hunting' },
  { id: 'g_merchants', name: 'Golden Hand', tag: 'GHD', avatar: '💰', description: 'Traders and crafters. Wealth is power.', member_count: 9, power: 5200, min_level: 2, theme: 'Economy' },
  { id: 'g_scholars', name: 'Arcane Order', tag: 'ARC', avatar: '📜', description: 'Wise sages who study the ancient arts of war.', member_count: 7, power: 7800, min_level: 6, theme: 'Magic' },
  { id: 'g_vikings', name: 'Frost Vikings', tag: 'FRV', avatar: '❄️', description: 'Raiders from the north. Cold, ruthless, relentless.', member_count: 11, power: 9200, min_level: 4, theme: 'Raiding' },
];

/** Create fresh guild state (not in a guild). */
export function createInitialGuild(): GuildState {
  return {
    guild_id: null,
    guild_name: null,
    guild_tag: null,
    messages: [],
    members: [],
    last_war_at: null,
  };
}

/** Whether the player is in a guild. */
export function isInGuild(state: GameState): boolean {
  return state.guild?.guild_id !== null && state.guild?.guild_id !== undefined;
}

/**
 * Create a new guild. Generates NPC members + a welcome message.
 * Returns new state.
 */
export function createGuild(
  state: GameState,
  name: string,
  tag: string,
): { state: GameState; ok: boolean; reason?: string } {
  if (isInGuild(state)) {
    return { state, ok: false, reason: 'Already in a guild' };
  }
  if (!name.trim() || name.trim().length < 3) {
    return { state, ok: false, reason: 'Guild name must be at least 3 characters' };
  }
  if (!tag.trim() || tag.trim().length < 2 || tag.trim().length > 4) {
    return { state, ok: false, reason: 'Tag must be 2-4 characters' };
  }

  const now = Date.now();
  // Generate 4-6 NPC members.
  const memberCount = 4 + Math.floor(Math.random() * 3);
  const shuffled = [...NPC_NAMES].sort(() => Math.random() - 0.5).slice(0, memberCount);
  const members: GuildMember[] = shuffled.map((npc, i) => ({
    id: `npc_${i}_${now}`,
    name: npc.name,
    avatar: npc.avatar,
    level: Math.max(1, state.player.level - 2 + Math.floor(Math.random() * 5)),
    power: Math.floor(500 + Math.random() * 2000 + state.player.level * 100),
    role: i === 0 ? 'officer' : 'member',
  }));
  // Add the player as leader.
  members.unshift({
    id: 'player',
    name: 'You',
    avatar: '🎖️',
    level: state.player.level,
    power: state.player.level * 100 + state.stats.total_victories * 50,
    role: 'leader',
    is_player: true,
  });

  const guildId = `guild_${now}`;
  const next = structuredClone(state);
  next.guild = {
    guild_id: guildId,
    guild_name: name.trim(),
    guild_tag: tag.trim().toUpperCase(),
    messages: [
      {
        id: `msg_${now}`,
        author: 'System',
        avatar: '📢',
        text: `Welcome to ${name.trim()}! Your guild is ready for adventure.`,
        timestamp: now,
        is_player: false,
      },
    ],
    members,
    last_war_at: null,
  };

  return { state: next, ok: true };
}

/**
 * Join an existing NPC guild. Generates NPC members based on the
 * guild's member_count + adds the player as a member.
 */
export function joinGuild(
  state: GameState,
  guildId: string,
): { state: GameState; ok: boolean; reason?: string } {
  if (isInGuild(state)) {
    return { state, ok: false, reason: 'Already in a guild' };
  }
  const guild = JOINABLE_GUILDS.find((g) => g.id === guildId);
  if (!guild) {
    return { state, ok: false, reason: 'Guild not found' };
  }
  if (state.player.level < guild.min_level) {
    return { state, ok: false, reason: `Requires level ${guild.min_level}` };
  }

  const now = Date.now();
  // Generate NPC members up to the guild's member_count (minus 1 for the player).
  const npcCount = Math.max(1, guild.member_count - 1);
  const shuffled = [...NPC_NAMES].sort(() => Math.random() - 0.5).slice(0, Math.min(npcCount, NPC_NAMES.length));
  const members: GuildMember[] = shuffled.map((npc, i) => ({
    id: `npc_${i}_${now}`,
    name: npc.name,
    avatar: npc.avatar,
    level: Math.max(1, state.player.level - 3 + Math.floor(Math.random() * 6)),
    power: Math.floor(300 + Math.random() * 1500 + state.player.level * 80),
    role: i === 0 ? 'officer' : 'member',
  }));
  // Add the player as a member (not leader — they joined an existing guild).
  members.unshift({
    id: 'player',
    name: 'You',
    avatar: '🎖️',
    level: state.player.level,
    power: state.player.level * 100 + state.stats.total_victories * 50,
    role: 'member',
    is_player: true,
  });

  const next = structuredClone(state);
  next.guild = {
    guild_id: guild.id,
    guild_name: guild.name,
    guild_tag: guild.tag,
    messages: [
      {
        id: `msg_${now}`,
        author: 'System',
        avatar: '📢',
        text: `Welcome to ${guild.name}! You've joined as a member.`,
        timestamp: now,
        is_player: false,
      },
    ],
    members,
    last_war_at: null,
  };

  return { state: next, ok: true };
}

/** Leave/disband the guild. */
export function leaveGuild(state: GameState): GameState {
  const next = structuredClone(state);
  next.guild = createInitialGuild();
  return next;
}

/** Send a chat message in the guild. NPC members may respond. */
export function sendGuildMessage(
  state: GameState,
  text: string,
): { state: GameState; replies: GuildMessage[] } {
  if (!isInGuild(state)) return { state, replies: [] };
  if (!text.trim()) return { state, replies: [] };

  const now = Date.now();
  const next = structuredClone(state);
  const playerMsg: GuildMessage = {
    id: `msg_${now}_p`,
    author: 'You',
    avatar: '🎖️',
    text: text.trim(),
    timestamp: now,
    is_player: true,
  };
  next.guild.messages.unshift(playerMsg);

  // 40% chance an NPC responds.
  const replies: GuildMessage[] = [];
  if (Math.random() < 0.4 && next.guild.members.length > 1) {
    const npcs = next.guild.members.filter((m) => !m.is_player);
    if (npcs.length > 0) {
      const responder = npcs[Math.floor(Math.random() * npcs.length)];
      const responses = [
        'Nice! Keep it up.',
        'I\'m grinding caves too.',
        'Anyone up for a guild war?',
        'Just recruited more troops.',
        'GG everyone.',
        'Let\'s coordinate our attacks.',
        'I found a rare item today!',
        'On it, commander.',
      ];
      const reply: GuildMessage = {
        id: `msg_${now}_n`,
        author: responder.name,
        avatar: responder.avatar,
        text: responses[Math.floor(Math.random() * responses.length)],
        timestamp: now + 1,
        is_player: false,
      };
      next.guild.messages.unshift(reply);
      replies.push(reply);
    }
  }

  // Cap messages at 50.
  next.guild.messages = next.guild.messages.slice(0, 50);
  return { state: next, replies };
}

/** Get rival guilds for guild war (scaled to player level). */
export function getRivalGuilds(state: GameState): typeof RIVAL_GUILDS {
  return RIVAL_GUILDS.map((g) => ({
    ...g,
    power: Math.floor(g.power * (0.5 + state.player.level * 0.1)),
  }));
}

/** Resolve a guild war. Returns result + new state. */
export function declareGuildWar(
  state: GameState,
  rivalIndex: number,
): { state: GameState; ok: boolean; won: boolean; goldGained: number; reason?: string } {
  if (!isInGuild(state)) {
    return { state, ok: false, won: false, goldGained: 0, reason: 'Not in a guild' };
  }
  const rivals = getRivalGuilds(state);
  if (rivalIndex < 0 || rivalIndex >= rivals.length) {
    return { state, ok: false, won: false, goldGained: 0, reason: 'Invalid rival' };
  }

  // Cooldown: 1 hour between guild wars.
  if (state.guild.last_war_at && Date.now() - state.guild.last_war_at < 60 * 60 * 1000) {
    return { state, ok: false, won: false, goldGained: 0, reason: 'Guild war on cooldown (1h)' };
  }

  const rival = rivals[rivalIndex];
  // Player's guild power = sum of member power.
  const playerPower = state.guild.members.reduce((s, m) => s + m.power, 0);
  const won = playerPower > rival.power * (0.7 + Math.random() * 0.6);

  const next = structuredClone(state);
  next.guild.last_war_at = Date.now();

  let goldGained = 0;
  if (won) {
    goldGained = Math.floor(rival.power * 0.5);
    next.player.gold += goldGained;
    if (next.prestige) {
      next.prestige.current_run_gold += goldGained;
    }
    next.guild.messages.unshift({
      id: `msg_${Date.now()}_war`,
      author: 'System',
      avatar: '⚔️',
      text: `Victory! We defeated ${rival.name} and looted ${goldGained} gold!`,
      timestamp: Date.now(),
      is_player: false,
    });
  } else {
    next.guild.messages.unshift({
      id: `msg_${Date.now()}_war`,
      author: 'System',
      avatar: '💀',
      text: `Defeat... ${rival.name} was too strong. Regroup and try again.`,
      timestamp: Date.now(),
      is_player: false,
    });
  }
  next.guild.messages = next.guild.messages.slice(0, 50);

  return { state: next, ok: true, won, goldGained };
}

/** Trade resources: convert gold into a resource or vice versa. */
export function tradeResources(
  state: GameState,
  giveType: 'gold' | 'wood' | 'stone' | 'iron',
  giveQty: number,
  getType: 'gold' | 'wood' | 'stone' | 'iron',
): { state: GameState; ok: boolean; received: number; reason?: string } {
  // Exchange rates (relative value).
  const rates: Record<string, number> = { gold: 1, wood: 0.5, stone: 0.5, iron: 1.5 };
  const giveValue = giveQty * rates[giveType];
  const receiveQty = Math.floor(giveValue / rates[getType] * 0.9); // 10% tax

  if (receiveQty <= 0) {
    return { state, ok: false, received: 0, reason: 'Trade too small' };
  }

  const next = structuredClone(state);
  // Deduct give.
  switch (giveType) {
    case 'gold': next.player.gold -= giveQty; break;
    case 'wood': next.resources.wood.current_amount -= giveQty; break;
    case 'stone': next.resources.stone.current_amount -= giveQty; break;
    case 'iron': next.resources.iron.current_amount -= giveQty; break;
  }
  // Add receive.
  switch (getType) {
    case 'gold': next.player.gold += receiveQty; break;
    case 'wood': next.resources.wood.current_amount += receiveQty; break;
    case 'stone': next.resources.stone.current_amount += receiveQty; break;
    case 'iron': next.resources.iron.current_amount += receiveQty; break;
  }

  return { state: next, ok: true, received: receiveQty };
}

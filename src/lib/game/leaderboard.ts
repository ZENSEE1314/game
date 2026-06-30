/**
 * ============================================================
 * LEADERBOARD
 * ============================================================
 * Generates a NPC leaderboard with ranks, then inserts the player
 * at their correct rank position based on a "power score".
 *
 * Power Score = victories * 50 + gold_looted / 10 + level * 10
 *
 * The roster is deterministic per player-level so it feels stable
 * across visits, but re-rolls when the player levels up.
 * ============================================================
 */

import type { GameState, LeaderboardEntry } from './types';

/** NPC leaderboard name + avatar pool. */
const LB_NAMES: Array<{ name: string; avatar: string }> = [
  { name: 'Dread Sovereign Vex', avatar: '👑' },
  { name: 'Iron Warden Kael', avatar: '🛡️' },
  { name: 'Pyre Lord Mordrak', avatar: '🔥' },
  { name: 'Whisper of Death', avatar: '💀' },
  { name: 'The Crimson Baron', avatar: '🗡️' },
  { name: 'Stormcaller Zyra', avatar: '⚡' },
  { name: 'Bone Emperor Thal', avatar: '☠️' },
  { name: 'Garrison Master Rev', avatar: '🏰' },
  { name: 'Nightfall Reva', avatar: '🌙' },
  { name: 'Forge Tyrant Dorn', avatar: '⚒️' },
  { name: 'Ashbringer Koth', avatar: '🌋' },
  { name: 'Silent Blade Sera', avatar: '🗡️' },
  { name: 'Wolfheart Gunnar', avatar: '🐺' },
  { name: 'Voidseer Mira', avatar: '🔮' },
  { name: 'Steel Fang Draven', avatar: '🪓' },
  { name: 'Goldhand Vesper', avatar: '💰' },
  { name: 'Rune Lord Azrak', avatar: '📜' },
  { name: 'Shroud Walker Nyx', avatar: '🌑' },
  { name: 'Battlepriest Orin', avatar: '⚔️' },
  { name: 'Frostfang Hela', avatar: '❄️' },
];

/** Compute the player's power score. */
export function playerPowerScore(state: GameState): number {
  const { stats, player, prestige } = state;
  return (
    stats.total_victories * 50 +
    Math.floor(stats.total_gold_looted / 10) +
    player.level * 10 +
    prestige.rebirth_count * 500 // each rebirth is worth a lot of "power"
  );
}

/**
 * Generate a full leaderboard of 20 NPCs + the player, sorted by power
 * score, with ranks assigned. The player's row is flagged `is_player`.
 *
 * NPC scores are seeded by the player's level so the roster is stable
 * within a level but scales up as the player progresses.
 */
export function generateLeaderboard(state: GameState): LeaderboardEntry[] {
  const playerScore = playerPowerScore(state);
  const playerLevel = state.player.level;

  // Generate 20 NPC entries with scores spread around the player's.
  const npcEntries: LeaderboardEntry[] = LB_NAMES.map((n, i) => {
    // Seeded pseudo-random based on index + player level.
    const seed = (i * 977 + playerLevel * 31337) % 2147483647;
    const rand = ((seed * 1103515245 + 12345) % 2147483647) / 2147483647;

    // Score distribution: some NPCs above, some below the player.
    // The spread widens with player level so there's always stronger foes.
    const spread = 1 + Math.floor(i / 4) * 0.4; // 1x, 1x, 1x, 1x, 1.4x, ...
    const base = Math.max(50, playerScore * (0.3 + rand * 1.8) * spread);
    const powerScore = Math.floor(base);

    // Derive plausible level/victories/battles from the score.
    const level = Math.max(1, Math.floor(powerScore / 80) + Math.floor(rand * 5));
    const victories = Math.floor(powerScore / 50);
    const battles = Math.floor(victories * (1.2 + rand * 0.6));
    const goldLooted = Math.floor(powerScore * 10 * (0.5 + rand));

    return {
      rank: 0, // assigned after sort
      name: n.name,
      avatar: n.avatar,
      level,
      victories,
      battles,
      gold_looted: goldLooted,
      power_score: powerScore,
      is_player: false,
      is_rebirthed: rand > 0.7, // some NPCs are "rebirthed" (flavor)
    };
  });

  // Player entry.
  const playerEntry: LeaderboardEntry = {
    rank: 0,
    name: state.player.id === 'player_1' ? 'Commander (You)' : 'You',
    avatar: '🎖️',
    level: state.player.level,
    victories: state.stats.total_victories,
    battles: state.stats.total_battles,
    gold_looted: state.stats.total_gold_looted,
    power_score: playerScore,
    is_player: true,
    is_rebirthed: state.prestige.rebirth_count > 0,
  };

  // Merge, sort desc, assign ranks.
  const all = [...npcEntries, playerEntry].sort((a, b) => b.power_score - a.power_score);
  all.forEach((e, i) => {
    e.rank = i + 1;
  });

  return all;
}

/** Find the player's entry + neighbors (for a "your rank" highlight). */
export function playerLeaderboardContext(entries: LeaderboardEntry[]): {
  player: LeaderboardEntry;
  above: LeaderboardEntry | null;
  below: LeaderboardEntry | null;
} {
  const idx = entries.findIndex((e) => e.is_player);
  return {
    player: entries[idx],
    above: idx > 0 ? entries[idx - 1] : null,
    below: idx < entries.length - 1 ? entries[idx + 1] : null,
  };
}

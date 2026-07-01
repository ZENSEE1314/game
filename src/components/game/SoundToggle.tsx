"use client";

/**
 * SoundToggle — a mute/unmute button for the procedural sound system.
 *
 * Reads/writes the mute state via the `sound` singleton (which persists
 * to localStorage). Renders a compact icon button (Volume2 / VolumeX).
 * Designed to sit in the ResourceBar or footer.
 */

import * as React from "react";
import { sound } from "@/lib/game/sound";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

export function SoundToggle({ className }: { className?: string }) {
  const [muted, setMuted] = React.useState(false);

  // Sync initial mute state on mount.
  React.useEffect(() => {
    setMuted(sound.isMuted());
  }, []);

  const handleToggle = () => {
    const next = sound.toggleMute();
    setMuted(next);
    // Play a short blip on un-mute so the user hears it worked.
    if (!next) {
      sound.play("loot");
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={muted ? "Unmute sound" : "Mute sound"}
      title={muted ? "Unmute sound" : "Mute sound"}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md border border-stone-700/60 bg-stone-900/60 text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-200",
        muted && "text-rose-400 hover:text-rose-300",
        className,
      )}
    >
      {muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
    </button>
  );
}

import { Volume2, VolumeX } from "lucide-react";
import { cue, saveSoundOn, useSoundOn } from "../lib/sfx";

/** One switch for game sounds and phone buzzes. The song itself plays either way. */
export function SoundToggle() {
  const on = useSoundOn();
  return <button type="button" className="kg-btn kg-btn--icon kg-sound" aria-label="Sound and buzz" aria-pressed={on}
    onClick={() => { saveSoundOn(!on); if (!on) cue("tap"); }}>
    {on ? <Volume2 size={20} aria-hidden="true" /> : <VolumeX size={20} aria-hidden="true" />}
  </button>;
}

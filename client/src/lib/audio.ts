/**
 * Sound effects and background music were removed: the 8.6 MB background track downloaded on
 * every visit (92% of page weight, LCP 6 s on mobile) and autoplaying audio hurts trust.
 * The hook is kept as a no-op so existing components keep working.
 */
const noop = () => {};
export function useAudio() {
  return { playHover: noop, playClick: noop, toggleMute: noop, isMuted: true };
}

import { AccessibilityInfo } from 'react-native';

type Listener = (message: string) => void;
let listener: Listener | null = null;

/**
 * A trip milestone worth a moment: the last checklist item ticked, the trip ready offline. `CelebrationHost` shows it;
 * screen readers hear it. Reserved for real milestones, never for an ordinary save, so it stays a surprise.
 */
export function celebrate(message: string) {
  listener?.(message);
  AccessibilityInfo.announceForAccessibility(message);
}

/** Used by the one `CelebrationHost`; returns the unsubscribe. */
export function onCelebrate(next: Listener): () => void {
  listener = next;
  return () => {
    if (listener === next) listener = null;
  };
}

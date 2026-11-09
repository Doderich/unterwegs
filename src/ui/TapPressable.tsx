import { useRef } from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps } from 'react-native';

/** Further than this between touch-down and release, the finger was scrolling, not tapping. */
const TAP_SLOP = 10;

/**
 * `Pressable` for React Native cards inside native lists (photo galleries, photo cards, hero and memory cards). A
 * native list scrolls without cancelling the React Native touch, so a plain `Pressable` would fire `onPress` when a
 * swipe that started on it ends. This one only counts a release close to where the finger came down.
 */
export function TapPressable({ onPress, onPressIn, ...props }: PressableProps) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return (
    <Pressable
      {...props}
      onPressIn={(event: GestureResponderEvent) => {
        start.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
        onPressIn?.(event);
      }}
      onPress={(event: GestureResponderEvent) => {
        const from = start.current;
        start.current = null;
        if (!onPress || !from) return;
        const moved = Math.hypot(event.nativeEvent.pageX - from.x, event.nativeEvent.pageY - from.y);
        if (moved <= TAP_SLOP) onPress(event);
      }}
    />
  );
}

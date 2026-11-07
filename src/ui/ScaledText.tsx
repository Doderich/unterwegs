import { Text, type TextProps, type TextStyle } from 'react-native';

import { rnTextScale } from '@/settings/apply';
import { useSettings } from '@/settings/store';

const BOLDER: Record<string, TextStyle['fontWeight']> = { '400': '600', '600': '800', '700': '800', '800': '900' };

/**
 * React Native text for the app's own cards (hero, "Als Nächstes", memories, stamps): follows the app's text size and
 * bold-text settings like the native rows do. `maxScale` caps growth inside a fixed-size box (DESIGN.md → Fixed-Box
 * Cap Rule); leave it out where the layout grows with the text.
 */
export function ScaledText({ style, maxScale, ...props }: TextProps & { style: TextStyle; maxScale?: number }) {
  const { textSize, boldText } = useSettings();
  const scale = rnTextScale(textSize);
  const factor = Math.min(scale ?? 1, maxScale ?? Infinity);
  return (
    <Text
      {...props}
      allowFontScaling={scale === null}
      maxFontSizeMultiplier={maxScale}
      style={[
        style,
        scale !== null && {
          fontSize: (style.fontSize ?? 17) * factor,
          lineHeight: style.lineHeight ? style.lineHeight * factor : undefined,
        },
        boldText && { fontWeight: BOLDER[String(style.fontWeight ?? '400')] ?? style.fontWeight },
      ]}
    />
  );
}

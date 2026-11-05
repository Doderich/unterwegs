import { useColors } from './theme';
import { Text } from './Text';
import { typeScale } from './typeScale';

/**
 * Secondary line of a list row. Passed as a node because iOS' plain-button row style
 * overrides the built-in secondary color of string `supportingText`.
 */
export function Sub({ children }: { children: string | null | undefined | false }) {
  const colors = useColors();
  if (!children) return null;
  return <Text textStyle={{ ...typeScale.supporting, color: colors.secondary }}>{children}</Text>;
}

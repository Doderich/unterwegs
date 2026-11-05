import { Host as NativeHost, type HostProps } from '@expo/ui/swift-ui';
import { bold } from '@expo/ui/swift-ui/modifiers';

import { useSettings } from '@/settings/store';

/** Cover native string labels, pickers and form controls as well as our explicit Text views. */
export function Host({ modifiers, ...props }: HostProps) {
  const { boldText } = useSettings();
  return <NativeHost {...props} modifiers={[...(boldText ? [bold()] : []), ...(modifiers ?? [])]} />;
}

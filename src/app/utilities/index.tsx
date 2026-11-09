import { FieldGroup } from '@expo/ui';
import { Host } from '@/ui/Host';
import { useRowTheme } from '@/ui/rows';
import { travelToolRows } from '@/ui/TravelToolRows';

export default function UtilitiesScreen() {
  const rt = useRowTheme();
  return (
    <Host style={{ flex: 1 }}>
      <FieldGroup>
        <FieldGroup.Section>{travelToolRows(rt)}</FieldGroup.Section>
      </FieldGroup>
    </Host>
  );
}

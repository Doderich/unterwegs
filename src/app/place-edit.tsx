import { useLocalSearchParams } from 'expo-router';
import { FieldGroup } from '@expo/ui';

import { useLocation } from '@/data/useLocation';
import { tr } from '@/i18n';
import { PlaceEditor } from '@/screens/PlaceEditor';
import { Host } from '@/ui/Host';
import { Text } from '@/ui/Text';

export default function PlaceEditScreen() {
  const { id, link } = useLocalSearchParams<{ id?: string; link?: string }>();
  const query = useLocation(id ?? '');
  if (id && !query.data)
    return (
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section>
            <Text>{query.isPending ? tr('common.loading') : tr('places.loadFailed')}</Text>
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    );
  return <PlaceEditor key={id ?? link ?? 'new'} location={query.data} sharedLink={link} />;
}

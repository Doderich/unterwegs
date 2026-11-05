import { FieldGroup } from '@expo/ui';
import { useLocalSearchParams } from 'expo-router';
import { useCollectionView } from '@/data/queries';
import { VisitEditor } from '@/screens/VisitEditor';
import { Host } from '@/ui/Host';
import { Text } from '@/ui/Text';
import { tr } from '@/i18n';

export default function VisitEditScreen() {
  const params = useLocalSearchParams<{ collectionId: string; locationId: string; visitId?: string; day?: string }>();
  const query = useCollectionView(params.collectionId);
  if (!query.view)
    return (
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section>
            <Text>{query.isPending ? tr('common.loading') : tr('common.couldntLoadTrip')}</Text>
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    );
  return <VisitEditor {...params} />;
}

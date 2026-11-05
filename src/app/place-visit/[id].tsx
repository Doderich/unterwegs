import { useLocalSearchParams } from 'expo-router';
import { VisitEditor } from '@/screens/VisitEditor';
import { useLocation } from '@/data/useLocation';
import { Host } from '@/ui/Host';
import { Text } from '@/ui/Text';
import { tr } from '@/i18n';

export default function PlaceVisitScreen() {
  const { id, visitId } = useLocalSearchParams<{ id: string; visitId?: string }>();
  const query = useLocation(id);
  if (!query.data)
    return (
      <Host style={{ flex: 1 }}>
        <Text>{query.isPending ? tr('common.loading') : tr('places.loadFailed')}</Text>
      </Host>
    );
  return <VisitEditor key={`${id}-${visitId ?? 'new'}`} locationId={id} visitId={visitId} />;
}

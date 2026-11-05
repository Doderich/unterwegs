import { FieldGroup } from '@expo/ui';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { Platform, View } from 'react-native';

import DaysScreen from '@/screens/DaysScreen';

import { useCollectionContext } from '@/data/CollectionContext';
import { tr } from '@/i18n';
import { PlanModeTabs } from '@/ui/PlanModeTabs';
import { Host } from '@/ui/Host';
import { LoadingRows } from '@/ui/LoadingRows';
import { Text } from '@/ui/Text';
import { Today } from '@/ui/Today';
import { useColors } from '@/ui/theme';

export default function PlanScreen() {
  const headerHeight = useHeaderHeight();
  const { planMode, setPlanMode } = useCollectionContext();
  return (
    <View style={{ flex: 1, paddingTop: Platform.OS === 'ios' ? headerHeight : 0 }}>
      <PlanModeTabs value={planMode} onChange={setPlanMode} />
      {planMode === 'overview' ? <DaysScreen /> : <TodayScreen />}
    </View>
  );
}

function TodayScreen() {
  const { view, query, selectedDay, setSelectedDay } = useCollectionContext();
  const colors = useColors();

  const message = !view ? tr('common.couldntLoadTrip') : view.days.length === 0 ? tr('today.tripHasNoDayPlan') : null;
  if (!view || message) {
    return (
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section>
            {!view && query.isPending && query.isFetching ? (
              <LoadingRows />
            ) : (
              <Text textStyle={{ color: colors.secondary }}>
                {query.fetchStatus === 'paused' && !view ? tr('common.offlineNoData') : (message ?? undefined)}
              </Text>
            )}
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    );
  }
  return (
    <Today insetHeader={Platform.OS !== 'ios'} view={view} initialDate={selectedDay} onDayChange={setSelectedDay} />
  );
}

import { FieldGroup } from '@expo/ui';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { Platform, View } from 'react-native';

import DaysScreen from '@/screens/DaysScreen';

import { useCollectionContext } from '@/data/CollectionContext';
import { tr } from '@/i18n';
import { CollectionLoading } from '@/ui/CollectionLoading';
import { PlanModeTabs } from '@/ui/PlanModeTabs';
import { Host } from '@/ui/Host';
import { Text } from '@/ui/Text';
import { Today } from '@/ui/Today';
import { useColors } from '@/ui/theme';

export default function PlanScreen() {
  const headerHeight = useHeaderHeight();
  const { view, planMode, setPlanMode } = useCollectionContext();
  const inset = { flex: 1, paddingTop: Platform.OS === 'ios' ? headerHeight : 0 } as const;
  if (!view) {
    return (
      <View style={inset}>
        <CollectionLoading />
      </View>
    );
  }
  return (
    <View style={inset}>
      <PlanModeTabs value={planMode} onChange={setPlanMode} />
      {planMode === 'overview' ? <DaysScreen /> : <TodayScreen />}
    </View>
  );
}

function TodayScreen() {
  const { view, selectedDay, setSelectedDay } = useCollectionContext();
  const colors = useColors();

  if (!view) return <CollectionLoading />;
  if (view.days.length === 0) {
    return (
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section>
            <Text textStyle={{ color: colors.secondary }}>{tr('today.tripHasNoDayPlan')}</Text>
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    );
  }
  return (
    <Today insetHeader={Platform.OS !== 'ios'} view={view} initialDate={selectedDay} onDayChange={setSelectedDay} />
  );
}

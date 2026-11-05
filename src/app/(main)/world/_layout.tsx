import { tr } from '@/i18n';
import { MainTabStack } from '@/ui/MainTabStack';

export default function TabLayout() {
  return <MainTabStack tab="world" title={tr('common.world')} />;
}

import { tr } from '@/i18n';
import { MainTabStack } from '@/ui/MainTabStack';

export default function PlacesLayout() {
  return <MainTabStack tab="places" title={tr('shell.places')} />;
}

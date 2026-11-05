import SearchScreen from '@/screens/SearchScreen';
import { useTabVisited } from '@/ui/useTabVisited';

export default function SearchTab() {
  const visited = useTabVisited();
  return visited ? <SearchScreen /> : null;
}

import { useCollectionContext } from '@/data/CollectionContext';
import SearchScreen from '@/screens/SearchScreen';
import { useTabVisited } from '@/ui/useTabVisited';

export default function SearchTab() {
  const { collectionId } = useCollectionContext();
  const visited = useTabVisited();
  return visited ? <SearchScreen initialCollectionId={collectionId} /> : null;
}

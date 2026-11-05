import { createContext, useContext, useState, type ReactNode } from 'react';

import { useCollectionOffline, type CollectionOfflineState } from '@/offline/useCollectionOffline';

import { useCollectionView } from './queries';
import type { CollectionView } from './selectors';

type CollectionContextValue = {
  collectionId: string;
  view: CollectionView | null;
  query: ReturnType<typeof useCollectionView>;
  offline: CollectionOfflineState;
  planMode: 'day' | 'overview';
  setPlanMode: (mode: 'day' | 'overview') => void;
  selectedDay: string | null;
  setSelectedDay: (date: string) => void;
};

const CollectionContext = createContext<CollectionContextValue | null>(null);

export function CollectionProvider({ collectionId, children }: { collectionId: string; children: ReactNode }) {
  const query = useCollectionView(collectionId);
  const offline = useCollectionOffline(query.data);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [planMode, setPlanMode] = useState<'day' | 'overview'>('day');
  return (
    <CollectionContext.Provider
      value={{ collectionId, view: query.view, query, offline, selectedDay, setSelectedDay, planMode, setPlanMode }}>
      {children}
    </CollectionContext.Provider>
  );
}

export function useCollectionContext(): CollectionContextValue {
  const ctx = useContext(CollectionContext);
  if (!ctx) throw new Error('useCollectionContext outside CollectionProvider');
  return ctx;
}

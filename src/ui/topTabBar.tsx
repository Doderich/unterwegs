import { createContext, useContext } from 'react';

import { useRegularWidth } from './regularWidth';

/** The iPad's top tab bar, measured on the iPad simulator (iPadOS 27): 36 pt buttons in a 52 pt band. */
const TOP_TAB_BAR = 52;

/** Height of the collection's tab bar when iPadOS draws it below the navigation bar instead of at the bottom. */
export function useTopTabBarHeight(): number {
  return useRegularWidth() ? TOP_TAB_BAR : 0;
}

/**
 * Set by the collection's tab layout. Screens that inset their React Native content by the header height add it;
 * screens outside the collection's tabs (the World map) get 0.
 */
const TopTabBarContext = createContext(0);
export const TopTabBarProvider = TopTabBarContext.Provider;
export const useTopTabBarInset = () => useContext(TopTabBarContext);

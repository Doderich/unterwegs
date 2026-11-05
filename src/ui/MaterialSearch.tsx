import type { ReactNode } from 'react';

export type SearchHeaderProps = {
  query: string;
  onChange: (query: string) => void;
  placeholder: string;
  onBack: () => void;
};
export type SearchLauncherProps = { placeholder: string; onPress: () => void };

/** Android supplies the Material search surface; iOS uses Stack.SearchBar. */
export function SearchHeader(_props: SearchHeaderProps): ReactNode {
  return null;
}
export function SearchLauncher(_props: SearchLauncherProps): ReactNode {
  return null;
}

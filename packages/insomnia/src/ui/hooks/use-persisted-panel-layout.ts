import { useDefaultLayout } from 'react-resizable-panels';

export function usePersistedPanelLayout(layoutId: string) {
  return useDefaultLayout({ id: layoutId });
}

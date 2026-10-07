import { useFocusEffect } from 'expo-router';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type TabBarVisibility = { hidden: boolean; setHidden: (hidden: boolean) => void };

const TabBarVisibilityContext = createContext<TabBarVisibility | null>(null);

/** Lets a tab screen hide the native tab bar while it is focused (NativeTabs `hidden`). */
export function TabBarVisibilityProvider({
  children,
}: {
  children: (hidden: boolean) => ReactNode;
}) {
  const [hidden, setHidden] = useState(false);
  const value = useMemo(() => ({ hidden, setHidden }), [hidden]);
  return (
    <TabBarVisibilityContext.Provider value={value}>
      {children(hidden)}
    </TabBarVisibilityContext.Provider>
  );
}

/** Hides the tab bar while the calling screen is focused, e.g. Record (08.x draws none). */
export function useHiddenTabBar() {
  const context = useContext(TabBarVisibilityContext);
  const setHidden = context?.setHidden;
  useFocusEffect(
    useCallback(() => {
      setHidden?.(true);
      return () => setHidden?.(false);
    }, [setHidden]),
  );
}

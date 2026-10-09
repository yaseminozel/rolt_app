const TAB_PATHS = { discover: '/discover', community: '/community', profile: '/profile' } as const;
type TabName = keyof typeof TAB_PATHS;

let lastTab: TabName = 'discover';

/** Remembers the tab under the record sheet (`(tabs)` focus listener). */
export function rememberTab(name: string) {
  if (name in TAB_PATHS) {
    lastTab = name as TabName;
  }
}

/** The tab to show under the record sheet when the Kaydet tab itself got selected. */
export function lastTabPath() {
  return TAB_PATHS[lastTab];
}

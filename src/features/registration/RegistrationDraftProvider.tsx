import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { RegistrationDraft } from './types';

type RegistrationDraftContextValue = {
  draft: RegistrationDraft;
  updateDraft: (changes: Partial<RegistrationDraft>) => void;
};

const RegistrationDraftContext = createContext<RegistrationDraftContextValue | null>(null);

const initialDraft: RegistrationDraft = {};

/** Holds registration answers while the user moves between steps; mounted by `register/_layout.tsx`. */
export function RegistrationDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<RegistrationDraft>(initialDraft);

  const updateDraft = useCallback((changes: Partial<RegistrationDraft>) => {
    setDraft((current) => ({ ...current, ...changes }));
  }, []);

  const value = useMemo(() => ({ draft, updateDraft }), [draft, updateDraft]);

  return <RegistrationDraftContext.Provider value={value}>{children}</RegistrationDraftContext.Provider>;
}

export function useRegistrationDraft() {
  const context = useContext(RegistrationDraftContext);
  if (!context) {
    throw new Error('useRegistrationDraft must be used inside RegistrationDraftProvider');
  }
  return context;
}

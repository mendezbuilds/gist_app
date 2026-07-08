import { create } from 'zustand';
import type { PublicProfile } from '../types/database';

type ContactsState = {
  contacts: PublicProfile[];
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  error: string | null;

  setContacts: (contacts: PublicProfile[]) => void;
  setSyncing: (syncing: boolean) => void;
  setError: (error: string | null) => void;
  setLastSynced: () => void;
  reset: () => void;
};

export const useContactsStore = create<ContactsState>((set) => ({
  contacts: [],
  isSyncing: false,
  lastSyncedAt: null,
  error: null,

  setContacts: (contacts) => set({ contacts, error: null }),
  setSyncing: (isSyncing) => set({ isSyncing }),
  setError: (error) => set({ error, isSyncing: false }),
  setLastSynced: () => set({ lastSyncedAt: new Date() }),
  reset: () =>
    set({ contacts: [], isSyncing: false, lastSyncedAt: null, error: null }),
}));

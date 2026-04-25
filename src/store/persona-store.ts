import { create } from 'zustand';
import type { Persona } from '@/types';

interface PersonaState {
  persona: Persona | null;
  setPersona: (persona: Persona | null) => void;
}

export const usePersonaStore = create<PersonaState>((set) => ({
  persona: null,
  setPersona: (persona) => set({ persona }),
}));

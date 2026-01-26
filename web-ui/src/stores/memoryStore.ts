// Simple Zustand store for memory state management
import { create } from "zustand";
import { Memory, MemorySettings } from "@/types";
import {
    loadMemories,
    addMemory as addMemoryToStorage,
    deleteMemory as deleteMemoryFromStorage,
    saveMemorySettings,
    loadMemorySettings,
} from "@/lib/memoryStorage";

interface MemoryStore {
    // State
    memories: Memory[];
    settings: MemorySettings;

    // Actions
    initialize: () => void;
    addMemory: (content: string, type?: 'instruction' | 'memory') => Memory;
    deleteMemory: (id: string) => void;
    toggleMemory: () => void;
    toggleAutoExtract: () => void;
    toggleInstructions: () => void;
    setMemoryEnabled: (enabled: boolean) => void;
    getAllMemories: () => Memory[];
}

export const useMemoryStore = create<MemoryStore>((set, get) => ({
    memories: [],
    settings: { isEnabled: true, autoExtract: true, enableInstructions: true },

    initialize: () => {
        const memories = loadMemories();
        const settings = loadMemorySettings();
        set({ memories, settings });
    },

    addMemory: (content: string, type: 'instruction' | 'memory' = 'memory') => {
        const newMemory = addMemoryToStorage(content, type);
        set((state) => ({
            memories: [...state.memories, newMemory],
        }));
        return newMemory;
    },

    deleteMemory: (id: string) => {
        deleteMemoryFromStorage(id);
        set((state) => ({
            memories: state.memories.filter((m) => m.id !== id),
        }));
    },

    toggleMemory: () => {
        set((state) => {
            const newSettings = {
                ...state.settings,
                isEnabled: !state.settings.isEnabled,
            };
            saveMemorySettings(newSettings);
            return { settings: newSettings };
        });
    },

    toggleAutoExtract: () => {
        set((state) => {
            const newSettings = {
                ...state.settings,
                autoExtract: !state.settings.autoExtract,
            };
            saveMemorySettings(newSettings);
            return { settings: newSettings };
        });
    },

    toggleInstructions: () => {
        set((state) => {
            const newSettings = {
                ...state.settings,
                enableInstructions: !state.settings.enableInstructions,
            };
            saveMemorySettings(newSettings);
            return { settings: newSettings };
        });
    },

    setMemoryEnabled: (enabled: boolean) => {
        set((state) => {
            const newSettings = {
                ...state.settings,
                isEnabled: enabled,
            };
            saveMemorySettings(newSettings);
            return { settings: newSettings };
        });
    },

    getAllMemories: () => get().memories,
}));

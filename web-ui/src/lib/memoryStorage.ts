// Simple memory storage utilities
import { Memory, MemorySettings } from "@/types";
import { v4 as uuidv4 } from "uuid";

const MEMORIES_KEY = "fath_ai_memories";
const MEMORY_SETTINGS_KEY = "fath_ai_memory_settings";

// Save all memories to localStorage
export function saveMemories(memories: Memory[]): void {
    try {
        localStorage.setItem(MEMORIES_KEY, JSON.stringify(memories));
    } catch (error) {
        console.error("Failed to save memories:", error);
    }
}

// Load all memories from localStorage
export function loadMemories(): Memory[] {
    try {
        const data = localStorage.getItem(MEMORIES_KEY);
        if (data) {
            const parsed = JSON.parse(data);
            // Migration: ensure type exists
            return parsed.map((m: any) => ({
                ...m,
                type: m.type || 'memory'
            }));
        }
    } catch (error) {
        console.error("Failed to load memories:", error);
    }
    return [];
}

// Add a new memory
export function addMemory(content: string, type: 'instruction' | 'memory' = 'memory'): Memory {
    const memories = loadMemories();

    const newMemory: Memory = {
        id: uuidv4(),
        content,
        type,
        createdAt: Date.now(),
    };

    memories.push(newMemory);
    saveMemories(memories);

    return newMemory;
}

// Delete a memory by ID
export function deleteMemory(id: string): void {
    const memories = loadMemories();
    const updated = memories.filter((m) => m.id !== id);
    saveMemories(updated);
}

// Save memory settings
export function saveMemorySettings(settings: MemorySettings): void {
    try {
        localStorage.setItem(MEMORY_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error("Failed to save memory settings:", error);
    }
}

// Load memory settings
export function loadMemorySettings(): MemorySettings {
    try {
        const data = localStorage.getItem(MEMORY_SETTINGS_KEY);
        if (data) {
            return JSON.parse(data);
        }
    } catch (error) {
        console.error("Failed to load memory settings:", error);
    }
    return { isEnabled: true, autoExtract: true, enableInstructions: true };
}

// Format all memories for the system prompt
export function formatMemoriesForPrompt(memories: Memory[]): string {
    if (memories.length === 0) return '';

    const instructions = memories.filter(m => m.type === 'instruction');
    const pastChats = memories.filter(m => m.type === 'memory' || !m.type);

    let formatted = '';

    if (instructions.length > 0) {
        formatted += '\n\nUser Instructions:\n';
        for (const m of instructions) {
            formatted += `- ${m.content}\n`;
        }
    }

    if (pastChats.length > 0) {
        formatted += '\n\nMemory / Context from past conversations:\n';
        for (const m of pastChats) {
            formatted += `- ${m.content}\n`;
        }
    }

    if (formatted.length > 0) {
        formatted += '\nUse these memories naturally in conversation when relevant.';
    }

    return formatted;
}

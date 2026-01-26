// Simple memory types for persistent user context across conversations

export interface Memory {
    id: string;
    content: string;           // The actual memory content
    createdAt: number;         // Timestamp when created
    type: 'instruction' | 'memory'; // 'instruction' = manual user rule, 'memory' = auto-learned
}

export interface MemorySettings {
    isEnabled: boolean;        // Global toggle
    autoExtract: boolean;      // Automatically extract memories from conversations
    enableInstructions: boolean; // Enable/disable user instructions
}

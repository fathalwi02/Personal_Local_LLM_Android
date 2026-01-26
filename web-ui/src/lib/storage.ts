// Local storage utilities for conversation persistence
import { Conversation } from "@/types";

const CONVERSATIONS_KEY = "localllm_conversations";
const ACTIVE_CONVERSATION_KEY = "localllm_active_conversation";

export function saveConversations(conversations: Conversation[]): void {
    try {
        localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
    } catch (error) {
        console.error("Failed to save conversations:", error);
    }
}

export function loadConversations(): Conversation[] {
    try {
        const data = localStorage.getItem(CONVERSATIONS_KEY);
        if (data) {
            return JSON.parse(data);
        }
    } catch (error) {
        console.error("Failed to load conversations:", error);
    }
    return [];
}

export function saveActiveConversationId(id: string | null): void {
    try {
        if (id) {
            localStorage.setItem(ACTIVE_CONVERSATION_KEY, id);
        } else {
            localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
        }
    } catch (error) {
        console.error("Failed to save active conversation ID:", error);
    }
}

export function loadActiveConversationId(): string | null {
    try {
        return localStorage.getItem(ACTIVE_CONVERSATION_KEY);
    } catch (error) {
        console.error("Failed to load active conversation ID:", error);
    }
    return null;
}
// Generate a smart title using LLM based on conversation context
export async function generateSmartTitle(
    messages: { role: string; content: string }[]
): Promise<string | null> {
    try {
        const response = await fetch('/api/title/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages }),
        });

        if (!response.ok) {
            console.error('Failed to generate smart title');
            return null;
        }

        const data = await response.json();
        return data.title || null;
    } catch (error) {
        console.error('Error generating smart title:', error);
        return null;
    }
}

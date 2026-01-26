// Zustand store for chat state management
import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { Conversation, Message } from "@/types";
import {
    saveConversations,
    loadConversations,
    saveActiveConversationId,
    loadActiveConversationId,
    generateSmartTitle,
} from "@/lib/storage";

interface ChatStore {
    // State
    conversations: Conversation[];
    activeConversationId: string | null;
    isLoading: boolean;
    abortController: AbortController | null;

    // Computed
    activeConversation: () => Conversation | null;

    // Actions
    initialize: () => void;
    createConversation: (model: string) => string;
    deleteConversation: (id: string) => void;
    renameConversation: (id: string, title: string) => void;
    setActiveConversation: (id: string | null) => void;

    // Message actions
    addMessage: (message: Omit<Message, "id" | "timestamp">) => Message;
    updateMessage: (id: string, content: string, sources?: { title: string; url: string; domain?: string; favicon?: string }[], searchQueries?: string[]) => void;
    deleteMessage: (id: string) => void;
    editMessage: (id: string, newContent: string) => void;
    clearMessages: () => void;

    // Loading state
    setIsLoading: (loading: boolean) => void;
    setAbortController: (controller: AbortController | null) => void;
    stopGeneration: () => void;

    // Auto title generation
    autoGenerateTitle: (conversationId: string) => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
    conversations: [],
    activeConversationId: null,
    isLoading: false,
    abortController: null,

    activeConversation: () => {
        const { conversations, activeConversationId } = get();
        return conversations.find((c) => c.id === activeConversationId) || null;
    },

    initialize: () => {
        const conversations = loadConversations();
        const activeId = loadActiveConversationId();
        set({
            conversations,
            activeConversationId: activeId && conversations.some((c) => c.id === activeId)
                ? activeId
                : conversations[0]?.id || null,
        });
    },

    createConversation: (model: string) => {
        const id = uuidv4();
        const newConversation: Conversation = {
            id,
            title: "New Conversation",
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            model,
        };

        set((state) => {
            const updated = [newConversation, ...state.conversations];
            saveConversations(updated);
            saveActiveConversationId(id);
            return { conversations: updated, activeConversationId: id };
        });

        return id;
    },

    deleteConversation: (id: string) => {
        set((state) => {
            const updated = state.conversations.filter((c) => c.id !== id);
            saveConversations(updated);

            let newActiveId = state.activeConversationId;
            if (state.activeConversationId === id) {
                newActiveId = updated[0]?.id || null;
                saveActiveConversationId(newActiveId);
            }

            return { conversations: updated, activeConversationId: newActiveId };
        });
    },

    renameConversation: (id: string, title: string) => {
        set((state) => {
            const updated = state.conversations.map((c) =>
                c.id === id ? { ...c, title, updatedAt: Date.now() } : c
            );
            saveConversations(updated);
            return { conversations: updated };
        });
    },

    setActiveConversation: (id: string | null) => {
        saveActiveConversationId(id);
        set({ activeConversationId: id });
    },

    addMessage: (message) => {
        const newMessage: Message = {
            ...message,
            id: uuidv4(),
            timestamp: Date.now(),
        };

        set((state) => {
            const updated = state.conversations.map((c) => {
                if (c.id === state.activeConversationId) {
                    const messages = [...c.messages, newMessage];
                    return { ...c, messages, updatedAt: Date.now() };
                }
                return c;
            });
            saveConversations(updated);
            return { conversations: updated };
        });

        return newMessage;
    },

    updateMessage: (id: string, content: string, sources?: { title: string; url: string; domain?: string; favicon?: string }[], searchQueries?: string[]) => {
        set((state) => {
            const updated = state.conversations.map((c) => {
                if (c.id === state.activeConversationId) {
                    return {
                        ...c,
                        messages: c.messages.map((m) =>
                            m.id === id ? {
                                ...m,
                                content,
                                ...(sources && { sources }),
                                ...(searchQueries && { searchQueries })
                            } : m
                        ),
                        updatedAt: Date.now(),
                    };
                }
                return c;
            });
            saveConversations(updated);
            return { conversations: updated };
        });
    },

    deleteMessage: (id: string) => {
        set((state) => {
            const updated = state.conversations.map((c) => {
                if (c.id === state.activeConversationId) {
                    return {
                        ...c,
                        messages: c.messages.filter((m) => m.id !== id),
                        updatedAt: Date.now(),
                    };
                }
                return c;
            });
            saveConversations(updated);
            return { conversations: updated };
        });
    },

    editMessage: (id: string, newContent: string) => {
        set((state) => {
            const updated = state.conversations.map((c) => {
                if (c.id === state.activeConversationId) {
                    return {
                        ...c,
                        messages: c.messages.map((m) =>
                            m.id === id ? { ...m, content: newContent, isEdited: true } : m
                        ),
                        updatedAt: Date.now(),
                    };
                }
                return c;
            });
            saveConversations(updated);
            return { conversations: updated };
        });
    },

    clearMessages: () => {
        set((state) => {
            const updated = state.conversations.map((c) => {
                if (c.id === state.activeConversationId) {
                    return { ...c, messages: [], updatedAt: Date.now() };
                }
                return c;
            });
            saveConversations(updated);
            return { conversations: updated };
        });
    },

    setIsLoading: (loading: boolean) => set({ isLoading: loading }),

    setAbortController: (controller: AbortController | null) => set({ abortController: controller }),

    stopGeneration: () => {
        const { abortController } = get();
        if (abortController) {
            abortController.abort();
            set({ abortController: null, isLoading: false });
        }
    },

    autoGenerateTitle: async (conversationId: string) => {
        const { conversations, renameConversation } = get();
        const conversation = conversations.find(c => c.id === conversationId);

        // Only generate if the title is still default
        if (!conversation || conversation.title !== "New Conversation") {
            return;
        }

        // Need at least one user and one assistant message
        const userMessage = conversation.messages.find(m => m.role === "user");
        const assistantMessage = conversation.messages.find(m => m.role === "assistant");

        if (!userMessage || !assistantMessage) {
            return;
        }

        // Call the LLM to generate a smart title
        const smartTitle = await generateSmartTitle([
            { role: "user", content: userMessage.content },
            { role: "assistant", content: assistantMessage.content }
        ]);

        if (smartTitle && smartTitle !== "New Chat") {
            renameConversation(conversationId, smartTitle);
        }
    },
}));

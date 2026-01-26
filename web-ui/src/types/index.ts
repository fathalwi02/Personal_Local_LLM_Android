// Types for the Local LLM application

export interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    isSearchResult?: boolean;
    sources?: { title: string; url: string; domain?: string; favicon?: string }[];
    searchQueries?: string[];
    timestamp: number;
    isEdited?: boolean;
}

export interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    createdAt: number;
    updatedAt: number;
    model: string;
}

export interface Model {
    name: string;
    model: string;
}

// View types for navigation
export type ViewType = 'chat' | 'chats' | 'projects' | 'project-detail' | 'personal-context';

export interface ChatSettings {
    webSearchEnabled: boolean;
    selectedModel: string;
}

// Project types
export interface ProjectFile {
    id: string;
    name: string;
    content: string;
    type: 'pdf' | 'text' | 'document';
    createdAt: number;
}

export interface Project {
    id: string;
    name: string;
    description: string;
    instructions: string;
    files: ProjectFile[];
    conversationIds: string[];
    createdAt: number;
    updatedAt: number;
}

// Memory types
export * from './memory';

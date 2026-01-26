// Simple token estimation utility
// This is a rough approximation - actual token counts vary by model

/**
 * Estimates token count using a simple character-based heuristic.
 * On average, 1 token ≈ 4 characters for English text.
 * Code tends to have more tokens per character.
 */
export function estimateTokens(text: string): number {
    if (!text) return 0;

    // Basic estimation: ~4 chars per token for English
    // Adjust for code (more tokens due to special characters)
    const codeBlockCount = (text.match(/```/g) || []).length / 2;
    const hasLotsOfCode = codeBlockCount > 0;

    const charsPerToken = hasLotsOfCode ? 3.5 : 4;
    return Math.ceil(text.length / charsPerToken);
}

/**
 * Estimates total tokens for a conversation (messages array)
 */
export function estimateConversationTokens(
    messages: { role: string; content: string }[]
): number {
    let total = 0;

    for (const message of messages) {
        // Add overhead for message structure (role, etc.)
        total += 4;
        total += estimateTokens(message.content);
    }

    // Add fixed overhead for conversation structure
    total += 3;

    return total;
}

/**
 * Format token count for display
 */
export function formatTokenCount(count: number): string {
    if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
}

/**
 * Get context window usage percentage
 */
export function getContextUsage(tokens: number, maxContext: number): number {
    return Math.min(100, (tokens / maxContext) * 100);
}

/**
 * Common model context sizes (in tokens)
 */
export const MODEL_CONTEXT_SIZES: Record<string, number> = {
    "llama3.1:8b": 128000,
    "llama3.2:3b": 128000,
    "llama3.2:1b": 128000,
    "mistral:7b": 32000,
    "mixtral:8x7b": 32000,
    "gemma2:9b": 8192,
    "gemma2:27b": 8192,
    "qwen2.5:7b": 128000,
    "phi3:mini": 128000,
    "codellama:7b": 16384,
    default: 4096,
};

/**
 * Get context size for a model
 */
export function getModelContextSize(modelName: string): number {
    // Try exact match first
    if (MODEL_CONTEXT_SIZES[modelName]) {
        return MODEL_CONTEXT_SIZES[modelName];
    }

    // Try prefix match (e.g., "llama3.1:8b-instruct" matches "llama3.1:8b")
    for (const [key, value] of Object.entries(MODEL_CONTEXT_SIZES)) {
        if (modelName.startsWith(key)) {
            return value;
        }
    }

    return MODEL_CONTEXT_SIZES.default;
}

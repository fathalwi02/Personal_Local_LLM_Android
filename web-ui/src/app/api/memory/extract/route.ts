import { NextRequest } from "next/server";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

interface Message {
    role: string;
    content: string;
}

export async function POST(request: NextRequest) {
    try {
        const { messages } = await request.json();

        if (!messages || messages.length === 0) {
            return new Response(
                JSON.stringify({ memories: [] }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        }

        // Build conversation context for extraction
        const conversationText = messages
            .map((m: Message) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
            .join('\n');

        const extractionPrompt = `Analyze the following conversation and proactively extract ANY useful details, preferences, or context about the user or their project that should be remembered.
        
Don't be shy—store more rather than less. Even small details about code style (e.g., "likes arrow functions"), specific hardware (e.g., "using S7-1200 PLC"), or project goals are valuable.

Focus on:
- User's identity and professional role (e.g., "Automation Engineer").
- Technical preferences (Language: Python/TS, libraries used, preferred patterns).
- Explicit instructions given (e.g., "Don't use glassmorphism").
- Current project details (What are they building? What specific hardware/software?).
- Any specific constraints mentioned.

Return ONLY a JSON array of strings. Each string must be a concise, standalone fact.
Example output: ["User is working on a Siemens S7-1200 data logger", "User prefers solid background over glassmorphism", "Project uses Next.js and Tailwind"]

Conversation:
${conversationText}

Respond ONLY with the JSON array, no other text:`;

        const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama3.1:8b",
                prompt: extractionPrompt,
                stream: false,
                options: {
                    temperature: 0.3,
                },
            }),
        });

        if (!ollamaResponse.ok) {
            throw new Error(`Ollama error: ${ollamaResponse.statusText}`);
        }

        const data = await ollamaResponse.json();
        const responseText = data.response?.trim() || '[]';

        // Parse the JSON response
        let extractedFacts: string[] = [];
        try {
            // Try to extract JSON array from the response
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                // Handle both string array and object array formats
                if (Array.isArray(parsed)) {
                    extractedFacts = parsed
                        .map((item: string | { content?: string }) =>
                            typeof item === 'string' ? item : item.content
                        )
                        .filter((content: string | undefined): content is string =>
                            typeof content === 'string' && content.length > 0
                        );
                }
            }
        } catch {
            console.error("Failed to parse memory extraction response:", responseText);
            extractedFacts = [];
        }

        // Convert to memory format (just content)
        const sanitizedMemories = extractedFacts
            .slice(0, 5) // Limit to 5 memories per extraction
            .map((content: string) => ({
                content: content.substring(0, 300), // Limit length
            }));

        return new Response(
            JSON.stringify({ memories: sanitizedMemories }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Memory extraction error:", error);
        return new Response(
            JSON.stringify({ error: "Failed to extract memories", memories: [] }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

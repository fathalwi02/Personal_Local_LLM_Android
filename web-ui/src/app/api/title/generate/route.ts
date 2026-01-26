import { NextRequest } from "next/server";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

interface Message {
    role: string;
    content: string;
}

export async function POST(request: NextRequest) {
    try {
        const { messages } = await request.json();

        if (!messages || messages.length < 2) {
            return new Response(
                JSON.stringify({ title: "New Chat" }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        }

        const userMessage = messages.find((m: Message) => m.role === "user")?.content || "";
        const assistantMessage = messages.find((m: Message) => m.role === "assistant")?.content || "";

        const prompt = `Generate a short, concise title (3-5 words max) that summarizes this conversation. Reply with ONLY the title, no quotes or punctuation.

User: ${userMessage.substring(0, 500)}
Assistant: ${assistantMessage.substring(0, 500)}

Title:`;

        const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama3.1:8b",
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.3,
                    num_predict: 20,
                },
            }),
        });

        if (!ollamaResponse.ok) {
            throw new Error(`Ollama error: ${ollamaResponse.statusText}`);
        }

        const data = await ollamaResponse.json();
        let title = data.response?.trim() || "New Chat";

        // Clean up the title
        title = title.replace(/^["']|["']$/g, ""); // Remove quotes
        title = title.replace(/\.$/, ""); // Remove trailing period
        title = title.substring(0, 50); // Limit length

        return new Response(
            JSON.stringify({ title }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Title generation error:", error);
        return new Response(
            JSON.stringify({ title: "New Chat" }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    }
}

import { NextResponse } from "next/server";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

export async function GET() {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);

        if (!response.ok) {
            throw new Error(`Ollama error: ${response.statusText}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Models API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch models", models: [] },
            { status: 500 }
        );
    }
}

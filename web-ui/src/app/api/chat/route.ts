import { NextRequest } from "next/server";

import { Memory } from "@/types";
import { formatMemoriesForPrompt } from "@/lib/memoryStorage";
import { intelligentSearch, EnrichedSearchResult } from "../searchUtils";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

interface SearchOutput {
    formattedResults: string;
    sources: { title: string; url: string; domain?: string; favicon?: string }[];
    queries: string[];
}

// Helper to select persona based on search mode
function getSystemPrompt(mode: string): string {
    const today = new Date().toISOString().split('T')[0];

    const BASE_ENGINEER = `You are Fath-AI, an industrial process engineer assistant.
Current Date: ${today}

DOMAIN EXPERTISE:
- Lithium-ion battery manufacturing
- Semiconductor processes
- Automation & PLC/SCADA
- Yield improvement & Root cause analysis

RESPONSE GUIDELINES:
- Focus on manufacturing constraints and trade-offs
- Highlight engineering specifications and standards
- Provide practical, actionable insights
- Avoid generic consumer-level advice
- Use structured Markdown (headers, lists, tables, code blocks)`;

    const CODING_EXPERT = `You are Fath-AI, an Expert Industrial Automation Developer.
Current Date: ${today}

EXPERTISE:
- Python (pymodbus, snap7, pandas, asyncio)
- Modbus TCP/RTU, Siemens S7, OPC-UA
- CachyOS/Arch Linux systems
- Rust, Systems Engineering

GUIDELINES:
- Provide production-ready, tested code
- Always explain error handling and thread safety
- Include type hints and docstrings
- Prefer industry-standard libraries (pymodbus, snap7)
- Use structured Markdown with proper code blocks`;

    const SCIENTIFIC_RESEARCHER = `You are Fath-AI, a Technical Research Assistant specialized in scientific literature.
Current Date: ${today}

EXPERTISE:
- Academic paper analysis and synthesis
- Experimental methodology evaluation
- Data interpretation and statistical analysis

GUIDELINES:
- Focus on methodology, results, and conclusions from papers
- Cite specific findings with source numbers
- Explain theoretical foundations clearly
- Highlight research gaps and future directions
- Use structured Markdown with proper citations`;

    const GENERAL_ASSISTANT = `You are Fath-AI, a helpful and precise Research Assistant.
Current Date: ${today}

GUIDELINES:
- Provide clear, direct, and accurate summaries
- Focus on the latest facts from search results
- Be concise but comprehensive
- Do NOT be overly technical unless the topic requires it
- Use structured Markdown for clarity`;

    switch (mode) {
        case 'code': return CODING_EXPERT;
        case 'general': return GENERAL_ASSISTANT;
        case 'scientific': return SCIENTIFIC_RESEARCHER;
        case 'industrial':
        case 'auto':
        default: return BASE_ENGINEER;
    }
}

async function performWebSearch(query: string, model: string, searchMode: any = 'auto'): Promise<SearchOutput> {
    try {
        // Enable content fetching (true) and use 8 results
        const searchResponse = await intelligentSearch(query, model, 8, true, searchMode);

        if (searchResponse.results.length === 0) {
            return {
                formattedResults: `No search results found for your query.`,
                sources: [],
                queries: searchResponse.queries,
            };
        }

        const sources = searchResponse.results.map((r: EnrichedSearchResult) => ({
            title: r.title,
            url: r.url,
            domain: r.domain,
            favicon: r.favicon,
        }));

        return {
            formattedResults: searchResponse.formattedContext,
            sources,
            queries: searchResponse.queries,
        };
    } catch (error) {
        console.error("Search error:", error);
        return {
            formattedResults: `Web search failed: ${error}. Please try again.`,
            sources: [],
            queries: [],
        };
    }
}


export async function POST(request: NextRequest) {
    try {
        const { messages, model, webSearch, thinking, memories, files, searchMode } = await request.json();

        // Dynamic persona based on search mode
        let systemPrompt = getSystemPrompt(searchMode || 'auto');
        const augmentedMessages = [...messages];

        // If memories are provided, inject them into the system prompt
        if (memories && Array.isArray(memories) && memories.length > 0) {
            const memoryContext = formatMemoriesForPrompt(memories);
            systemPrompt += memoryContext;
        }

        let searchSources: { title: string; url: string; domain?: string; favicon?: string }[] = [];
        let searchQueries: string[] = [];

        // If web search is enabled, search and augment the context
        if (webSearch && messages.length > 0) {
            const lastUserMessage = messages[messages.length - 1];
            if (lastUserMessage.role === "user") {
                // ENABLE CONTENT FETCHING: Set 4th arg to true (was false)
                const searchResult = await performWebSearch(lastUserMessage.content, model, searchMode);
                searchSources = searchResult.sources;
                searchQueries = searchResult.queries;

                // INJECT INTO LAST USER MESSAGE (RAG Style) - FORCEFUL OVERRIDE
                const lastIdx = augmentedMessages.length - 1;
                const originalQuery = augmentedMessages[lastIdx].content;

                // Check if we actually got results
                if (searchResult.sources.length > 0) {
                    augmentedMessages[lastIdx] = {
                        ...augmentedMessages[lastIdx],
                        content: `CONTEXT: I just performed a real-time web search on ${new Date().toISOString().split('T')[0]} to answer this question.

QUESTION: "${originalQuery}"

SEARCH RESULTS (${searchResult.sources.length} sources found):
${searchResult.formattedResults}

INSTRUCTIONS FOR YOUR RESPONSE:
1. You MUST answer using ONLY the search results above
2. These are REAL search results from ${new Date().getFullYear()}, NOT from your training data
3. DO NOT say "my training data only goes to 2022" or "I don't have access to future information"
4. If you say anything about your training cutoff, you are WRONG - you have current data above
5. Cite sources as [Source 1], [Source 2], etc.
6. If the results don't fully answer the question, use what's available and say what's missing

NOW ANSWER THE QUESTION: "${originalQuery}"`
                    };
                } else {
                    // No results found - be explicit about it
                    augmentedMessages[lastIdx] = {
                        ...augmentedMessages[lastIdx],
                        content: `${originalQuery}

[NOTE: A web search was attempted but returned no results. Please answer based on your general knowledge and clearly state that you don't have specific current information about this topic.]`
                    };
                }
            }
        }


        // If thinking/reasoning is enabled, inject enhanced CoT instructions
        if (thinking) {
            systemPrompt += `

THINKING MODE ENABLED

You MUST start your response with <think> and follow this exact 5-step reasoning framework:

<think>
1. UNDERSTAND: What does the user want to know? Identify the core question(s).

2. BREAK DOWN: List the key components of the problem.

3. ANALYZE: For each component, what do I know? Find specific facts, dates, and examples.

4. REASON: Work through the logic step by step. Connect the facts to form conclusions.

5. VERIFY: Does my reasoning address the question? Check for completeness.
</think>

[Your comprehensive answer here with [Source N] citations]

CRITICAL RULES:
1. Your response MUST begin with <think>
2. Follow all 5 steps explicitly with their labels
3. Close with </think> before your answer
4. Your answer MUST appear AFTER </think>`;
        }

        // Extract images from files for Ollama vision models
        const images: string[] = [];
        if (files && Array.isArray(files)) {
            for (const file of files) {
                if (file.type === "image" && file.content) {
                    // Remove data URL prefix to get pure base64
                    const base64 = file.content.replace(/^data:image\/\w+;base64,/, "");
                    images.push(base64);
                }
            }
        }

        // Create the Ollama request with optimized parameters
        const ollamaRequest: any = {
            model: model || "qwen2-1.5b",
            messages: [{ role: "system", content: systemPrompt }, ...augmentedMessages],
            stream: true,
            options: {
                temperature: thinking ? 0.4 : (webSearch ? 0.3 : 0.7),  // Lower temp for reasoning
                top_p: thinking ? 0.95 : 0.9,  // Slightly higher for creative reasoning
                repeat_penalty: 1.15,  // Reduce repetitive outputs
                num_ctx: thinking ? 8192 : 4096,  // Extended context for deep thinking
                num_predict: thinking ? 2048 : 1024,  // Allow longer responses for reasoning
            },
        };

        // Add images to the last message if there are any
        if (images.length > 0 && ollamaRequest.messages.length > 0) {
            const lastMessage = ollamaRequest.messages[ollamaRequest.messages.length - 1];
            lastMessage.images = images;
        }

        const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(ollamaRequest),
        });

        if (!ollamaResponse.ok) {
            throw new Error(`Ollama error: ${ollamaResponse.statusText}`);
        }

        // Create a streaming response
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                // Send sources and queries first if web search was used
                if (searchSources.length > 0 || searchQueries.length > 0) {
                    const sourcesData = `data: ${JSON.stringify({ sources: searchSources, queries: searchQueries })}\n\n`;
                    controller.enqueue(encoder.encode(sourcesData));
                }

                const reader = ollamaResponse.body?.getReader();
                if (!reader) {
                    controller.close();
                    return;
                }

                const decoder = new TextDecoder();

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value);
                        const lines = chunk.split("\n").filter((line) => line.trim());

                        for (const line of lines) {
                            try {
                                const json = JSON.parse(line);
                                if (json.message?.content) {
                                    const sseData = `data: ${JSON.stringify({ content: json.message.content })}\n\n`;
                                    controller.enqueue(encoder.encode(sseData));
                                }
                            } catch {
                                // Skip invalid JSON lines
                            }
                        }
                    }
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (error) {
        console.error("Chat API error:", error);
        return new Response(
            JSON.stringify({ error: "Failed to process chat request" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

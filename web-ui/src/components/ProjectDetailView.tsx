"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
    ArrowLeft,
    MoreHorizontal,
    Star,
    Plus,
    Send,
    Loader2,
    FileText,
    X,
    ChevronDown
} from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { useChatStore } from "@/stores/chatStore";
import { useMemoryStore } from "@/stores/memoryStore";
import { Model, Memory } from "@/types";

interface ProjectDetailViewProps {
    projectId: string;
    onBack: () => void;
    models: Model[];
    selectedModel: string;
    onModelChange: (model: string) => void;
}

export default function ProjectDetailView({
    projectId,
    onBack,
    models,
    selectedModel,
    onModelChange
}: ProjectDetailViewProps) {
    const { getProject, updateInstructions } = useProjectStore();
    const { createConversation, addMessage, updateMessage } = useChatStore();
    const { memories, settings: memorySettings } = useMemoryStore();

    const project = getProject(projectId);

    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [editingInstructions, setEditingInstructions] = useState(false);
    const [instructionsText, setInstructionsText] = useState(project?.instructions || "");
    const [showModelDropdown, setShowModelDropdown] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (project) {
            setInstructionsText(project.instructions);
        }
    }, [project]);

    const handleSaveInstructions = () => {
        if (project) {
            updateInstructions(projectId, instructionsText);
            setEditingInstructions(false);
        }
    };

    const handleSubmit = useCallback(async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading || !project) return;

        const userContent = input.trim();
        setInput("");
        setIsLoading(true);

        // Create new conversation in project
        const convId = createConversation(selectedModel);

        addMessage({
            role: "user",
            content: userContent,
        });

        try {
            // Prepare messages with project instructions
            const systemPrompt = project.instructions
                ? `Project Instructions: ${project.instructions}\n\n`
                : "";

            const relevantMemories: Memory[] = memorySettings.isEnabled ? memories : [];

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [{ role: "user", content: userContent }],
                    model: selectedModel,
                    systemPrompt,
                    memories: relevantMemories.map((m) => ({ content: m.content })),
                }),
            });

            if (!response.ok) throw new Error("Failed to get response");

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            const assistantMessage = addMessage({
                role: "assistant",
                content: "",
            });

            let fullContent = "";

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split("\n");

                    for (const line of lines) {
                        if (line.trim()) {
                            try {
                                const data = JSON.parse(line);
                                if (data.content) {
                                    fullContent += data.content;
                                    updateMessage(assistantMessage.id, fullContent);
                                }
                            } catch {
                                // Skip invalid JSON
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error(error);
            addMessage({
                role: "assistant",
                content: "Sorry, there was an error processing your request.",
            });
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, project, selectedModel, memories, memorySettings, createConversation, addMessage, updateMessage]);

    if (!project) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Project not found</p>
            </div>
        );
    }

    return (
        <div className="flex h-full">
            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        All projects
                    </button>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-semibold text-foreground">{project.name}</h1>
                            {project.description && (
                                <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <p className="text-sm text-muted-foreground text-center max-w-md mb-8">
                        Start a chat to keep conversations organized and re-use project knowledge.
                    </p>

                    {/* Input */}
                    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
                        <div className="bg-secondary/30 border border-border rounded-2xl p-4">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit();
                                    }
                                }}
                                placeholder="Reply..."
                                rows={1}
                                className="w-full bg-transparent resize-none outline-none text-foreground placeholder-muted-foreground text-base"
                            />
                            <div className="flex items-center justify-between mt-3">
                                <div className="flex items-center gap-2">
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Model Selector */}
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setShowModelDropdown(!showModelDropdown)}
                                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {selectedModel.split(":")[0]}
                                            <ChevronDown className="w-3 h-3" />
                                        </button>
                                        {showModelDropdown && (
                                            <div className="absolute bottom-full right-0 mb-2 w-48 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-10">
                                                {models.map((model) => (
                                                    <button
                                                        key={model.name}
                                                        type="button"
                                                        onClick={() => {
                                                            onModelChange(model.name);
                                                            setShowModelDropdown(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors ${selectedModel === model.name ? "text-primary" : "text-foreground"
                                                            }`}
                                                    >
                                                        {model.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Send Button */}
                                    <button
                                        type="submit"
                                        disabled={!input.trim() || isLoading}
                                        className="p-2 rounded-full bg-primary text-primary-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Right Sidebar */}
            <div className="w-80 border-l border-border p-4 space-y-6">
                {/* Instructions */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">Instructions</span>
                        <button
                            onClick={() => setEditingInstructions(true)}
                            className="p-1 hover:bg-secondary rounded transition-colors"
                        >
                            <Plus className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>
                    {editingInstructions ? (
                        <div className="space-y-2">
                            <textarea
                                value={instructionsText}
                                onChange={(e) => setInstructionsText(e.target.value)}
                                placeholder="Add instructions to tailor responses..."
                                rows={4}
                                className="w-full bg-secondary/50 border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setEditingInstructions(false)}
                                    className="flex-1 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveInstructions}
                                    className="flex-1 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            {project.instructions || "Add instructions to tailor responses"}
                        </p>
                    )}
                </div>

                {/* Files */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">Files</span>
                        <label className="p-1 hover:bg-secondary rounded transition-colors cursor-pointer">
                            <Plus className="w-4 h-4 text-muted-foreground" />
                            <input
                                type="file"
                                multiple
                                onChange={async (e) => {
                                    if (e.target.files) {
                                        for (const file of Array.from(e.target.files)) {
                                            const text = await file.text();
                                            useProjectStore.getState().addFile(projectId, {
                                                name: file.name,
                                                content: text,
                                                type: 'text'
                                            });
                                        }
                                    }
                                }}
                                className="hidden"
                            />
                        </label>
                    </div>
                    {project.files.length === 0 ? (
                        <div className="bg-secondary/30 border border-dashed border-border rounded-xl p-6 text-center">
                            <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">
                                Add PDFs, documents, or other text to reference in this project.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {project.files.map((file) => (
                                <div key={file.id} className="flex items-center gap-2 p-2 bg-secondary/30 rounded-lg">
                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm text-foreground truncate flex-1">{file.name}</span>
                                    <button
                                        onClick={() => useProjectStore.getState().removeFile(projectId, file.id)}
                                        className="p-1 hover:bg-secondary rounded transition-colors"
                                    >
                                        <X className="w-3 h-3 text-muted-foreground" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

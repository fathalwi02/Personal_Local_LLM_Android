"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Trash2,
    Plus,
    X,
    MessageSquare,
    Check,
    ChevronRight,
    Search,
    AlertCircle
} from "lucide-react";
import { useMemoryStore } from "@/stores/memoryStore";
import { Memory } from "@/types";

export default function PersonalContextView() {
    const {
        memories,
        settings,
        initialize,
        addMemory,
        deleteMemory,
        toggleAutoExtract,
        toggleInstructions,
    } = useMemoryStore();

    const [isAddingInstruction, setIsAddingInstruction] = useState(false);
    const [newInstruction, setNewInstruction] = useState("");
    const [showPastChats, setShowPastChats] = useState(false); // To toggle "Manage and delete" view

    useEffect(() => {
        initialize();
    }, [initialize]);

    const instructions = memories.filter((m) => m.type === "instruction");
    const pastChats = memories.filter((m) => m.type === "memory" || !m.type);

    const handleAddInstruction = (e: React.FormEvent) => {
        e.preventDefault();
        if (newInstruction.trim()) {
            addMemory(newInstruction.trim(), "instruction");
            setNewInstruction("");
            setIsAddingInstruction(false);
        }
    };

    const handleDeleteAllInstructions = () => {
        if (confirm("Are you sure you want to delete all instructions?")) {
            instructions.forEach((m) => deleteMemory(m.id));
        }
    };

    return (
        <div className="flex-1 h-full overflow-y-auto bg-background text-foreground scroll-smooth">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-12 space-y-8 sm:space-y-10">
                {/* Header */}
                <div className="space-y-4">
                    <h1 className="text-3xl font-medium tracking-tight">Personal context</h1>
                    <p className="text-muted-foreground leading-relaxed max-w-2xl">
                        Fath-AI gives you a personalized experience using your past chats. You can also give it instructions to customize its responses.
                    </p>
                </div>

                {/* Past Chats Section */}
                <section className="space-y-4">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <h2 className="text-lg font-medium">Your past chats with Fath-AI</h2>
                            <p className="text-sm text-muted-foreground">
                                Fath-AI learns from your chats to understand more about you and your goals.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.autoExtract}
                                onChange={toggleAutoExtract}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    <div>
                        <button
                            onClick={() => setShowPastChats(!showPastChats)}
                            className="text-primary hover:underline text-sm font-medium inline-flex items-center gap-1"
                        >
                            {showPastChats ? "Hide past chats" : "Manage and delete"} your past chats anytime
                        </button>
                    </div>

                    {/* Expandable Past Chats Management */}
                    <AnimatePresence>
                        {showPastChats && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="border border-border rounded-xl bg-card p-4 space-y-3 mt-2">
                                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Remembered Details</h3>
                                    {pastChats.length === 0 ? (
                                        <p className="text-sm text-muted-foreground italic">No past chats remembered yet.</p>
                                    ) : (
                                        <div className="grid gap-2">
                                            {pastChats.map((memory) => (
                                                <div key={memory.id} className="flex items-start justify-between p-3 rounded-lg bg-secondary/50 group">
                                                    <p className="text-sm text-foreground/90">{memory.content}</p>
                                                    <button
                                                        onClick={() => deleteMemory(memory.id)}
                                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                                                        title="Delete memory"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>

                <div className="h-px bg-border/50" />

                {/* Instructions Section */}
                <section className="space-y-6">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <h2 className="text-lg font-medium">Your instructions for Fath-AI</h2>
                            <p className="text-sm text-muted-foreground">
                                Customize how Fath-AI responds to you by giving it instructions.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.enableInstructions}
                                onChange={toggleInstructions}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>



                    {/* Instruction List */}
                    <div className="space-y-3">
                        {instructions.map((instruction) => (
                            <div
                                key={instruction.id}
                                className="group flex items-center justify-between p-4 bg-secondary/20 hover:bg-secondary/40 border border-border/50 rounded-xl transition-colors"
                            >
                                <span className="text-sm text-foreground">{instruction.content}</span>
                                <button
                                    onClick={() => deleteMemory(instruction.id)}
                                    className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                    title="Delete instruction"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2">
                        {isAddingInstruction ? (
                            <form onSubmit={handleAddInstruction} className="flex-1 bg-secondary/30 rounded-xl border border-border p-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={newInstruction}
                                        onChange={(e) => setNewInstruction(e.target.value)}
                                        placeholder="E.g., Always be concise..."
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-2 placeholder:text-muted-foreground"
                                        autoFocus
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newInstruction.trim()}
                                        className="p-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsAddingInstruction(false);
                                            setNewInstruction("");
                                        }}
                                        className="p-2 hover:bg-muted text-muted-foreground rounded-lg transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <button
                                onClick={() => setIsAddingInstruction(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-sm font-medium transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add</span>
                            </button>
                        )}

                        {instructions.length > 0 && !isAddingInstruction && (
                            <button
                                onClick={handleDeleteAllInstructions}
                                className="inline-flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-full text-sm font-medium transition-colors border border-border hover:border-red-500/20"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete all</span>
                            </button>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

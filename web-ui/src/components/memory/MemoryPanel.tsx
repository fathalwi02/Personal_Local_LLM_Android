"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Brain,
    Plus,
    Trash2,
    ToggleLeft,
    ToggleRight,
    Sparkles,
} from "lucide-react";
import { Memory } from "@/types";
import { useMemoryStore } from "@/stores/memoryStore";

interface MemoryPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function MemoryPanel({ isOpen, onClose }: MemoryPanelProps) {
    const { memories, settings, addMemory, deleteMemory, toggleMemory, toggleAutoExtract } = useMemoryStore();

    const [newMemoryContent, setNewMemoryContent] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    const handleAddMemory = () => {
        if (!newMemoryContent.trim()) return;

        addMemory(newMemoryContent.trim());
        setNewMemoryContent("");
        setIsAdding(false);
    };

    const handleDeleteMemory = (id: string) => {
        if (confirm("Delete this memory?")) {
            deleteMemory(id);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleAddMemory();
        }
        if (e.key === "Escape") {
            setIsAdding(false);
            setNewMemoryContent("");
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-[#1a1a2e] border-l border-white/10 z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <Brain className="text-purple-400" size={24} />
                                <h2 className="text-lg font-semibold text-white">Memory</h2>
                                <span className="text-xs text-white/50 bg-white/10 px-2 py-0.5 rounded-full">
                                    {memories.length}
                                </span>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X size={20} className="text-white/70" />
                            </button>
                        </div>

                        {/* Settings */}
                        <div className="p-4 border-b border-white/10 space-y-3">
                            {/* Memory Toggle */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Brain size={16} className="text-purple-400" />
                                    <span className="text-sm text-white/80">Memory Enabled</span>
                                </div>
                                <button
                                    onClick={toggleMemory}
                                    className="text-purple-400 hover:text-purple-300 transition-colors"
                                >
                                    {settings.isEnabled ? (
                                        <ToggleRight size={28} />
                                    ) : (
                                        <ToggleLeft size={28} className="text-white/40" />
                                    )}
                                </button>
                            </div>

                            {/* Auto-Extract Toggle */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={16} className="text-yellow-400" />
                                    <span className="text-sm text-white/80">Auto-Learn</span>
                                </div>
                                <button
                                    onClick={toggleAutoExtract}
                                    className="text-yellow-400 hover:text-yellow-300 transition-colors"
                                >
                                    {settings.autoExtract ? (
                                        <ToggleRight size={28} />
                                    ) : (
                                        <ToggleLeft size={28} className="text-white/40" />
                                    )}
                                </button>
                            </div>

                            <p className="text-xs text-white/40">
                                {settings.autoExtract
                                    ? "AI will automatically remember important facts from your conversations."
                                    : "Turn on Auto-Learn to automatically save memories from chats."}
                            </p>
                        </div>

                        {/* Add Memory */}
                        <div className="p-4 border-b border-white/10">
                            {isAdding ? (
                                <div className="space-y-3">
                                    <textarea
                                        value={newMemoryContent}
                                        onChange={(e) => setNewMemoryContent(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="e.g., My name is Fath, I'm a developer..."
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-purple-500/50"
                                        rows={2}
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setIsAdding(false);
                                                setNewMemoryContent("");
                                            }}
                                            className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 text-sm transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAddMemory}
                                            disabled={!newMemoryContent.trim()}
                                            className="flex-1 py-2 bg-purple-500/30 hover:bg-purple-500/40 rounded-lg text-purple-300 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsAdding(true)}
                                    className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 text-sm transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus size={16} />
                                    Add Memory
                                </button>
                            )}
                        </div>

                        {/* Memory List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {memories.length === 0 ? (
                                <div className="text-center py-8">
                                    <Brain size={48} className="mx-auto text-white/20 mb-3" />
                                    <p className="text-white/40 text-sm">
                                        No memories yet. Add something the AI should remember!
                                    </p>
                                </div>
                            ) : (
                                memories.map((memory) => (
                                    <MemoryCard
                                        key={memory.id}
                                        memory={memory}
                                        onDelete={handleDeleteMemory}
                                    />
                                ))
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

function MemoryCard({ memory, onDelete }: { memory: Memory; onDelete: (id: string) => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 rounded-lg p-3 border border-white/10 group"
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                    <p className="text-white/90 text-sm leading-relaxed">{memory.content}</p>
                    <span className="text-xs text-white/30 mt-1 block">
                        {new Date(memory.createdAt).toLocaleDateString()}
                    </span>
                </div>
                <button
                    onClick={() => onDelete(memory.id)}
                    className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                    <Trash2 size={14} className="text-red-400" />
                </button>
            </div>
        </motion.div>
    );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { Message } from "@/types";

interface ConversationSearchProps {
    messages: Message[];
    onHighlight: (messageId: string | null) => void;
    isOpen: boolean;
    onClose: () => void;
    sidebarOpen: boolean;
}

export default function ConversationSearch({
    messages,
    onHighlight,
    isOpen,
    onClose,
    sidebarOpen,
}: ConversationSearchProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<string[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Search through messages when query changes
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            onHighlight(null);
            return;
        }

        const lowerQuery = query.toLowerCase();
        const matchingIds = messages
            .filter((m) => m.content.toLowerCase().includes(lowerQuery))
            .map((m) => m.id);

        setResults(matchingIds);
        setCurrentIndex(0);

        if (matchingIds.length > 0) {
            onHighlight(matchingIds[0]);
        } else {
            onHighlight(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, messages]);

    const navigateToResult = useCallback(
        (direction: "next" | "prev") => {
            if (results.length === 0) return;

            let newIndex: number;
            if (direction === "next") {
                newIndex = (currentIndex + 1) % results.length;
            } else {
                newIndex = (currentIndex - 1 + results.length) % results.length;
            }

            setCurrentIndex(newIndex);
            onHighlight(results[newIndex]);

            // Scroll to the message
            const element = document.getElementById(`message-${results[newIndex]}`);
            element?.scrollIntoView({ behavior: "smooth", block: "center" });
        },
        [currentIndex, results, onHighlight]
    );

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            navigateToResult(e.shiftKey ? "prev" : "next");
        } else if (e.key === "Escape") {
            onClose();
        }
    };

    const handleClose = () => {
        setQuery("");
        onHighlight(null);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`fixed top-20 z-50 w-full max-w-md px-4 transition-all duration-300 -translate-x-1/2 ${sidebarOpen
                        ? "left-1/2 lg:left-[calc(50%+9rem)]"
                        : "left-1/2"
                        }`}
                >
                    <div className="bg-popover rounded-xl shadow-lg border border-border overflow-hidden ring-1 ring-black/5">
                        <div className="flex items-center gap-2 p-3">
                            <Search className="w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Search in conversation..."
                                className="flex-1 bg-transparent outline-none text-foreground placeholder-muted-foreground text-sm"
                                autoFocus
                            />

                            {/* Results counter */}
                            {query && (
                                <span className="text-xs text-muted-foreground font-mono">
                                    {results.length > 0
                                        ? `${currentIndex + 1}/${results.length}`
                                        : "0 results"}
                                </span>
                            )}

                            {/* Navigation buttons */}
                            {results.length > 1 && (
                                <div className="flex items-center gap-1 border-l border-border pl-2 ml-1">
                                    <button
                                        onClick={() => navigateToResult("prev")}
                                        className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                        title="Previous (Shift+Enter)"
                                    >
                                        <ChevronUp className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => navigateToResult("next")}
                                        className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                        title="Next (Enter)"
                                    >
                                        <ChevronDown className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {/* Close button */}
                            <button
                                onClick={handleClose}
                                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground ml-1"
                                title="Close (Esc)"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Tips */}
                        <div className="px-3 py-1.5 bg-muted/50 text-[10px] text-muted-foreground flex gap-4 border-t border-border/50">
                            <span>Enter: Next</span>
                            <span>Shift+Enter: Previous</span>
                            <span>Esc: Close</span>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

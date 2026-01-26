"use client";

import { motion } from "framer-motion";
import { Timer, Hash } from "lucide-react";
import {
    formatTokenCount,
    getContextUsage,
    getModelContextSize,
} from "@/lib/tokenizer";

interface TokenCounterProps {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    responseTime?: number; // in milliseconds
    model: string;
}

export default function TokenCounter({
    inputTokens,
    outputTokens,
    totalTokens,
    responseTime,
    model,
}: TokenCounterProps) {
    const contextSize = getModelContextSize(model);
    const usage = getContextUsage(totalTokens, contextSize);

    // Determine color based on usage
    const getUsageColor = () => {
        if (usage < 50) return "rgb(34, 197, 94)"; // green-500
        if (usage < 75) return "rgb(234, 179, 8)"; // yellow-500
        if (usage < 90) return "rgb(249, 115, 22)"; // orange-500
        return "rgb(239, 68, 68)"; // red-500
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 text-xs text-muted-foreground"
        >
            {/* Token counts */}
            <div className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" />
                <span>
                    {formatTokenCount(totalTokens)} tokens
                </span>
                <span className="opacity-60">
                    ({formatTokenCount(inputTokens)} In / {formatTokenCount(outputTokens)} Out)
                </span>
            </div>

            {/* Context usage bar */}
            <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${usage}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: getUsageColor() }}
                    />
                </div>
                <span className="opacity-60">
                    {usage.toFixed(0)}%
                </span>
            </div>

            {/* Response time */}
            {responseTime !== undefined && (
                <div className="flex items-center gap-1.5 border-l border-border pl-4">
                    <Timer className="w-3.5 h-3.5" />
                    <span>
                        {responseTime < 1000
                            ? `${responseTime}ms`
                            : `${(responseTime / 1000).toFixed(1)}s`}
                    </span>
                </div>
            )}
        </motion.div>
    );
}

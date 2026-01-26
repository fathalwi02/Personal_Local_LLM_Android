"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Trash2, Pencil, RefreshCw, Globe, Brain, ChevronDown, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";
import { Message } from "@/types";
import CodeBlock from "./CodeBlock";
import Image from "next/image";
import useLongPress from "@/hooks/useLongPress";

interface ChatMessageProps {
    message: Message;
    onDelete: (id: string) => void;
    onEdit: (id: string, content: string) => void;
    onRegenerate?: () => void;
    isLast?: boolean;
    isLoading?: boolean;
}

export default function ChatMessage({
    message,
    onDelete,
    onEdit,
    onRegenerate,
    isLast,
    isLoading,
}: ChatMessageProps) {
    const [copied, setCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);
    const [showActions, setShowActions] = useState(false);
    const [showThought, setShowThought] = useState(true);
    const [showSources, setShowSources] = useState(true);
    const [menuPosition, setMenuPosition] = useState<{ x: number, y: number } | null>(null);

    const handleLongPress = (e: React.TouchEvent | React.MouseEvent) => {
        let x = 0, y = 0;
        if ('touches' in e) {
            x = e.touches[0].clientX;
            y = e.touches[0].clientY;
        } else {
            x = (e as React.MouseEvent).clientX;
            y = (e as React.MouseEvent).clientY;
        }
        setMenuPosition({ x, y });
    };

    const handleClick = () => {
        // Optional
    };

    const bind = useLongPress(handleLongPress, handleClick, { shouldPreventDefault: true, delay: 500 });

    const closeMenu = (e?: React.MouseEvent | React.TouchEvent) => {
        e?.stopPropagation();
        setMenuPosition(null);
    };


    const handleCopy = async () => {
        await navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSaveEdit = () => {
        if (editContent.trim() && editContent !== message.content) {
            onEdit(message.id, editContent.trim());
        }
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditContent(message.content);
        setIsEditing(false);
    };

    const isUser = message.role === "user";

    // Parse <think> blocks
    let thoughtContent = "";
    let mainContent = message.content;

    if (!isUser) {
        const thinkMatch = message.content.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
        if (thinkMatch) {
            thoughtContent = thinkMatch[1].trim();
            if (message.content.includes("</think>")) {
                mainContent = message.content.replace(/<think>[\s\S]*?<\/think>/, "").trim();
            } else {
                mainContent = "";
            }
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div
                className={`relative group px-1 ${isUser ? "max-w-[85%] lg:max-w-[75%]" : "w-full max-w-full"}`}
            >
                <div
                    {...bind}
                    className={`px-5 py-3.5 ${isUser
                        ? "rounded-3xl rounded-tr-sm bg-primary text-primary-foreground shadow-sm ml-auto"
                        : "rounded-3xl bg-transparent text-foreground -ml-4"
                        }`}
                >

                    {/* Web Search Indicator with Queries */}
                    {message.isSearchResult && (
                        <div className="mb-3 space-y-2">
                            <div className="flex items-center gap-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 w-fit px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                                <Globe className="w-3.5 h-3.5" />
                                <span>Searched the web</span>
                            </div>
                            {message.searchQueries && message.searchQueries.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                    <span className="opacity-70">Queries:</span>
                                    {message.searchQueries?.map((query, idx) => (
                                        <span key={idx} className="px-2 py-0.5 bg-secondary/60 rounded-md font-medium">
                                            {query}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Content */}
                    {isEditing ? (
                        <div className="space-y-3 bg-secondary/30 p-3 rounded-xl border border-border/50">
                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full min-h-[100px] p-3 rounded-lg bg-background text-foreground outline-none resize-none border border-input focus:ring-2 focus:ring-primary/20"
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={handleCancelEdit}
                                    className="px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-secondary transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:opacity-90 transition-opacity"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Thought Process */}
                            {thoughtContent && (
                                <div className="rounded-xl bg-secondary/30 border border-border/40 overflow-hidden mb-2">
                                    <button
                                        onClick={() => setShowThought(!showThought)}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/50 transition-colors"
                                    >
                                        <Brain className={`w-3.5 h-3.5 ${isLoading && !mainContent ? "animate-pulse text-purple-500" : ""}`} />
                                        <span>Thought Process</span>
                                        {showThought ? (
                                            <ChevronDown className="w-3.5 h-3.5 ml-auto opacity-70" />
                                        ) : (
                                            <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />
                                        )}
                                    </button>
                                    <AnimatePresence>
                                        {showThought && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="px-3.5 py-3 border-t border-border/30 bg-secondary/10"
                                            >
                                                <div className="prose prose-sm max-w-none dark:prose-invert text-muted-foreground text-sm leading-relaxed">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {thoughtContent}
                                                    </ReactMarkdown>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* Main Content */}
                            {(mainContent || (!thoughtContent && !mainContent)) && (
                                <div className={`prose prose-neutral max-w-none ${isUser
                                    ? "prose-p:text-primary-foreground prose-headings:text-primary-foreground prose-strong:text-primary-foreground prose-li:text-primary-foreground prose-code:text-primary-foreground"
                                    : "dark:prose-invert"
                                    } prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent`}>
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            // Override pre to strip default prose styles (padding/bg)
                                            pre({ children }) {
                                                return <div className="not-prose my-0">{children}</div>;
                                            },
                                            code({ className, children, ...props }) {
                                                const match = /language-(\w+)/.exec(className || "");
                                                const codeString = String(children).replace(/\n$/, "");
                                                const isCodeBlock = match || codeString.includes("\n");

                                                if (isCodeBlock) {
                                                    return (
                                                        <CodeBlock language={match?.[1]}>
                                                            {codeString}
                                                        </CodeBlock>
                                                    );
                                                }

                                                return (
                                                    <code className={`${className} bg-secondary/30 px-1.5 py-0.5 rounded-md text-sm font-mono text-pink-500`} {...props}>
                                                        {children}
                                                    </code>
                                                );
                                            },
                                            // Custom rendering for links to handle inline citations
                                            a({ href, children, ...props }) {
                                                if (href?.startsWith("#source-")) {
                                                    return (
                                                        <a
                                                            href={href}
                                                            className="inline-flex items-center px-2 py-0.5 mx-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors font-medium select-none no-underline border border-blue-200 dark:border-blue-800 align-baseline whitespace-nowrap"
                                                            {...props}
                                                        >
                                                            {String(children).replace(/[\[\]]/g, '')}
                                                        </a>
                                                    );
                                                }
                                                return (
                                                    <a href={href} className="text-blue-500 hover:underline" {...props}>
                                                        {children}
                                                    </a>
                                                );
                                            }
                                        }}
                                    >
                                        {/* Pre-process content to turn [n] or [Source n] into styled links with names */}
                                        {(mainContent || (isLoading ? " " : "")).replace(
                                            /\[(?:Source\s+)?(\d+)\]/g,
                                            (match, idStr) => {
                                                const id = parseInt(idStr);
                                                if (message.sources && message.sources[id - 1]) {
                                                    // Format the label: "CarNewsChina" instead of "www.carnewschina.com"
                                                    let domain = message.sources[id - 1].domain || "";
                                                    domain = domain.replace(/^www\./, '').replace(/\.(com|org|net|io|co|uk|de|cn|gov|edu|info)$/i, '');
                                                    // Capitalize
                                                    const label = domain.charAt(0).toUpperCase() + domain.slice(1);
                                                    return ` [${label}](#source-${id}) `;
                                                }
                                                return ` [${id}](#source-${id}) `;
                                            }
                                        )}
                                    </ReactMarkdown>
                                </div>
                            )}

                            {/* Sources Grid Display */}
                            {message.sources && message.sources.length > 0 && (
                                <div className="mt-6 pt-4 border-t border-border/40">
                                    <button
                                        onClick={() => setShowSources(!showSources)}
                                        className="flex items-center gap-2 w-full text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 hover:text-primary transition-colors focus:outline-none"
                                    >
                                        <Globe className="w-3.5 h-3.5" />
                                        Sources
                                        {showSources ? (
                                            <ChevronDown className="w-3.5 h-3.5 ml-auto opacity-70" />
                                        ) : (
                                            <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />
                                        )}
                                    </button>
                                    <AnimatePresence>
                                        {showSources && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pb-2">
                                                    {message.sources?.map((source, idx) => (
                                                        <a
                                                            key={idx}
                                                            id={`source-${idx + 1}`}
                                                            href={source.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="group relative flex items-start p-3 rounded-xl bg-secondary/20 hover:bg-secondary/40 border border-border/40 hover:border-border/80 transition-all duration-200 overflow-hidden"
                                                        >
                                                            {/* Number Badge */}
                                                            <div className="absolute top-2 right-2 text-[10px] font-mono font-medium text-muted-foreground/50 group-hover:text-primary transition-colors">
                                                                {idx + 1}
                                                            </div>

                                                            <div className="flex-shrink-0 mt-0.5 mr-3">
                                                                {source.favicon ? (
                                                                    <img
                                                                        src={source.favicon}
                                                                        alt=""
                                                                        className="w-4 h-4 rounded-sm object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                    />
                                                                ) : (
                                                                    <div className="w-4 h-4 rounded-sm bg-primary/10 flex items-center justify-center">
                                                                        <Globe className="w-2.5 h-2.5 text-primary/60" />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex-1 min-w-0 pr-4">
                                                                <h5 className="text-xs font-medium text-foreground/90 group-hover:text-primary truncate transition-colors leading-tight mb-0.5">
                                                                    {source.title}
                                                                </h5>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[10px] text-muted-foreground truncate">
                                                                        {source.domain}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </a>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* Signature logo for assistant messages */}
                            {!isUser && !isLoading && (
                                <div className="flex justify-start mt-6">
                                    <Image src="/logo-transparent.png" alt="Fath-AI" width={32} height={32} className="opacity-20 grayscale" />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Action Buttons - Hidden on mobile (use long-press instead) */}
                {showActions && !isEditing && !isLoading && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`hidden md:block absolute ${isUser ? "left-0 -translate-x-full pr-1" : "left-0 mt-1"} top-1/2 -translate-y-1/2`}
                        style={{
                            top: isUser ? "50%" : "100%",
                            left: isUser ? "auto" : "0",
                            right: isUser ? "100%" : "auto",
                            transform: isUser ? "translateY(-50%)" : "translateY(0%)"
                        }}
                    >
                        <div className={`flex items-center gap-0.5 p-1 rounded-full ${isUser ? "" : "ml-4 mt-1 bg-background border border-border/50 shadow-sm"}`}>
                            {/* Copy */}
                            <button
                                onClick={handleCopy}
                                className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                title="Copy"
                            >
                                {copied ? (
                                    <Check className="w-3.5 h-3.5 text-green-500" />
                                ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                )}
                            </button>

                            {/* Edit (user messages only) */}
                            {isUser && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                    title="Edit"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                            )}

                            {/* Regenerate (last assistant message only) */}
                            {!isUser && isLast && onRegenerate && (
                                <button
                                    onClick={onRegenerate}
                                    className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                    title="Regenerate"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                            )}

                            {/* Delete */}
                            <button
                                onClick={() => onDelete(message.id)}
                                className="p-1.5 rounded-full hover:bg-red-100 text-muted-foreground hover:text-red-500 transition-colors"
                                title="Delete"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Context Menu Portal */}
            {menuPosition && (
                <div className="fixed inset-0 z-[70] flex items-start justify-start" onClick={closeMenu} onTouchStart={closeMenu}>
                    <div
                        className="absolute bg-popover text-popover-foreground border border-border shadow-md rounded-lg p-1 min-w-[140px] flex flex-col z-[80]"
                        style={{
                            top: Math.min(menuPosition.y, window.innerHeight - 150),
                            left: Math.min(menuPosition.x, window.innerWidth - 150)
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-secondary rounded-md w-full text-left"
                            onClick={(e) => {
                                closeMenu();
                                handleCopy();
                            }}
                        >
                            <Copy className="w-4 h-4" /> Copy
                        </button>

                        {isUser && (
                            <button
                                className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-secondary rounded-md w-full text-left"
                                onClick={(e) => {
                                    closeMenu();
                                    setIsEditing(true);
                                }}
                            >
                                <Pencil className="w-4 h-4" /> Edit
                            </button>
                        )}

                        {(isUser || (!isUser && !isLoading)) && (
                            <button
                                className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-red-100 text-red-600 rounded-md w-full text-left"
                                onClick={(e) => {
                                    closeMenu();
                                    onDelete(message.id);
                                }}
                            >
                                <Trash2 className="w-4 h-4" /> Delete
                            </button>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    );
}


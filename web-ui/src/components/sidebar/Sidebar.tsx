"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    MessageSquare,
    Trash2,
    ChevronLeft,
    Pencil,
    Check,
    X,
    FolderOpen,
    CircleUser,
    PanelLeft,
} from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useChatStore } from "@/stores/chatStore";
import { ViewType } from "@/types";
import useLongPress from "@/hooks/useLongPress";
import { groupConversationsByDate } from "@/lib/dateGrouping";

interface SidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    selectedModel: string;
    currentView: ViewType;
    onViewChange: (view: ViewType) => void;
}

export default function Sidebar({
    isOpen,
    onToggle,
    selectedModel,
    currentView,
    onViewChange
}: SidebarProps) {
    const {
        conversations,
        activeConversationId,
        setActiveConversation,
        createConversation,
        renameConversation,
        deleteConversation,
    } = useChatStore();

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");

    const handleStartEdit = (e: React.MouseEvent, id: string, title: string) => {
        e.stopPropagation();
        setEditingId(id);
        setEditTitle(title);
    };

    const handleSaveEdit = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (editTitle.trim()) {
            renameConversation(id, editTitle);
        }
        setEditingId(null);
    };

    const handleCancelEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingId(null);
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this conversation?")) {
            deleteConversation(id);
        }
    };

    const handleNewChat = () => {
        createConversation(selectedModel);
        onViewChange('chat');
    };

    return (
        <>

            {/* Mini Sidebar (Collapsed) */}
            {!isOpen && (
                <div className="hidden md:flex fixed inset-y-0 left-0 w-16 bg-[#f9f9f9]/80 dark:bg-[#1a1b1e]/90 backdrop-blur-xl border-r border-border z-[50] flex-col items-center py-4 gap-6">
                    {/* Toggle */}
                    <button
                        onClick={onToggle}
                        className="p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                        title="Expand sidebar"
                    >
                        <PanelLeft className="w-5 h-5" />
                    </button>

                    {/* New Chat */}
                    <button
                        onClick={handleNewChat}
                        className="p-2.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        title="New Chat"
                    >
                        <Plus className="w-5 h-5" />
                    </button>

                    <div className="flex flex-col gap-2 w-full items-center">
                        {/* Chats */}
                        <button
                            onClick={() => onViewChange('chats')}
                            className={`p-2 rounded-md transition-colors ${currentView === 'chats'
                                ? "bg-secondary text-foreground"
                                : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5"
                                }`}
                            title="Chats"
                        >
                            <MessageSquare className="w-5 h-5" />
                        </button>

                        {/* Projects */}
                        <button
                            onClick={() => onViewChange('projects')}
                            className={`p-2 rounded-md transition-colors ${currentView === 'projects'
                                ? "bg-secondary text-foreground"
                                : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5"
                                }`}
                            title="Projects"
                        >
                            <FolderOpen className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Personal Context at bottom */}
                    <button
                        onClick={() => onViewChange('personal-context')}
                        className={`p-2 rounded-md transition-colors mt-auto ${currentView === 'personal-context'
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5"
                            }`}
                        title="Personal Context"
                    >
                        <CircleUser className="w-5 h-5" />
                    </button>
                </div>
            )}

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onToggle}
                            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[55] md:hidden"
                        />
                        <motion.aside
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
                            className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#f9f9f9] dark:bg-[#1a1b1e] md:bg-[#f9f9f9]/80 md:dark:bg-[#1a1b1e]/90 backdrop-blur-xl border-r border-border z-[60] flex flex-col shadow-2xl sidebar"
                        >
                            {/* Header */}
                            <div className="p-4 flex items-center justify-between border-b border-border/40">
                                <div className="flex items-center gap-2">
                                    {/* Only text as requested */}
                                    <span className="font-semibold text-lg" style={{ color: '#91d7e3' }}>
                                        Fath-AI
                                    </span>
                                </div>
                                <button
                                    onClick={onToggle}
                                    className="p-1.5 rounded-md hover:bg-black/5 text-muted-foreground transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Navigation */}
                            <div className="p-3 space-y-1">
                                <button
                                    onClick={handleNewChat}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 bg-primary text-primary-foreground rounded-lg shadow-sm hover:opacity-90 transition-all font-medium"
                                >
                                    <Plus className="w-4 h-4" />
                                    New Chat
                                </button>

                                <div className="pt-2 space-y-0.5">
                                    <button
                                        onClick={() => onViewChange('chats')}
                                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${currentView === 'chats'
                                            ? "bg-secondary text-foreground"
                                            : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5"
                                            }`}
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        Chats
                                    </button>
                                    <button
                                        onClick={() => onViewChange('projects')}
                                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${currentView === 'projects' || currentView === 'project-detail'
                                            ? "bg-secondary text-foreground"
                                            : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5"
                                            }`}
                                    >
                                        <FolderOpen className="w-4 h-4" />
                                        Projects
                                    </button>
                                </div>
                            </div>



                            {/* Recent Chats List */}
                            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
                                {(() => {
                                    const grouped = groupConversationsByDate(conversations.slice(0, 20));
                                    const groups = ["Today", "Yesterday", "Previous 7 Days", "Older"];

                                    return groups.map(groupName => {
                                        const groupConvs = grouped[groupName] || [];
                                        if (groupConvs.length === 0) return null;

                                        return (
                                            <div key={groupName}>
                                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2 sticky top-0 bg-[#f9f9f9]/95 dark:bg-[#1a1b1e]/95 backdrop-blur-sm z-10 py-1">
                                                    {groupName}
                                                </h3>
                                                <div className="space-y-0.5">
                                                    {groupConvs.map((conversation: any) => (
                                                        <ChatListItem
                                                            key={conversation.id}
                                                            conversation={conversation}
                                                            activeId={activeConversationId}
                                                            currentView={currentView}
                                                            editingId={editingId}
                                                            editTitle={editTitle}
                                                            onSelect={(id: string) => {
                                                                setActiveConversation(id);
                                                                onViewChange('chat');
                                                            }}
                                                            onStartEdit={handleStartEdit}
                                                            onSaveEdit={handleSaveEdit}
                                                            onCancelEdit={handleCancelEdit}
                                                            setEditTitle={setEditTitle}
                                                            onDelete={handleDelete}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>

                            {/* Personal Context Button */}
                            <div className="p-3 border-t border-border/40">
                                <button
                                    onClick={() => onViewChange('personal-context')}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm font-medium ${currentView === 'personal-context'
                                        ? "bg-secondary text-foreground"
                                        : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                                        }`}
                                >
                                    <CircleUser className="w-4 h-4" />
                                    Personal Context
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )
                }
            </AnimatePresence >
        </>
    );
}

// Separate component to handle hooks per item

function ChatListItem({
    conversation,
    activeId,
    currentView,
    editingId,
    editTitle,
    onSelect,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    setEditTitle,
    onDelete
}: any) {
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
        onSelect(conversation.id);
    };

    const bind = useLongPress(handleLongPress, handleClick, { shouldPreventDefault: true, delay: 500 });

    // Close menu when clicking outside (simple implementation: overlay)
    const closeMenu = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setMenuPosition(null);
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${activeId === conversation.id && currentView === 'chat'
                    ? "bg-secondary"
                    : "hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                {...bind}
            >
                <div className="flex-1 overflow-hidden">
                    {editingId === conversation.id ? (
                        <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") onSaveEdit(e as unknown as React.MouseEvent, conversation.id);
                                if (e.key === "Escape") onCancelEdit(e as unknown as React.MouseEvent);
                            }}
                            className="w-full bg-transparent border-b border-primary px-0 py-0 text-sm focus:outline-none"
                            autoFocus
                        />
                    ) : (
                        <span className={`text-sm truncate block ${activeId === conversation.id && currentView === 'chat'
                            ? "font-medium text-foreground"
                            : "text-muted-foreground group-hover:text-foreground"
                            }`}>
                            {conversation.title}
                        </span>
                    )}
                </div>
                {/* Desktop Action Buttons (Hover) - Hidden on mobile via group-hover logic but kept for desktop */}
                {!editingId && !menuPosition && (
                    <div className="hidden md:group-hover:flex items-center gap-0.5">
                        <button
                            onClick={(e) => onStartEdit(e, conversation.id, conversation.title)}
                            className="p-1 rounded-md hover:bg-black/5 text-muted-foreground transition-colors"
                            title="Rename"
                        >
                            <Pencil className="w-3 h-3" />
                        </button>
                        <button
                            onClick={(e) => onDelete(e, conversation.id)}
                            className="p-1 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                )}
                {editingId === conversation.id && (
                    <div className="flex items-center gap-1">
                        <button onClick={(e) => onSaveEdit(e, conversation.id)} className="p-1 rounded hover:bg-green-100 text-green-600"><Check className="w-3 h-3" /></button>
                        <button onClick={onCancelEdit} className="p-1 rounded hover:bg-red-100 text-red-600"><X className="w-3 h-3" /></button>
                    </div>
                )}
            </motion.div>

            {/* Context Menu Portal/Overlay */}
            {menuPosition && (
                <div className="fixed inset-0 z-[70] flex items-start justify-start" onClick={closeMenu} onTouchStart={closeMenu}>
                    <div
                        className="absolute bg-popover text-popover-foreground border border-border shadow-md rounded-lg p-1 min-w-[120px] flex flex-col z-[80]"
                        style={{
                            top: Math.min(menuPosition.y, window.innerHeight - 100),
                            left: Math.min(menuPosition.x, window.innerWidth - 130)
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary rounded-md w-full text-left"
                            onClick={(e) => {
                                closeMenu();
                                onStartEdit(e, conversation.id, conversation.title);
                            }}
                        >
                            <Pencil className="w-4 h-4" /> Rename
                        </button>
                        <button
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-100 text-red-600 rounded-md w-full text-left"
                            onClick={(e) => {
                                closeMenu();
                                onDelete(e, conversation.id);
                            }}
                        >
                            <Trash2 className="w-4 h-4" /> Delete
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, MessageSquare, Trash2, Pencil, Check, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useChatStore } from "@/stores/chatStore";
import useLongPress from "@/hooks/useLongPress";
import { groupConversationsByDate } from "@/lib/dateGrouping";

interface ChatsListViewProps {
    onChatSelect: (id: string) => void;
    onNewChat: () => void;
}

export default function ChatsListView({ onChatSelect, onNewChat }: ChatsListViewProps) {
    const { conversations, deleteConversation, renameConversation } = useChatStore();
    const [searchQuery, setSearchQuery] = useState("");

    const filteredConversations = conversations.filter((conv) =>
        conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.messages.some((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleDelete = (e: React.MouseEvent | React.TouchEvent, id: string) => {
        e.stopPropagation();
        if (confirm("Delete this conversation?")) {
            deleteConversation(id);
        }
    };

    const handleRename = (id: string, newTitle: string) => {
        renameConversation(id, newTitle);
    };

    const groupedConversations = groupConversationsByDate(filteredConversations);
    const groups = ["Today", "Yesterday", "Previous 7 Days", "Older"];

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex items-center justify-between py-6 pl-10 md:pl-0">
                    <h1 className="text-2xl font-semibold text-foreground">Chats</h1>
                    <button
                        onClick={onNewChat}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition-all text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        New chat
                    </button>
                </div>

                {/* Search */}
                <div className="pb-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search your chats..."
                            className="w-full bg-secondary/50 border border-border rounded-xl py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                </div>

                {/* Chat List Groups */}
                <div className="pb-8 space-y-6">
                    {filteredConversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-4" />
                            <h3 className="text-lg font-medium text-foreground mb-2">
                                {searchQuery ? "No chats found" : "Ready for your first chat?"}
                            </h3>
                            <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
                                {searchQuery
                                    ? "Try a different search term"
                                    : "Think through anything with Fath-AI — from big ideas to quick questions. Your chats will show up here."}
                            </p>
                            {!searchQuery && (
                                <button
                                    onClick={onNewChat}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-secondary transition-colors text-sm font-medium"
                                >
                                    <Plus className="w-4 h-4" />
                                    New chat
                                </button>
                            )}
                        </div>
                    ) : (
                        groups.map(groupName => {
                            const groupConvs = groupedConversations[groupName];
                            if (groupConvs.length === 0) return null;

                            return (
                                <div key={groupName}>
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1 top-0 bg-background/95 backdrop-blur-sm py-2 sticky z-10 w-full animate-in fade-in duration-300">
                                        {groupName}
                                    </h3>
                                    <div className="space-y-1">
                                        {groupConvs.map((conversation: any) => (
                                            <ChatListItem
                                                key={conversation.id}
                                                conversation={conversation}
                                                onSelect={onChatSelect}
                                                onDelete={handleDelete}
                                                onRename={handleRename}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

function ChatListItem({ conversation, onSelect, onDelete, onRename }: {
    conversation: any,
    onSelect: (id: string) => void,
    onDelete: (e: React.MouseEvent | React.TouchEvent, id: string) => void,
    onRename: (id: string, newTitle: string) => void
}) {
    const [menuPosition, setMenuPosition] = useState<{ x: number, y: number } | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(conversation.title);

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
        if (!isEditing) {
            onSelect(conversation.id);
        }
    };

    const bind = useLongPress(handleLongPress, handleClick, { shouldPreventDefault: true, delay: 500 });

    const closeMenu = (e?: React.MouseEvent | React.TouchEvent) => {
        e?.stopPropagation();
        setMenuPosition(null);
    };

    const handleSaveEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (editTitle.trim()) {
            onRename(conversation.id, editTitle);
        }
        setIsEditing(false);
    };

    const handleCancelEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditTitle(conversation.title);
        setIsEditing(false);
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-secondary/30 cursor-pointer transition-all select-none"
                {...bind}
            >
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        {isEditing ? (
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="flex-1 bg-transparent border-b border-primary px-0 py-0 font-medium text-foreground focus:outline-none"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveEdit(e as unknown as React.MouseEvent);
                                        if (e.key === "Escape") handleCancelEdit(e as unknown as React.MouseEvent);
                                    }}
                                />
                                <button onClick={handleSaveEdit} className="p-1 text-green-600"><Check className="w-4 h-4" /></button>
                                <button onClick={handleCancelEdit} className="p-1 text-red-600"><X className="w-4 h-4" /></button>
                            </div>
                        ) : (
                            <h3 className="font-medium text-foreground truncate">
                                {conversation.title}
                            </h3>
                        )}
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {conversation.messages[conversation.messages.length - 1]?.content.substring(0, 100) || "No messages yet"}
                        </p>
                        <span className="text-xs text-muted-foreground/60 mt-2 block">
                            {formatDistanceToNow(conversation.updatedAt, { addSuffix: true })}
                        </span>
                    </div>
                    {/* Desktop Hover Action - Hidden on Touch but good for Hybrid */}
                    {!isEditing && !menuPosition && (
                        <div className="hidden md:block opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsEditing(true);
                                }}
                                className="p-2 text-muted-foreground hover:bg-black/5 rounded-lg mr-1"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => onDelete(e, conversation.id)}
                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Context Menu Portal */}
            {menuPosition && (
                <div className="fixed inset-0 z-[70] flex items-start justify-start" onClick={closeMenu} onTouchStart={closeMenu}>
                    <div
                        className="absolute bg-popover text-popover-foreground border border-border shadow-md rounded-lg p-1 min-w-[140px] flex flex-col z-[80]"
                        style={{
                            top: Math.min(menuPosition.y, window.innerHeight - 100),
                            left: Math.min(menuPosition.x, window.innerWidth - 150)
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-secondary rounded-md w-full text-left"
                            onClick={(e) => {
                                closeMenu();
                                setIsEditing(true);
                            }}
                        >
                            <Pencil className="w-4 h-4" /> Rename
                        </button>
                        <button
                            className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-red-100 text-red-600 rounded-md w-full text-left"
                            onClick={(e) => {
                                closeMenu();
                                let syntheticEvent = { stopPropagation: () => { } } as React.MouseEvent;
                                onDelete(syntheticEvent, conversation.id);
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

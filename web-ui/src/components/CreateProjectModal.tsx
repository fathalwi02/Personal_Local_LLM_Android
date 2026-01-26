"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FolderOpen } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (projectId: string) => void;
}

export default function CreateProjectModal({ isOpen, onClose, onCreated }: CreateProjectModalProps) {
    const { createProject } = useProjectStore();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        const project = createProject(name.trim(), description.trim());
        onCreated(project.id);
        setName("");
        setDescription("");
        onClose();
    };

    const handleClose = () => {
        setName("");
        setDescription("");
        onClose();
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
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        onClick={handleClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 flex items-center justify-center z-50 p-4 md:p-6"
                    >
                        <div
                            className="bg-card from-card/95 to-card/98 border border-border/60 rounded-2xl shadow-2xl w-full max-w-lg mb-8 md:mb-0"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-5 md:p-6 border-b border-border">
                                <div className="flex items-center gap-3">
                                    <FolderOpen className="w-5 h-5 text-primary" />
                                    <h2 className="text-lg font-semibold text-foreground">
                                        Create a personal project
                                    </h2>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="p-2 hover:bg-secondary rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4 text-muted-foreground" />
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-6">
                                {/* Name */}
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-foreground/80 ml-1">
                                        What are you working on?
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Name your project"
                                        className="w-full bg-secondary/50 border border-border rounded-xl py-3 px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                        autoFocus
                                    />
                                </div>

                                {/* Description */}
                                <div className="space-y-3 pt-2">
                                    <label className="text-sm font-medium text-foreground/80 ml-1">
                                        What are you trying to achieve?
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Describe your project, goals, subject, etc..."
                                        rows={4}
                                        className="w-full bg-secondary/50 border border-border rounded-xl py-3 px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none transition-all"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!name.trim()}
                                        className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Create project
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

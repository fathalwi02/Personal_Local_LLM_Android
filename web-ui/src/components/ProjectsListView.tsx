"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, FolderOpen, Trash2, Pencil, Check, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useProjectStore } from "@/stores/projectStore";
import useLongPress from "@/hooks/useLongPress";

interface ProjectsListViewProps {
    onProjectSelect: (id: string) => void;
    onNewProject: () => void;
}

export default function ProjectsListView({ onProjectSelect, onNewProject }: ProjectsListViewProps) {
    const { projects, deleteProject, updateProject } = useProjectStore();
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"activity" | "name">("activity");

    const filteredProjects = projects
        .filter((project) =>
            project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            if (sortBy === "activity") {
                return b.updatedAt - a.updatedAt;
            }
            return a.name.localeCompare(b.name);
        });

    const handleDelete = (e: React.MouseEvent | React.TouchEvent, id: string) => {
        e.stopPropagation();
        if (confirm("Delete this project?")) {
            deleteProject(id);
        }
    };

    const handleRename = (id: string, newName: string) => {
        updateProject(id, { name: newName });
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex items-center justify-between py-6 pl-10 md:pl-0">
                    <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
                    <button
                        onClick={onNewProject}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition-all text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        New project
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
                            placeholder="Search projects..."
                            className="w-full bg-secondary/50 border border-border rounded-xl py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                </div>

                {/* Projects List */}
                <div className="pb-8">
                    {filteredProjects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <FolderOpen className="w-12 h-12 text-muted-foreground/30 mb-4" />
                            <h3 className="text-lg font-medium text-foreground mb-2">
                                {searchQuery ? "No projects found" : "Looking to start a project?"}
                            </h3>
                            <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
                                {searchQuery
                                    ? "Try a different search term"
                                    : "Upload materials, set custom instructions, and organize conversations in one space."}
                            </p>
                            {!searchQuery && (
                                <button
                                    onClick={onNewProject}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-secondary transition-colors text-sm font-medium"
                                >
                                    <Plus className="w-4 h-4" />
                                    New project
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredProjects.map((project) => (
                                <ProjectListItem
                                    key={project.id}
                                    project={project}
                                    onSelect={onProjectSelect}
                                    onDelete={handleDelete}
                                    onRename={handleRename}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ProjectListItem({ project, onSelect, onDelete, onRename }: {
    project: any,
    onSelect: (id: string) => void,
    onDelete: (e: React.MouseEvent | React.TouchEvent, id: string) => void,
    onRename: (id: string, newName: string) => void
}) {
    const [menuPosition, setMenuPosition] = useState<{ x: number, y: number } | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(project.name);

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
            onSelect(project.id);
        }
    };

    const bind = useLongPress(handleLongPress, handleClick, { shouldPreventDefault: true, delay: 500 });

    const closeMenu = (e?: React.MouseEvent | React.TouchEvent) => {
        e?.stopPropagation();
        setMenuPosition(null);
    };

    const handleSaveEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (editName.trim()) {
            onRename(project.id, editName);
        }
        setIsEditing(false);
    };

    const handleCancelEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditName(project.name);
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
                            <div className="flex items-center gap-2 mb-1" onClick={e => e.stopPropagation()}>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
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
                                {project.name}
                            </h3>
                        )}
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {project.description || "No description"}
                        </p>
                        <span className="text-xs text-muted-foreground/60 mt-2 block">
                            Updated {formatDistanceToNow(project.updatedAt, { addSuffix: true })}
                        </span>
                    </div>
                    {/* Desktop Hover Action */}
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
                                onClick={(e) => onDelete(e, project.id)}
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
                                onDelete(syntheticEvent, project.id);
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

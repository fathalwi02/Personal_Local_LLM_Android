// Zustand store for project state management
import { create } from "zustand";
import { Project, ProjectFile } from "@/types";
import {
    loadProjects,
    saveProjects,
    createProject as createProjectInStorage,
    updateProject as updateProjectInStorage,
    deleteProject as deleteProjectInStorage,
} from "@/lib/projectStorage";
import { v4 as uuidv4 } from "uuid";

interface ProjectStore {
    projects: Project[];
    activeProjectId: string | null;

    initialize: () => void;
    createProject: (name: string, description: string) => Project;
    updateProject: (id: string, updates: Partial<Project>) => void;
    deleteProject: (id: string) => void;
    setActiveProject: (id: string | null) => void;
    getProject: (id: string) => Project | undefined;

    // Instructions & Files
    updateInstructions: (projectId: string, instructions: string) => void;
    addFile: (projectId: string, file: Omit<ProjectFile, 'id' | 'createdAt'>) => void;
    removeFile: (projectId: string, fileId: string) => void;

    // Conversations
    addConversation: (projectId: string, conversationId: string) => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
    projects: [],
    activeProjectId: null,

    initialize: () => {
        const projects = loadProjects();
        set({ projects });
    },

    createProject: (name: string, description: string) => {
        const newProject = createProjectInStorage(name, description);
        set((state) => ({
            projects: [...state.projects, newProject],
        }));
        return newProject;
    },

    updateProject: (id: string, updates: Partial<Project>) => {
        updateProjectInStorage(id, updates);
        set((state) => ({
            projects: state.projects.map((p) =>
                p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
            ),
        }));
    },

    deleteProject: (id: string) => {
        deleteProjectInStorage(id);
        set((state) => ({
            projects: state.projects.filter((p) => p.id !== id),
            activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
        }));
    },

    setActiveProject: (id: string | null) => {
        set({ activeProjectId: id });
    },

    getProject: (id: string) => {
        return get().projects.find((p) => p.id === id);
    },

    updateInstructions: (projectId: string, instructions: string) => {
        get().updateProject(projectId, { instructions });
    },

    addFile: (projectId: string, file: Omit<ProjectFile, 'id' | 'createdAt'>) => {
        const project = get().getProject(projectId);
        if (project) {
            const newFile: ProjectFile = {
                ...file,
                id: uuidv4(),
                createdAt: Date.now(),
            };
            get().updateProject(projectId, {
                files: [...project.files, newFile],
            });
        }
    },

    removeFile: (projectId: string, fileId: string) => {
        const project = get().getProject(projectId);
        if (project) {
            get().updateProject(projectId, {
                files: project.files.filter((f) => f.id !== fileId),
            });
        }
    },

    addConversation: (projectId: string, conversationId: string) => {
        const project = get().getProject(projectId);
        if (project && !project.conversationIds.includes(conversationId)) {
            get().updateProject(projectId, {
                conversationIds: [...project.conversationIds, conversationId],
            });
        }
    },
}));

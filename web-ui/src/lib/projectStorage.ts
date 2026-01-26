// Project storage utilities
import { Project } from "@/types";
import { v4 as uuidv4 } from "uuid";

const PROJECTS_KEY = "fath_ai_projects";

// Save all projects to localStorage
export function saveProjects(projects: Project[]): void {
    try {
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    } catch (error) {
        console.error("Failed to save projects:", error);
    }
}

// Load all projects from localStorage
export function loadProjects(): Project[] {
    try {
        const data = localStorage.getItem(PROJECTS_KEY);
        if (data) {
            return JSON.parse(data);
        }
    } catch (error) {
        console.error("Failed to load projects:", error);
    }
    return [];
}

// Create a new project
export function createProject(name: string, description: string): Project {
    const projects = loadProjects();

    const newProject: Project = {
        id: uuidv4(),
        name,
        description,
        instructions: "",
        files: [],
        conversationIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    projects.push(newProject);
    saveProjects(projects);

    return newProject;
}

// Update a project
export function updateProject(id: string, updates: Partial<Project>): Project | null {
    const projects = loadProjects();
    const index = projects.findIndex((p) => p.id === id);

    if (index === -1) return null;

    projects[index] = {
        ...projects[index],
        ...updates,
        updatedAt: Date.now(),
    };

    saveProjects(projects);
    return projects[index];
}

// Delete a project
export function deleteProject(id: string): void {
    const projects = loadProjects();
    const updated = projects.filter((p) => p.id !== id);
    saveProjects(updated);
}

// Get a project by ID
export function getProject(id: string): Project | null {
    const projects = loadProjects();
    return projects.find((p) => p.id === id) || null;
}

// Add conversation to project
export function addConversationToProject(projectId: string, conversationId: string): void {
    const project = getProject(projectId);
    if (project && !project.conversationIds.includes(conversationId)) {
        updateProject(projectId, {
            conversationIds: [...project.conversationIds, conversationId],
        });
    }
}

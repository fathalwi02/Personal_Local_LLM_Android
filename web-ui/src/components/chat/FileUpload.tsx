"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";

export interface UploadedFile {
    name: string;
    type: "text" | "image";
    content: string;
    mimeType: string;
}

interface FileUploadProps {
    onFilesUploaded: (files: UploadedFile[]) => void;
    uploadedFiles: UploadedFile[];
    onRemoveFile: (index: number) => void;
}

export default function FileUpload({
    onFilesUploaded,
    uploadedFiles,
    onRemoveFile,
}: FileUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            if (acceptedFiles.length === 0) return;

            setIsUploading(true);
            setError(null);

            try {
                const formData = new FormData();
                acceptedFiles.forEach((file) => {
                    formData.append("files", file);
                });

                const response = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Upload failed");
                }

                if (data.files && data.files.length > 0) {
                    onFilesUploaded(data.files);
                }

                if (data.errors && data.errors.length > 0) {
                    setError(data.errors.join(", "));
                }
            } catch (err) {
                setError((err as Error).message);
            } finally {
                setIsUploading(false);
            }
        },
        [onFilesUploaded]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: true,
    });

    return (
        <div className="space-y-2">
            {/* Drop Zone */}
            <div
                {...getRootProps()}
                className={`relative border-2 border-dashed rounded-xl p-4 transition-all cursor-pointer ${isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                    }`}
            >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    {isUploading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm">Uploading...</span>
                        </>
                    ) : (
                        <>
                            <Upload className="w-5 h-5" />
                            <span className="text-sm">
                                {isDragActive
                                    ? "Drop files here"
                                    : "Drag & drop files, or click to select"}
                            </span>
                            <span className="text-xs opacity-60">
                                Supports code, text, images, PDFs, and DOCX
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <p className="text-xs text-red-500">{error}</p>
            )}

            {/* Uploaded Files */}
            <AnimatePresence>
                {uploadedFiles.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-wrap gap-2"
                    >
                        {uploadedFiles.map((file, index) => (
                            <motion.div
                                key={`${file.name}-${index}`}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="relative group"
                            >
                                {file.type === "image" || file.mimeType?.startsWith("image/") ? (
                                    <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border bg-secondary">
                                        <img
                                            src={file.content}
                                            alt={file.name}
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemoveFile(index);
                                            }}
                                            className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                                        >
                                            <X className="w-3 h-3 text-white" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg text-sm border border-border">
                                        <FileText className="w-3.5 h-3.5 text-orange-500" />
                                        <span className="max-w-[150px] truncate text-foreground text-xs font-medium">
                                            {file.name}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemoveFile(index);
                                            }}
                                            className="p-0.5 hover:bg-background rounded-full transition-colors"
                                        >
                                            <X className="w-3 h-3 text-muted-foreground" />
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

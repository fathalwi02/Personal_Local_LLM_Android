import { NextRequest } from "next/server";
import { spawn } from "child_process";
import mammoth from "mammoth";

// File types we can process
const ALLOWED_DOC_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
];

const ALLOWED_TEXT_TYPES = [
    "text/plain",
    "text/markdown",
    "text/csv",
    "text/html",
    "text/css",
    "text/javascript",
    "application/json",
    "application/xml",
    "application/x-yaml",
];

const ALLOWED_CODE_EXTENSIONS = [
    ".js", ".ts", ".jsx", ".tsx", ".py", ".java", ".cpp", ".c", ".h",
    ".cs", ".go", ".rs", ".rb", ".php", ".swift", ".kt", ".scala",
    ".sh", ".bash", ".zsh", ".fish", ".ps1", ".sql", ".r", ".m",
    ".html", ".css", ".scss", ".less", ".json", ".xml", ".yaml", ".yml",
    ".md", ".txt", ".csv", ".toml", ".ini", ".cfg", ".conf", ".env",
];

const ALLOWED_IMAGE_TYPES = [
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface UploadedFile {
    name: string;
    type: "text" | "image";
    content: string; // Base64 for images, plain text for text files
    mimeType: string;
}

function isTextFile(mimeType: string, fileName: string): boolean {
    // Check MIME type
    if (ALLOWED_TEXT_TYPES.includes(mimeType)) return true;
    if (mimeType.startsWith("text/")) return true;

    // Check extension
    const ext = "." + fileName.split(".").pop()?.toLowerCase();
    return ALLOWED_CODE_EXTENSIONS.includes(ext);
}

function isPdfFile(mimeType: string): boolean {
    return ALLOWED_DOC_TYPES.includes(mimeType);
}

function isImageFile(mimeType: string): boolean {
    return ALLOWED_IMAGE_TYPES.includes(mimeType);
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
        const child = spawn("pdftotext", ["-", "-"]);
        let output = "";
        let error = "";

        child.stdout.on("data", (data) => output += data.toString());
        child.stderr.on("data", (data) => error += data.toString());

        child.on("close", (code) => {
            if (code === 0) resolve(output);
            else reject(new Error(`pdftotext failed: ${error}`));
        });

        child.stdin.write(buffer);
        child.stdin.end();
    });
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const files = formData.getAll("files") as File[];

        if (!files || files.length === 0) {
            return new Response(
                JSON.stringify({ error: "No files provided" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const processedFiles: UploadedFile[] = [];
        const errors: string[] = [];

        for (const file of files) {
            // Size check
            if (file.size > MAX_FILE_SIZE) {
                errors.push(`${file.name}: File too large (max 10MB)`);
                continue;
            }

            const mimeType = file.type || "application/octet-stream";

            if (isImageFile(mimeType)) {
                // Process image - convert to base64
                const buffer = await file.arrayBuffer();
                const base64 = Buffer.from(buffer).toString("base64");
                processedFiles.push({
                    name: file.name,
                    type: "image",
                    content: `data:${mimeType};base64,${base64}`,
                    mimeType,
                });
            } else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
                // Process DOCX
                try {
                    const buffer = Buffer.from(await file.arrayBuffer());
                    const result = await mammoth.extractRawText({ buffer });
                    processedFiles.push({
                        name: file.name,
                        type: "text",
                        content: result.value,
                        mimeType,
                    });
                } catch (e) {
                    errors.push(`${file.name}: DOCX processing failed`);
                }
            } else if (isPdfFile(mimeType)) {
                try {
                    const buffer = Buffer.from(await file.arrayBuffer());
                    const text = await extractTextFromPdf(buffer);
                    processedFiles.push({
                        name: file.name,
                        type: "text",
                        content: text, // Treat as text for now
                        mimeType,
                    });
                } catch (e) {
                    errors.push(`${file.name}: PDF processing failed`);
                }
            } else if (isTextFile(mimeType, file.name)) {
                // Process text file
                const text = await file.text();
                processedFiles.push({
                    name: file.name,
                    type: "text",
                    content: text,
                    mimeType,
                });
            } else {
                errors.push(`${file.name}: Unsupported file type (${mimeType})`);
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                files: processedFiles,
                errors: errors.length > 0 ? errors : undefined,
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        console.error("Upload error:", error);
        return new Response(
            JSON.stringify({ error: "Failed to process upload" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

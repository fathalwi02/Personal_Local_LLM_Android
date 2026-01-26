"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { Copy, Check, Terminal } from "lucide-react";
import { useState } from "react";

interface CodeBlockProps {
    language: string | undefined;
    children: string;
}

// Custom Catppuccin Macchiato theme for syntax highlighting
const catppuccinMacchiato: { [key: string]: React.CSSProperties } = {
    'code[class*="language-"]': {
        color: "#cad3f5",
        fontFamily: "var(--font-mono)",
        textAlign: "left",
        whiteSpace: "pre",
        wordSpacing: "normal",
        wordBreak: "normal",
        wordWrap: "normal",
        lineHeight: "1.7",
        tabSize: 4,
        hyphens: "none",
    },
    'pre[class*="language-"]': {
        color: "#cad3f5",
        fontFamily: "var(--font-mono)",
        textAlign: "left",
        whiteSpace: "pre",
        wordSpacing: "normal",
        wordBreak: "normal",
        wordWrap: "normal",
        lineHeight: "1.7",
        tabSize: 4,
        hyphens: "none",
        padding: "1.25rem",
        margin: 0,
        overflow: "auto",
        background: "transparent",
    },
    comment: { color: "#6e738d", fontStyle: "italic" },
    prolog: { color: "#6e738d" },
    doctype: { color: "#6e738d" },
    cdata: { color: "#6e738d" },
    punctuation: { color: "#939ab7" },
    property: { color: "#f5a97f" },
    tag: { color: "#ed8796" },
    boolean: { color: "#f5a97f" },
    number: { color: "#f5a97f" },
    constant: { color: "#f5a97f" },
    symbol: { color: "#a6da95" },
    deleted: { color: "#ed8796" },
    selector: { color: "#a6da95" },
    "attr-name": { color: "#eed49f" },
    string: { color: "#a6da95" },
    char: { color: "#a6da95" },
    builtin: { color: "#ed8796" },
    inserted: { color: "#a6da95" },
    operator: { color: "#91d7e3" },
    entity: { color: "#f5a97f", cursor: "help" },
    url: { color: "#91d7e3" },
    ".language-css .token.string": { color: "#91d7e3" },
    ".style .token.string": { color: "#91d7e3" },
    variable: { color: "#cad3f5" },
    atrule: { color: "#c6a0f6" },
    "attr-value": { color: "#a6da95" },
    function: { color: "#8aadf4" },
    "class-name": { color: "#eed49f" },
    keyword: { color: "#c6a0f6" },
    regex: { color: "#a6da95" },
    important: { color: "#f5a97f", fontWeight: "bold" },
    bold: { fontWeight: "bold" },
    italic: { fontStyle: "italic" },
};

export default function CodeBlock({ language, children }: CodeBlockProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(children);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Get language display name
    const getLanguageDisplay = (lang: string | undefined) => {
        const langMap: { [key: string]: string } = {
            js: "JavaScript",
            ts: "TypeScript",
            tsx: "TypeScript React",
            jsx: "JavaScript React",
            py: "Python",
            python: "Python",
            sh: "Shell",
            bash: "Bash",
            zsh: "Zsh",
            css: "CSS",
            html: "HTML",
            json: "JSON",
            yaml: "YAML",
            yml: "YAML",
            sql: "SQL",
            rust: "Rust",
            go: "Go",
            cpp: "C++",
            c: "C",
        };
        return langMap[lang?.toLowerCase() || ""] || lang?.toUpperCase() || "CODE";
    };

    return (
        <div className="relative group my-4 rounded-xl overflow-hidden shadow-md">
            {/* Glassmorphism container */}
            <div className="bg-[#1e2030]/80 backdrop-blur-sm border border-[#494d64]/50 rounded-xl overflow-hidden shadow-lg">
                {/* Header (Mantle) */}
                <div className="flex items-center justify-between px-4 py-2 bg-[#181926]/60 border-b border-[#494d64]/30 rounded-t-xl rounded-b-none">
                    <div className="flex items-center gap-2">
                        <Terminal className="w-3.5 h-3.5 text-[#91d7e3]" />
                        <span className="text-xs text-[#a5adcb] font-medium font-mono tracking-wide">
                            {getLanguageDisplay(language)}
                        </span>
                    </div>
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 text-xs text-[#a5adcb] hover:text-[#cad3f5] transition-all px-2.5 py-1 rounded-lg hover:bg-[#363a4f]/50 active:scale-95"
                        title="Copy code"
                    >
                        {copied ? (
                            <>
                                <Check className="w-3.5 h-3.5 text-[#a6da95]" />
                                <span className="text-[#a6da95] font-medium">Copied!</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Code Content */}
                <div className="text-sm overflow-x-auto rounded-t-none rounded-b-xl">
                    <SyntaxHighlighter
                        language={language || "text"}
                        style={catppuccinMacchiato}
                        customStyle={{
                            margin: 0,
                            padding: "1.25rem",
                            background: "transparent", // Keep transparent to use parent bg
                            fontSize: "0.8125rem",
                            lineHeight: "1.7",
                            borderRadius: 0, // Force square corners
                        }}
                        showLineNumbers={true}
                        lineNumberStyle={{
                            color: "#5b6078",
                            minWidth: "2.5em",
                            paddingRight: "1.25em",
                            textAlign: "right",
                            userSelect: "none",
                            opacity: 0.7,
                        }}
                        wrapLines={true}
                        lineProps={{
                            style: {
                                wordBreak: "break-all",
                                whiteSpace: "pre-wrap",
                            },
                        }}
                    >
                        {children}
                    </SyntaxHighlighter>
                </div>
            </div>
        </div>
    );
}

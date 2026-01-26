"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Globe,
  ChevronDown,
  Loader2,
  Square,
  Paperclip,
  Search,
  Brain,
  FlaskConical,
  Factory,
  Code2,
  Globe2,
  PanelLeft,
} from "lucide-react";

// Components
import Sidebar from "@/components/sidebar/Sidebar";
import FileUpload, { UploadedFile } from "@/components/chat/FileUpload";
import ConversationSearch from "@/components/chat/ConversationSearch";
import ChatsListView from "@/components/ChatsListView";
import ProjectsListView from "@/components/ProjectsListView";
import CreateProjectModal from "@/components/CreateProjectModal";
import ProjectDetailView from "@/components/ProjectDetailView";
import PersonalContextView from "@/components/PersonalContextView";
import ChatMessage from "@/components/chat/ChatMessage";
import TokenCounter from "@/components/chat/TokenCounter";

// Stores & Utils
import { useChatStore } from "@/stores/chatStore";
import { useMemoryStore } from "@/stores/memoryStore";
import { estimateConversationTokens } from "@/lib/tokenizer";
import { Model, ViewType } from "@/types";

export default function Home() {
  // Stores
  const {
    activeConversationId,
    activeConversation,
    isLoading,
    initialize: initChatStore,
    createConversation,
    setActiveConversation,
    addMessage,
    updateMessage,
    deleteMessage,
    editMessage,
    setIsLoading,
    setAbortController,
    stopGeneration,
    autoGenerateTitle,
  } = useChatStore();

  const {
    settings: memorySettings,
    initialize: initMemoryStore,
    getAllMemories,
  } = useMemoryStore();


  // UI State
  const [input, setInput] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<ViewType>('chat');

  // Model & Features
  const [selectedModel, setSelectedModel] = useState("llama3.1:8b");
  const [models, setModels] = useState<Model[]>([]);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [searchMode, setSearchMode] = useState("auto");
  const [thinkingEnabled, setThinkingEnabled] = useState(false);

  // Files
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);

  // Search
  const [showSearch, setShowSearch] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // Projects
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // Tokens & Performance
  const [tokens, setTokens] = useState({ input: 0, output: 0, total: 0 });

  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Derived
  const conversation = activeConversation();
  const messages = conversation?.messages || [];

  // Initialize
  useEffect(() => {
    initChatStore();
    initMemoryStore();
    setIsInitialized(true);
  }, [initChatStore, initMemoryStore]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Token Estimation
  useEffect(() => {
    const counts = estimateConversationTokens(messages);
    setTokens({
      input: 0, // Mocking split for now
      output: 0,
      total: counts
    });
  }, [messages]);

  // Load Models
  const fetchModels = async () => {
    try {
      const res = await fetch('/api/models');
      if (res.ok) {
        const data = await res.json();
        setModels(data.models || []);
        if (data.models?.length > 0 && !selectedModel) {
          setSelectedModel(data.models[0].name);
        }
      }
    } catch (e) {
      setModels([{ name: "llama3.1:8b", model: "llama3.1:8b" }]);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []); // Only run on mount

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && uploadedFiles.length === 0) || isLoading) return;

    const userMsgContent = input;
    setInput("");
    setIsLoading(true);

    if (inputRef.current) inputRef.current.style.height = 'auto';

    let convId = activeConversationId;
    if (!convId) {
      convId = createConversation(selectedModel);
    }

    // Add user message
    addMessage({ role: 'user', content: userMsgContent });

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const body = {
        model: selectedModel,
        messages: [...messages, { role: 'user', content: userMsgContent }],
        webSearch: webSearchEnabled,
        thinking: thinkingEnabled,
        memories: memorySettings.isEnabled ? getAllMemories() : [],
        files: uploadedFiles,
        searchMode
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!response.ok) throw new Error("Failed to fetch");

      const reader = response.body?.getReader();
      let assistantContent = "";
      let messageSources: { title: string; url: string; domain?: string; favicon?: string }[] = [];
      let messageQueries: string[] = [];
      const assistantMsg = addMessage({ role: 'assistant', content: '', isSearchResult: webSearchEnabled });

      if (reader) {
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.sources) {
                  messageSources = data.sources;
                }
                if (data.queries) {
                  messageQueries = data.queries;
                }
                if (data.sources || data.queries) {
                  updateMessage(assistantMsg.id, assistantContent, messageSources, messageQueries);
                }
                if (data.content) {
                  assistantContent += data.content;
                  updateMessage(assistantMsg.id, assistantContent, messageSources, messageQueries);
                }
              } catch { }
            }
          }
        }
        // Final update to ensure sources are saved after stream completes
        if (messageSources.length > 0 || messageQueries.length > 0) {
          updateMessage(assistantMsg.id, assistantContent, messageSources, messageQueries);
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        addMessage({ role: 'assistant', content: "Sorry, I encountered an error." });
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
      setUploadedFiles([]);

      // Auto-generate a smart title based on conversation context
      if (convId) {
        autoGenerateTitle(convId);
      }
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const showWelcome = currentView === 'chat' && messages.length === 0;

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      {/* Sidebar (Existing Component) */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        selectedModel={selectedModel}
        currentView={currentView}
        onViewChange={setCurrentView}
      />

      {/* Modals & Panels */}
      <ConversationSearch
        messages={messages}
        onHighlight={setHighlightedMessageId}
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        sidebarOpen={sidebarOpen}
      />

      <CreateProjectModal
        isOpen={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onCreated={(id) => {
          setActiveProjectId(id);
          setCurrentView('project-detail');
        }}
      />

      {/* Main Content Area */}
      <main className={`flex flex-col flex-1 h-full min-w-0 transition-all duration-300 ${sidebarOpen ? "lg:ml-72" : "md:ml-16"}`}>

        {/* Logo when sidebar is closed (Desktop) */}
        {!sidebarOpen && (
          <div className="hidden md:block fixed top-4 left-[72px] z-40">
            <Image src="/logo-transparent.png" alt="Fath-AI" width={40} height={40} className="object-contain" />
          </div>
        )}

        {/* Mobile Header (Always visible for sidebar toggle) */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between p-4 pointer-events-none">
          <button
            onClick={() => setSidebarOpen(true)}
            className="pointer-events-auto p-2 rounded-lg text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        </div>


        {/* View Switcher */}
        <div className="flex-1 overflow-hidden flex flex-col relative pt-14 md:pt-0">

          {currentView === 'chats' && <ChatsListView onChatSelect={(id) => { setActiveConversation(id); setCurrentView('chat'); }} onNewChat={() => { createConversation(selectedModel); setCurrentView('chat'); }} />}
          {currentView === 'projects' && <ProjectsListView onProjectSelect={(id) => { setActiveProjectId(id); setCurrentView('project-detail'); }} onNewProject={() => setShowCreateProject(true)} />}
          {currentView === 'project-detail' && activeProjectId && <ProjectDetailView projectId={activeProjectId} onBack={() => setCurrentView('projects')} models={models} selectedModel={selectedModel} onModelChange={setSelectedModel} />}
          {currentView === 'personal-context' && <PersonalContextView />}

          {currentView === 'chat' && (
            <>
              {/* Desktop Header (only when chatting) */}
              {messages.length > 0 && (
                <header className="hidden md:flex sticky top-0 z-20 items-center justify-end px-6 py-4 bg-background/80 backdrop-blur-xl border-b border-border/40 relative">
                  <h2 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-lg font-semibold tracking-tight truncate max-w-[200px] md:max-w-md">
                    {conversation?.title}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowSearch(true)}
                      className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                      title="Search (Ctrl+F)"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                </header>
              )}

              {/* Scrollable Messages Area */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden pb-[200px] md:pb-[180px]">
                <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 ${showWelcome ? "h-full" : "max-w-4xl"}`}>

                  {showWelcome ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full h-full flex flex-col"
                    >
                      <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-0">
                        <Image src="/logo-transparent.png" alt="Logo" width={56} height={56} priority />
                        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight px-6 md:px-0 text-balance leading-normal text-center">How can I help you today, Fath?</h1>
                      </div>

                      <div className="w-full max-w-2xl mx-auto px-2 md:px-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] md:pb-8">
                        <ChatInput
                          input={input}
                          setInput={setInput}
                          onInputChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                          onSubmit={handleSubmit}
                          isLoading={isLoading}
                          selectedModel={selectedModel}
                          setSelectedModel={setSelectedModel}
                          models={models}
                          refreshModels={fetchModels}
                          webSearchEnabled={webSearchEnabled}
                          setWebSearchEnabled={setWebSearchEnabled}
                          thinkingEnabled={thinkingEnabled}
                          setThinkingEnabled={setThinkingEnabled}
                          uploadedFiles={uploadedFiles}
                          setUploadedFiles={setUploadedFiles}
                          showFileUpload={showFileUpload}
                          setShowFileUpload={setShowFileUpload}
                          searchMode={searchMode}
                          setSearchMode={setSearchMode}
                          inputRef={inputRef}
                        />
                      </div>
                    </motion.div>
                  ) : (
                    <>
                      {messages.map((msg, idx) => (
                        <ChatMessage
                          key={msg.id || idx}
                          message={msg}
                          onDelete={deleteMessage}
                          onEdit={editMessage}
                          onRegenerate={idx === messages.length - 1 && msg.role === 'assistant' ? () => { } : undefined}
                          isLast={idx === messages.length - 1}
                          isLoading={isLoading && idx === messages.length - 1 && msg.role === 'assistant'}
                        />
                      ))}
                      {isLoading && messages[messages.length - 1]?.role === 'user' && (
                        <div className="flex gap-4 items-center animate-in fade-in duration-300">
                          <motion.div
                            animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          >
                            <Image src="/logo-transparent.png" alt="Thinking" width={36} height={36} className="object-contain" />
                          </motion.div>
                          <div className="bg-secondary/40 rounded-2xl p-4 text-sm text-muted-foreground">Thinking...</div>
                        </div>
                      )}
                      <div ref={messagesEndRef} className="h-4" />
                    </>
                  )}
                </div>
              </div>

              {/* Floating Footer Input (when messages present) */}
              {!showWelcome && (
                <footer className="bg-background/80 backdrop-blur-xl border-t border-border/40 p-2 md:p-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] md:pb-4 transition-all">
                  <div className="max-w-4xl mx-auto space-y-2 md:space-y-3">
                    <div className="flex justify-center items-center px-1">
                      <TokenCounter
                        inputTokens={tokens.input}
                        outputTokens={tokens.output}
                        totalTokens={tokens.total}
                        model={selectedModel}
                      />
                    </div>
                    <ChatInput
                      input={input}
                      setInput={setInput}
                      onInputChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      onSubmit={handleSubmit}
                      isLoading={isLoading}
                      selectedModel={selectedModel}
                      setSelectedModel={setSelectedModel}
                      models={models}
                      refreshModels={fetchModels}
                      webSearchEnabled={webSearchEnabled}
                      setWebSearchEnabled={setWebSearchEnabled}
                      thinkingEnabled={thinkingEnabled}
                      setThinkingEnabled={setThinkingEnabled}
                      uploadedFiles={uploadedFiles}
                      setUploadedFiles={setUploadedFiles}
                      showFileUpload={showFileUpload}
                      setShowFileUpload={setShowFileUpload}
                      stopGeneration={stopGeneration}
                      searchMode={searchMode}
                      setSearchMode={setSearchMode}
                      inputRef={inputRef}
                    />
                    <p className="text-[10px] text-center text-muted-foreground/50 hidden md:block">Fath-AI can make mistakes. Verify important info.</p>
                  </div>
                </footer>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// Inner Input Component to reuse in Welcome and Footer
function ChatInput({
  input,
  onInputChange,
  onKeyDown,
  onSubmit,
  isLoading,
  selectedModel,
  setSelectedModel,
  models,
  refreshModels,
  webSearchEnabled,
  setWebSearchEnabled,
  thinkingEnabled,
  setThinkingEnabled,
  uploadedFiles,
  setUploadedFiles,
  showFileUpload,
  setShowFileUpload,
  stopGeneration,
  searchMode,
  setSearchMode,
  inputRef
}: any) {
  const [showModels, setShowModels] = useState(false);
  const [showSearchModes, setShowSearchModes] = useState(false);

  // ... (keeping existing logic) ...

  const searchModes = [
    { id: 'auto', label: 'Auto', icon: <Search size={14} /> },
    { id: 'scientific', label: 'Scientific', icon: <FlaskConical size={14} /> },
    { id: 'industrial', label: 'Industrial', icon: <Factory size={14} /> },
    { id: 'code', label: 'Code', icon: <Code2 size={14} /> },
    { id: 'general', label: 'General', icon: <Globe2 size={14} /> },
  ];

  const currentMode = searchModes.find(m => m.id === searchMode) || searchModes[0];

  return (
    <div className="relative w-full">
      <AnimatePresence>
        {(showFileUpload || uploadedFiles.length > 0) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mb-2">
            <FileUpload
              onFilesUploaded={(files: any) => setUploadedFiles((p: any) => [...p, ...files])}
              uploadedFiles={uploadedFiles}
              onRemoveFile={(idx: number) => setUploadedFiles((p: any) => p.filter((_: any, i: number) => i !== idx))}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={onSubmit} className="bg-background dark:bg-secondary/20 border border-border/40 shadow-lg shadow-black/5 dark:shadow-black/20 rounded-3xl p-3 transition-all">
        <textarea
          ref={inputRef}
          value={input}
          onChange={onInputChange}
          onKeyDown={onKeyDown}
          onPaste={async (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of items) {
              if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) {
                  // Convert to base64
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const base64 = event.target?.result as string;
                    setUploadedFiles((prev: any) => [...prev, {
                      name: `pasted-image-${Date.now()}.png`,
                      type: "image",
                      content: base64,
                      mimeType: file.type
                    }]);
                  };
                  reader.readAsDataURL(file);
                }
                break;
              }
            }
          }}
          placeholder="Ask anything, Fath..."
          rows={1}
          className="w-full bg-transparent resize-none outline-none text-foreground placeholder-muted-foreground/70 px-3 py-2 text-base leading-relaxed max-h-[200px]"
        />

        <div className="flex items-center justify-between mt-2 px-1 gap-1 md:gap-2">
          <div className="flex items-center gap-0.5 md:gap-1">
            <button type="button" onClick={() => setShowFileUpload(!showFileUpload)} className={`p-2 rounded-full transition-all ${showFileUpload ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-muted-foreground"}`}>
              <Paperclip size={18} />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSearchModes(!showSearchModes)}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${webSearchEnabled ? "bg-blue-500 text-white shadow-sm" : "hover:bg-secondary text-muted-foreground"}`}
              >
                {webSearchEnabled ? currentMode.icon : <Globe size={18} />}
              </button>

              <AnimatePresence>
                {showSearchModes && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-0 mb-2 w-40 bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-50 p-1"
                  >
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider">
                      Web Search
                    </div>

                    {/* Toggle Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setWebSearchEnabled(!webSearchEnabled);
                        setShowSearchModes(false);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg transition-colors text-foreground hover:bg-secondary mb-1"
                    >
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${webSearchEnabled ? "bg-primary" : "bg-muted"}`}>
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${webSearchEnabled ? "left-4.5" : "left-0.5"}`} style={{ left: webSearchEnabled ? 'calc(100% - 14px)' : '2px' }} />
                      </div>
                      <span>{webSearchEnabled ? "Enabled" : "Disabled"}</span>
                    </button>

                    <div className="h-px bg-border/50 my-1" />

                    {/* Modes */}
                    {searchModes.map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        disabled={!webSearchEnabled}
                        onClick={() => {
                          setSearchMode(mode.id);
                          setShowSearchModes(false);
                        }}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg transition-colors ${!webSearchEnabled
                          ? "opacity-50 cursor-not-allowed"
                          : searchMode === mode.id
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          }`}
                      >
                        {mode.icon}
                        {mode.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button type="button" onClick={() => setThinkingEnabled(!thinkingEnabled)} className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${thinkingEnabled ? "bg-purple-500 text-white" : "hover:bg-secondary text-muted-foreground"}`}>
              <Brain size={18} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2 shrink-0 min-w-0">
            <div className="relative shrink min-w-0">
              <button type="button" onClick={() => {
                if (!showModels && refreshModels) refreshModels();
                setShowModels(!showModels);
              }} className="flex items-center justify-end gap-1 px-2 md:px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-all max-w-[100px] md:max-w-[180px]">
                <span className="truncate">{selectedModel.split(":")[0]}</span>
                <ChevronDown size={14} className="shrink-0" />
              </button>
              <AnimatePresence>
                {showModels && (
                  <motion.div initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }} className="absolute bottom-full right-0 mb-3 w-48 bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-50">
                    {models.map((m: any) => (
                      <button key={m.name} type="button" onClick={() => { setSelectedModel(m.name); setShowModels(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-secondary transition-colors ${selectedModel === m.name ? "text-primary font-medium" : "text-foreground"}`}>
                        {m.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {isLoading ? (
              <button type="button" onClick={stopGeneration} className="p-3 rounded-full bg-red-500 text-white hover:opacity-90 shadow-md">
                <Square size={16} fill="currentColor" />
              </button>
            ) : (
              <button type="submit" disabled={!input.trim() && uploadedFiles.length === 0} className="p-3 rounded-full bg-primary text-primary-foreground disabled:opacity-20 hover:opacity-90 transition-all shadow-md">
                <Send size={18} />
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

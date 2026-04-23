"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Send,
  Trash2,
  Bot,
  User,
  Sparkles,
  PenTool,
  BarChart3,
  Clock,
  FileText,
  MessageCircle,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/app-store";
import type { Platform } from "@/types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface ConversationSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  platform: Platform;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "ai-chat-history";

const QUICK_ACTIONS = [
  {
    icon: PenTool,
    label: "帮我写一条朋友圈",
    message: "请帮我写一条朋友圈文案，主题是职场心得分享，要自然温暖，控制在150字以内。",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    icon: FileText,
    label: "帮我写一篇小红书笔记",
    message: "请帮我写一篇小红书笔记，主题是好物分享，要有吸引人的标题、丰富的emoji和话题标签。",
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/30",
  },
  {
    icon: Sparkles,
    label: "优化这段文案",
    message: "请帮我优化文案，让它更吸引人、更有传播力。我会把需要优化的文案发给你。",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/30",
  },
  {
    icon: PenTool,
    label: "给这个话题想标题",
    message: "请帮我为以下话题想5个吸引眼球的标题，要有创意、有悬念。我会告诉你具体话题。",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
  {
    icon: BarChart3,
    label: "分析我的内容表现",
    message: "请帮我分析最近内容的表现数据，找出表现好的内容特征和需要改进的地方。",
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-50 dark:bg-cyan-950/30",
  },
  {
    icon: Clock,
    label: "推荐今天的发布时间",
    message: "请根据我的内容类型和目标受众，推荐今天最适合的发布时间段，并说明原因。",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/30",
  },
] as const;

// ─── Simple Markdown Renderer ───────────────────────────────────────────────

function SimpleMarkdown({ content }: { content: string }) {
  const html = useMemo(() => {
    let result = content
      // Escape HTML
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Bold: **text**
    result = result.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');
    // Italic: *text*
    result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em class="italic">$1</em>');
    // Inline code: `text`
    result = result.replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 rounded bg-muted text-[0.85em] font-mono">$1</code>');

    // Lists: - item or * item or 1. item
    const lines = result.split("\n");
    let inList = false;
    const processedLines: string[] = [];

    for (const line of lines) {
      const listMatch = line.match(/^(\s*)([-*]|\d+\.)\s+(.+)$/);
      if (listMatch) {
        if (!inList) {
          processedLines.push('<ul class="list-disc list-inside space-y-1 my-2">');
          inList = true;
        }
        processedLines.push(`<li>${listMatch[3]}</li>`);
      } else {
        if (inList) {
          processedLines.push("</ul>");
          inList = false;
        }
        if (line.trim() === "") {
          processedLines.push('<div class="h-2"></div>');
        } else {
          processedLines.push(line);
        }
      }
    }
    if (inList) {
      processedLines.push("</ul>");
    }

    // Wrap in paragraphs (for non-list, non-empty lines)
    let finalResult = processedLines.join("\n");
    finalResult = finalResult.replace(
      /^(?!<[udl]|<div)(.+)$/gm,
      '<p class="m-0">$1</p>',
    );

    return finalResult;
  }, [content]);

  return (
    <div
      className="text-sm leading-relaxed break-words"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ─── Typing Indicator ───────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-violet-400"
          animate={{
            y: [0, -6, 0],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ─── Message Bubble ─────────────────────────────────────────────────────────

function ChatBubble({
  message,
  onCopy,
}: {
  message: ChatMessage;
  onCopy: (content: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = useCallback(() => {
    onCopy(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content, onCopy]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`flex gap-2.5 content-card-hover micro-hover ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5">
        <AvatarFallback
          className={
            isUser
              ? "bg-gradient-to-br from-slate-400 to-slate-500 text-white text-xs"
              : "bg-gradient-to-br from-violet-500 to-purple-600 text-white text-xs"
          }
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      {/* Bubble */}
      <div className={`max-w-[80%] min-w-0 ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`relative rounded-2xl px-3.5 py-2.5 ${
            isUser
              ? "bg-muted text-foreground rounded-tr-md"
              : "border border-violet-200/60 dark:border-violet-700/40 bg-gradient-to-br from-violet-50/50 to-purple-50/50 dark:from-violet-950/20 dark:to-purple-950/20 text-foreground rounded-tl-md"
          }`}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words m-0">
              {message.content}
            </p>
          ) : (
            <SimpleMarkdown content={message.content} />
          )}
        </div>

        {/* Actions row */}
        <div
          className={`flex items-center gap-1 mt-1 px-1 ${
            isUser ? "justify-end" : "justify-start"
          }`}
        >
          <span className="text-[10px] text-muted-foreground/60">
            {new Date(message.timestamp).toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {!isUser && (
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleCopy}
                    className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted/60 text-muted-foreground/60 hover:text-foreground transition-colors focus-ring-soft"
                    aria-label="复制消息"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {copied ? "已复制" : "复制"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ onQuickAction }: { onQuickAction: (msg: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center h-full px-6 py-10"
    >
      {/* Welcome Icon */}
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200/50 dark:shadow-violet-900/30 mb-4"
      >
        <MessageCircle className="h-8 w-8 text-white" />
      </motion.div>

      <h3 className="text-lg font-semibold text-foreground mb-1">
        AI 对话创作助手
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-xs mb-6">
        通过对话的方式，让 AI 帮你创作优质内容、优化文案、分析表现。
      </p>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
        {QUICK_ACTIONS.map((action, i) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06, duration: 0.3 }}
              onClick={() => onQuickAction(action.message)}
              className={`flex items-center gap-2 p-3 rounded-xl border border-border/60 bg-background hover:bg-muted/40 transition-all duration-200 hover:shadow-sm group text-left content-card-hover micro-hover focus-ring-soft`}
            >
              <div
                className={`h-7 w-7 rounded-lg ${action.bg} flex items-center justify-center flex-shrink-0`}
              >
                <Icon className={`h-3.5 w-3.5 ${action.color}`} />
              </div>
              <span className="text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors leading-tight">
                {action.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── localStorage Helpers ───────────────────────────────────────────────────

function loadConversations(): ConversationSession[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ConversationSession[];
  } catch {
    return [];
  }
}

function saveConversations(conversations: ConversationSession[]) {
  try {
    if (typeof window === "undefined") return;
    // Keep last 10 sessions, trim messages per session to last 50
    const trimmed = conversations
      .slice(0, 10)
      .map((c) => ({
        ...c,
        messages: c.messages.slice(-50),
      }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full or unavailable
  }
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function AIChatWorkspace() {
  const platform = useAppStore((s) => s.platform);
  const persona = useAppStore((s) => s.persona);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreamDone, setIsStreamDone] = useState(true);
  const [conversations, setConversations] = useState<ConversationSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load conversations from localStorage on mount
  useEffect(() => {
    const loaded = loadConversations();
    setConversations(loaded);
    // Resume the most recent conversation for this platform
    const latest = loaded.find((c) => c.platform === platform);
    if (latest && latest.messages.length > 0) {
      setMessages(latest.messages);
      setCurrentSessionId(latest.id);
    }
    setIsInitialized(true);
  }, []);

  // Save to localStorage when messages change
  useEffect(() => {
    if (!isInitialized) return;
    if (messages.length === 0) return;

    setConversations((prev) => {
      let sessionId = currentSessionId;
      let updated: ConversationSession[];

      if (sessionId) {
        updated = prev.map((c) =>
          c.id === sessionId
            ? {
                ...c,
                messages,
                updatedAt: Date.now(),
                title:
                  c.messages[0]?.content?.slice(0, 30) || "新对话",
              }
            : c,
        );
      } else {
        // Create new session
        sessionId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setCurrentSessionId(sessionId);
        const newSession: ConversationSession = {
          id: sessionId,
          title: messages[0]?.content?.slice(0, 30) || "新对话",
          messages,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          platform,
        };
        updated = [newSession, ...prev];
      }

      saveConversations(updated);
      return updated;
    });
  }, [messages, currentSessionId, platform, isInitialized]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Generate unique message ID
  const generateId = useCallback(() => {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }, []);

  // Copy message content
  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      toast.success("已复制到剪贴板");
    }).catch((error) => {
      console.warn('[ai-chat-workspace]', error);
      toast.error("复制失败");
    });
  }, []);

  // Send message
  const handleSend = useCallback(
    async (text?: string) => {
      const content = (text || inputValue).trim();
      if (!content || isLoading) return;

      // Create user message
      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");
      setIsLoading(true);
      setStreamingContent("");
      setIsStreamDone(false);

      // Build messages for API
      const apiMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        abortRef.current = new AbortController();

        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            platform,
            personaId: persona?.id || undefined,
            stream: true,
          }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "请求失败" }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const contentType = response.headers.get("Content-Type") || "";

        // Handle SSE streaming
        if (contentType.includes("text/event-stream")) {
          const reader = response.body?.getReader();
          if (!reader) throw new Error("No response body");

          const decoder = new TextDecoder();
          let fullContent = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === "data: [DONE]") continue;

              if (trimmed.startsWith("data: ")) {
                try {
                  const data = JSON.parse(trimmed.slice(6));
                  if (data.content) {
                    fullContent += data.content;
                    setStreamingContent(fullContent);
                  }
                } catch {
                  // Non-JSON SSE line, skip
                }
              }
            }
          }

          // Add AI response
          const aiMessage: ChatMessage = {
            id: generateId(),
            role: "assistant",
            content: fullContent || streamingContent,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, aiMessage]);
        } else {
          // JSON response (non-streaming fallback)
          const data = await response.json();
          const aiMessage: ChatMessage = {
            id: generateId(),
            role: "assistant",
            content: data.content || "抱歉，我没有生成有效的内容。",
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, aiMessage]);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          // User cancelled, don't show error
          return;
        }
        console.error("Chat error:", error);
        const errorMessage: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: `抱歉，出现了错误：${error instanceof Error ? error.message : "未知错误"}。请稍后重试。`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        toast.error("AI 对话失败", {
          description: error instanceof Error ? error.message : "请稍后重试",
        });
      } finally {
        setIsLoading(false);
        setStreamingContent("");
        setIsStreamDone(true);
        abortRef.current = null;
        textareaRef.current?.focus();
      }
    },
    [
      inputValue,
      isLoading,
      messages,
      generateId,
      platform,
      persona,
      streamingContent,
    ],
  );

  // Handle keyboard shortcut
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // Quick action handler
  const handleQuickAction = useCallback(
    (msg: string) => {
      handleSend(msg);
    },
    [handleSend],
  );

  // Clear conversation
  const handleClear = useCallback(() => {
    setMessages([]);
    setCurrentSessionId(null);
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== currentSessionId);
      saveConversations(updated);
      return updated;
    });
    toast.success("对话已清空");
  }, [currentSessionId]);

  const isEmpty = messages.length === 0 && !isLoading;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              AI 对话创作
            </h3>
            <p className="text-[10px] text-muted-foreground">
              {platform === "wechat" ? "朋友圈" : "小红书"} · 对话式内容创作
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isEmpty && (
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-rose-500 focus-ring-soft"
                    onClick={handleClear}
                    aria-label="清空对话"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  清空对话
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto" ref={scrollRef}>
        {isEmpty ? (
          <EmptyState onQuickAction={handleQuickAction} />
        ) : (
          <div className="px-4 py-4 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} onCopy={handleCopy} />
              ))}
            </AnimatePresence>

            {/* Streaming indicator */}
            {isLoading && !isStreamDone && streamingContent && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2.5 content-card-hover micro-hover"
              >
                <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5">
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-xs">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="max-w-[80%] min-w-0">
                  <div className="relative rounded-2xl rounded-tl-md px-3.5 py-2.5 border border-violet-200/60 dark:border-violet-700/40 bg-gradient-to-br from-violet-50/50 to-purple-50/50 dark:from-violet-950/20 dark:to-purple-950/20 text-foreground">
                    <SimpleMarkdown content={streamingContent} />
                    <span className="inline-block w-1.5 h-4 bg-violet-500 animate-pulse ml-0.5 align-middle" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Loading indicator (before first token) */}
            {isLoading && isStreamDone && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2.5 content-card-hover micro-hover"
              >
                <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5">
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-xs">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="relative rounded-2xl rounded-tl-md border border-violet-200/60 dark:border-violet-700/40 bg-gradient-to-br from-violet-50/50 to-purple-50/50 dark:from-violet-950/20 dark:to-purple-950/20">
                  <TypingIndicator />
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions Bar (when there are messages) */}
      {!isEmpty && (
        <div className="px-4 py-2 border-t border-border/30 flex-shrink-0">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {QUICK_ACTIONS.slice(0, 4).map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action.message)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap border border-border/50 bg-background hover:bg-muted/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-muted-foreground hover:text-foreground flex-shrink-0 focus-ring-soft"
                >
                  <Icon className="h-3 w-3" />
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="px-4 py-3 border-t border-border/50 bg-background/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex gap-2 items-end input-glow">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isLoading ? "AI 正在思考中..." : "输入消息，Shift+Enter 换行..."
            }
            disabled={isLoading}
            rows={1}
            className="flex-1 min-h-[40px] max-h-[120px] resize-none rounded-xl border-border/60 bg-muted/30 text-sm focus-visible:ring-violet-400/40 focus-visible:border-violet-300/60 transition-all input-glow focus-ring-soft"
          />
          <Button
            size="icon"
            className="h-10 w-10 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-sm disabled:opacity-40 transition-all focus-ring-soft"
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isLoading}
            aria-label="发送消息"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground/50 mt-1.5 text-center">
          AI 生成的内容仅供参考，请根据实际情况调整
        </p>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Sparkles,
  CalendarRange,
  BarChart3,
  Globe,
  Settings,
  BookOpen,
  FileText,
  MessageCircle,
  PenTool,
  Zap,
  Keyboard,
} from "lucide-react";
import { CONTENT_TYPE_LABELS, POST_STATUS_LABELS, KNOWLEDGE_CATEGORY_LABELS, type ContentPost, type KnowledgeItem } from "@/types";
import { SHORTCUT_LIST } from "@/hooks/use-keyboard-shortcuts";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const {
    contentPosts,
    knowledgeItems,
    platform,
    setPlatform,
    setRightPanelTab,
    setLeftPanelTab,
    setSelectedPostId,
    setSettingsCenterOpen,
  } = useAppStore();

  const [query, setQuery] = useState("");

  // ── Content search results ────────────────────────────────────────────────
  const contentResults = useMemo(() => {
    if (!query.trim()) return contentPosts.slice(0, 8);
    const q = query.toLowerCase();
    return contentPosts.filter(
      (p) =>
        p.topic.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q),
    );
  }, [query, contentPosts]);

  // ── Knowledge search results ──────────────────────────────────────────────
  const knowledgeResults = useMemo(() => {
    if (!query.trim()) return knowledgeItems.slice(0, 6);
    const q = query.toLowerCase();
    return knowledgeItems.filter(
      (k) =>
        k.title.toLowerCase().includes(q) ||
        k.content.toLowerCase().includes(q),
    );
  }, [query, knowledgeItems]);

  const isXHS = platform === "xiaohongshu";

  // ── Select a content post ─────────────────────────────────────────────────
  const handleSelectPost = useCallback(
    (post: ContentPost) => {
      setSelectedPostId(post.id);
      setRightPanelTab("workspace");
      onOpenChange(false);
      setQuery("");
    },
    [setSelectedPostId, setRightPanelTab, onOpenChange],
  );

  // ── Select a knowledge item ───────────────────────────────────────────────
  const handleSelectKnowledge = useCallback(
    (item: KnowledgeItem) => {
      setLeftPanelTab("knowledge");
      onOpenChange(false);
      setQuery("");
    },
    [setLeftPanelTab, onOpenChange],
  );

  // ── Quick actions ─────────────────────────────────────────────────────────
  const handleAction = useCallback(
    (action: string) => {
      switch (action) {
        case "generate":
          setRightPanelTab("workspace");
          break;
        case "batch":
          setRightPanelTab("workspace");
          break;
        case "data":
          setRightPanelTab("data");
          break;
        case "collect":
          setRightPanelTab("collect");
          break;
        case "settings":
          setSettingsCenterOpen(true);
          break;
        case "wechat":
          setPlatform("wechat");
          break;
        case "xiaohongshu":
          setPlatform("xiaohongshu");
          break;
        case "knowledge":
          setLeftPanelTab("knowledge");
          break;
        case "templates":
          setLeftPanelTab("templates");
          break;
      }
      onOpenChange(false);
      setQuery("");
    },
    [setRightPanelTab, setLeftPanelTab, setPlatform, setSettingsCenterOpen, onOpenChange],
  );

  const handleOpenChange = useCallback(
    (val: boolean) => {
      onOpenChange(val);
      if (!val) setQuery("");
    },
    [onOpenChange],
  );

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <AnimatePresence>
        {open && (
          <motion.div
            key="command-palette-inner"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" as const }}
            className="contents"
          >
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="搜索内容标题、文案、知识库..."
                value={query}
                onValueChange={setQuery}
              />
              <CommandList className="max-h-[400px]">
                <CommandEmpty>
                  <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                    <Search className="h-8 w-8 opacity-40" />
                    <p className="text-sm">没有找到匹配结果</p>
                  </div>
                </CommandEmpty>

                {/* ── Quick Actions ─────────────────────────────────── */}
                <CommandGroup heading="快速操作">
                  <CommandItem onSelect={() => handleAction("generate")}>
                    <Sparkles
                      className={`h-4 w-4 ${isXHS ? "text-rose-500" : "text-violet-500"}`}
                    />
                    <span>生成新内容</span>
                    <CommandShortcut>
                      <Zap className="h-3 w-3" />
                    </CommandShortcut>
                  </CommandItem>
                  <CommandItem onSelect={() => handleAction("batch")}>
                    <CalendarRange className="h-4 w-4 text-amber-500" />
                    <span>批量生成30天计划</span>
                  </CommandItem>
                  <CommandItem onSelect={() => handleAction("data")}>
                    <BarChart3 className="h-4 w-4 text-emerald-500" />
                    <span>查看运营报告</span>
                    <CommandShortcut>⌘3</CommandShortcut>
                  </CommandItem>
                  <CommandItem onSelect={() => handleAction("collect")}>
                    <Globe className="h-4 w-4 text-sky-500" />
                    <span>打开采集中心</span>
                  </CommandItem>
                  <CommandItem onSelect={() => handleAction("settings")}>
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span>打开设置</span>
                  </CommandItem>
                  <CommandItem
                    onSelect={() =>
                      handleAction(isXHS ? "wechat" : "xiaohongshu")
                    }
                  >
                    <MessageCircle
                      className={`h-4 w-4 ${isXHS ? "text-green-500" : "text-red-500"}`}
                    />
                    <span>
                      切换到{isXHS ? "朋友圈" : "小红书"}
                    </span>
                  </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                {/* ── Content Search ─────────────────────────────────── */}
                {contentResults.length > 0 && (
                  <CommandGroup heading="内容搜索">
                    {contentResults.slice(0, 6).map((post) => (
                      <CommandItem
                        key={post.id}
                        value={`post-${post.id}`}
                        onSelect={() => handleSelectPost(post)}
                        className="flex-col !items-start gap-1"
                      >
                        <div className="flex items-center gap-2 w-full">
                          <PenTool className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="text-sm font-medium truncate flex-1">
                            {post.topic}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge
                              variant="secondary"
                              className="text-[10px] h-5 px-1.5"
                            >
                              {CONTENT_TYPE_LABELS[post.contentType as keyof typeof CONTENT_TYPE_LABELS] ?? post.contentType}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-[10px] h-5 px-1.5"
                            >
                              {POST_STATUS_LABELS[post.status as keyof typeof POST_STATUS_LABELS] ?? post.status}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 pl-6">
                          {post.content.length > 50
                            ? post.content.slice(0, 50) + "…"
                            : post.content}
                        </p>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                <CommandSeparator />

                {/* ── Knowledge Search ───────────────────────────────── */}
                {knowledgeResults.length > 0 && (
                  <CommandGroup heading="知识库搜索">
                    {knowledgeResults.slice(0, 5).map((item) => (
                      <CommandItem
                        key={item.id}
                        value={`knowledge-${item.id}`}
                        onSelect={() => handleSelectKnowledge(item)}
                        className="flex-col !items-start gap-1"
                      >
                        <div className="flex items-center gap-2 w-full">
                          <BookOpen className="h-4 w-4 shrink-0 text-amber-500" />
                          <span className="text-sm font-medium truncate flex-1">
                            {item.title}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5 px-1.5 shrink-0"
                          >
                            {KNOWLEDGE_CATEGORY_LABELS[item.category as keyof typeof KNOWLEDGE_CATEGORY_LABELS] ?? item.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 pl-6">
                          {item.content.length > 50
                            ? item.content.slice(0, 50) + "…"
                            : item.content}
                        </p>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                <CommandSeparator />

                {/* ── Panel Navigation ───────────────────────────────── */}
                <CommandGroup heading="面板导航">
                  <CommandItem onSelect={() => handleAction("knowledge")}>
                    <BookOpen className="h-4 w-4 text-amber-500" />
                    <span>打开知识库</span>
                    <CommandShortcut>⌘1</CommandShortcut>
                  </CommandItem>
                  <CommandItem onSelect={() => handleAction("generate")}>
                    <PenTool className="h-4 w-4 text-violet-500" />
                    <span>打开工作台</span>
                    <CommandShortcut>⌘2</CommandShortcut>
                  </CommandItem>
                  <CommandItem onSelect={() => handleAction("data")}>
                    <BarChart3 className="h-4 w-4 text-emerald-500" />
                    <span>打开数据与报告</span>
                    <CommandShortcut>⌘3</CommandShortcut>
                  </CommandItem>
                  <CommandItem onSelect={() => handleAction("templates")}>
                    <FileText className="h-4 w-4 text-sky-500" />
                    <span>打开模板库</span>
                  </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                {/* ── Keyboard Shortcuts Help ────────────────────────── */}
                <CommandGroup heading="快捷键">
                  {SHORTCUT_LIST.slice(0, 5).map((sc) => (
                    <CommandItem
                      key={sc.label}
                      value={`shortcut-${sc.label}`}
                      onSelect={() => {
                        /* no-op — informational only */
                      }}
                    >
                      <Keyboard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{sc.label}</span>
                      <CommandShortcut>{sc.keys.join("")}</CommandShortcut>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>

              {/* ── Footer ──────────────────────────────────────────── */}
              <div className="border-t px-3 py-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 font-mono text-[10px]">
                      ↑↓
                    </kbd>
                    导航
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 font-mono text-[10px]">
                      ↵
                    </kbd>
                    选择
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 font-mono text-[10px]">
                      esc
                    </kbd>
                    关闭
                  </span>
                </div>
                <span className="hidden sm:inline">{isXHS ? "小红书" : "朋友圈"}AI运营助手</span>
              </div>
            </Command>
          </motion.div>
        )}
      </AnimatePresence>
    </CommandDialog>
  );
}

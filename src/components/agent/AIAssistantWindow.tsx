import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bot,
  Check,
  ChevronDown,
  Copy,
  Eye,
  Lightbulb,
  Maximize2,
  Minimize2,
  RefreshCw,
  Square,
  TriangleAlert,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isTextUIPart } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkCjkFriendly from "remark-cjk-friendly";
import remarkCjkFriendlyGfmStrikethrough from "remark-cjk-friendly-gfm-strikethrough";

import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import {
  Message,
  MessageContent,
  MessageFooter,
} from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { applyDialogScrollLock } from "@/lib/scroll-lock";
import { cn } from "@/lib/utils";
import { ui, type Lang } from "@/i18n/ui";
import {
  collectToolParts,
  extractMessageText,
  extractReasoningText,
  formatQuickPromptLabel,
  getToolDescriptor,
  getToolLabel,
  hasRenderableText,
  isBusyStatus,
  isToolPartRunning,
  selectQuickPrompts,
  type NormalizedToolPart,
  type QuickPrompt,
  type ToolIconName,
} from "./ai-assistant";

interface AIAssistantWindowProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: Lang;
  /**
   * Prompt handed over by the launcher (e.g. the "discuss" button on the key
   * summary). Sent once, then released through `onPendingPromptConsumed`.
   */
  pendingPrompt?: string | null;
  onPendingPromptConsumed?: () => void;
}

const TOOL_ICONS: Record<ToolIconName, LucideIcon> = {
  view: Eye,
  tool: Wrench,
};

/** One persistent row per tool call, so the activity stays readable after the answer lands. */
function ToolMarker({
  lang,
  toolPart,
}: {
  lang: Lang;
  toolPart: NormalizedToolPart;
}) {
  const running = isToolPartRunning(toolPart.state);
  const failed = toolPart.state === "output-error";
  const ToolIcon = TOOL_ICONS[getToolDescriptor(toolPart.toolName).iconName];
  const label = getToolLabel(lang, toolPart.toolName, toolPart.input);

  return (
    <Marker
      role={running ? "status" : undefined}
      className={cn(failed && "text-destructive")}
    >
      <MarkerIcon>{running ? <Spinner /> : <ToolIcon />}</MarkerIcon>
      <MarkerContent className={cn(running && "shimmer")}>
        {failed
          ? `${label} · ${ui[lang]["agent.assistant.toolFailed"]}`
          : label}
      </MarkerContent>
    </Marker>
  );
}

function ReasoningDisclosure({ label, text }: { label: string; text: string }) {
  return (
    <Collapsible>
      <CollapsibleTrigger
        className="group/reasoning text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-2 text-sm transition-colors"
        render={<button type="button" />}
      >
        <Lightbulb className="size-4" />
        {label}
        <ChevronDown className="size-3.5 transition-transform duration-150 group-data-panel-open/reasoning:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="text-muted-foreground h-(--collapsible-panel-height) overflow-hidden text-xs whitespace-pre-wrap transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0">
        <div className="border-border mt-2 border-s ps-3">{text}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function QuickPromptList({
  quickPrompts,
  ariaLabelTemplate,
  onSelect,
  className,
}: {
  quickPrompts: QuickPrompt[];
  ariaLabelTemplate: string;
  onSelect: (prompt: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      {quickPrompts.map((quickPrompt) => (
        <button
          key={quickPrompt.text}
          type="button"
          onClick={() => onSelect(quickPrompt.prompt)}
          aria-label={formatQuickPromptLabel(
            ariaLabelTemplate,
            quickPrompt.text,
          )}
          className="group text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-0.5 rounded p-1 text-left text-sm transition-all hover:font-medium hover:tracking-wide"
        >
          {quickPrompt.text}
          <ArrowRight className="size-4 opacity-50 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
        </button>
      ))}
    </div>
  );
}

export default function AIAssistantWindow({
  isOpen,
  onClose,
  lang = "zh",
  pendingPrompt = null,
  onPendingPromptConsumed,
}: AIAssistantWindowProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const copyResetRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const prefersReducedMotion = Boolean(useReducedMotion());

  // 以 bottom 控制與底部距離，避免覆蓋 footer（全螢幕時不需要）
  // 使用一般 state 而非 motion value，避免與 layout 投影衝突
  const [bottomOffset, setBottomOffset] = useState(16);

  const layoutTransition = useMemo<Transition>(
    () =>
      prefersReducedMotion
        ? { duration: 0 }
        : { duration: 0.32, ease: [0.32, 0.72, 0, 1] },
    [prefersReducedMotion],
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        // 每次送出時重新讀取路徑，View Transitions 換頁後才不會沿用舊頁面
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            messages,
            filename:
              typeof window === "undefined" ? "/" : window.location.pathname,
            lang,
          },
        }),
      }),
    [lang],
  );

  const { messages, status, sendMessage, stop, regenerate, error, clearError } =
    useChat({ transport });

  const busy = isBusyStatus(status);

  useEffect(() => {
    // 全螢幕時仍保留 bottomOffset，收合 layout 才不會從 0 跳回
    if (!isOpen || expanded) return;

    function syncWindowOffset() {
      const footer = document.getElementById("footer");
      if (!footer) {
        setBottomOffset(16);
        return;
      }
      const rect = footer.getBoundingClientRect();
      const top = rect.y - window.innerHeight;
      const isBottom = top < 0;

      setBottomOffset(isBottom ? 16 - top : 16);
    }

    syncWindowOffset();
    window.addEventListener("scroll", syncWindowOffset, { passive: true });
    window.addEventListener("resize", syncWindowOffset);

    const footer = document.getElementById("footer");
    const observer =
      footer && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(syncWindowOffset)
        : null;
    observer?.observe(footer!);

    return () => {
      window.removeEventListener("scroll", syncWindowOffset);
      window.removeEventListener("resize", syncWindowOffset);
      observer?.disconnect();
    };
  }, [isOpen, expanded]);

  // 全螢幕時鎖住頁面滾動，關閉後還原
  useEffect(() => {
    if (!isOpen || !expanded) return;
    return applyDialogScrollLock(document);
  }, [isOpen, expanded]);

  // 關閉視窗時回到浮動模式
  useEffect(() => {
    if (!isOpen) setExpanded(false);
  }, [isOpen]);

  // Esc 先離開全螢幕，再關閉視窗
  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (expanded) {
        setExpanded(false);
        return;
      }
      onClose();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, expanded, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    // View Transitions 之後直接 focus 會失效，必須延後一個 tick
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(focusTimer);
  }, [isOpen]);

  useEffect(() => () => clearTimeout(copyResetRef.current), []);

  // 使用者只會看到本地化的錯誤訊息，實際原因保留在 console 供除錯
  useEffect(() => {
    if (error) console.error("AI assistant chat request failed", error);
  }, [error]);

  const sentTexts = useMemo(
    () =>
      messages
        .filter((message) => message.role === "user")
        .map((message) => extractMessageText(message.parts)),
    [messages],
  );
  const quickPrompts = useMemo(
    () => selectQuickPrompts(lang, sentTexts),
    [lang, sentTexts],
  );

  const submitPrompt = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      if (status === "error") clearError();
      sendMessage({ text: trimmed });
    },
    [busy, clearError, sendMessage, status],
  );

  const handleSubmit = (event?: React.SubmitEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!input.trim()) return;
    submitPrompt(input);
    setInput("");
  };

  // 由外部（例如「重點摘要」的討論按鈕）帶進來的提示，開窗後自動送出一次
  useEffect(() => {
    if (!isOpen || !pendingPrompt) return;
    submitPrompt(pendingPrompt);
    onPendingPromptConsumed?.();
  }, [isOpen, pendingPrompt, submitPrompt, onPendingPromptConsumed]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 中文輸入法組字中的 Enter 不能當成送出
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const handleRetry = useCallback(() => {
    if (status === "error") clearError();
    void regenerate();
  }, [clearError, regenerate, status]);

  const handleCopy = useCallback(async (messageId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      clearTimeout(copyResetRef.current);
      copyResetRef.current = setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (copyError) {
      // 剪貼簿權限可能被拒絕，僅記錄不中斷對話
      console.error("Failed to copy assistant message", copyError);
    }
  }, []);

  const lastMessage = messages[messages.length - 1];
  const lastAssistantMessage =
    lastMessage?.role === "assistant" ? lastMessage : undefined;
  const hasRunningTool = lastAssistantMessage
    ? collectToolParts(lastAssistantMessage.parts).some((toolPart) =>
        isToolPartRunning(toolPart.state),
      )
    : false;
  // 只有在還沒有任何工具或文字可看時才顯示「思考中」，避免與工具列重複
  const showThinking =
    busy && !hasRunningTool && !hasRenderableText(lastAssistantMessage?.parts);
  const canRetry = !busy && lastAssistantMessage !== undefined;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={windowRef}
          layout={!prefersReducedMotion}
          layoutId={prefersReducedMotion ? undefined : "ai-assistant-window"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: 0.15 },
            layout: layoutTransition,
          }}
          style={{ bottom: expanded ? 0 : bottomOffset }}
          className={cn(
            "pointer-events-auto absolute flex flex-col overflow-hidden",
            expanded
              ? "bg-card inset-0 rounded-none border border-transparent"
              : "bg-card/75 right-4 w-100 max-w-[calc(100vw-32px)] origin-bottom-right rounded-xl border border-black/10 shadow-[0_2px_8px_rgba(0,0,0,.06)] backdrop-blur-xl dark:border-white/15 dark:shadow-[0_2px_8px_rgba(0,0,0,.25)]",
          )}
          role="dialog"
          aria-modal={expanded}
          aria-label={ui[lang]["agent.assistant.title"]}
        >
          {/* 標題欄 */}
          <motion.div
            layout={!prefersReducedMotion}
            transition={{ layout: layoutTransition }}
            className="bg-muted text-foreground shrink-0 border-b border-black/10 dark:border-white/15"
          >
            <motion.div
              layout={!prefersReducedMotion}
              transition={{ layout: layoutTransition }}
              className={cn(
                "flex items-center justify-between gap-2 p-2 pl-4",
                expanded && "mx-auto w-full max-w-3xl",
              )}
            >
              <motion.div
                layout={prefersReducedMotion ? false : "position"}
                transition={{ layout: layoutTransition }}
                className="flex items-center gap-2"
              >
                <Bot className="size-5" />
                {/* 站台 body 是 20px/1.7，標題必須自訂尺寸才不會被面板放大 */}
                <h3 className="text-base font-semibold">
                  {ui[lang]["agent.assistant.title"]}
                </h3>
              </motion.div>
              <motion.div
                layout={prefersReducedMotion ? false : "position"}
                transition={{ layout: layoutTransition }}
                className="flex items-center gap-1"
              >
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-foreground relative cursor-pointer rounded-lg"
                  onClick={() => setExpanded((value) => !value)}
                  aria-label={
                    expanded
                      ? ui[lang]["agent.assistant.collapse"]
                      : ui[lang]["agent.assistant.expand"]
                  }
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={expanded ? "minimize" : "maximize"}
                      initial={
                        prefersReducedMotion
                          ? { opacity: 0 }
                          : { opacity: 0, scale: 0.6, filter: "blur(2px)" }
                      }
                      animate={
                        prefersReducedMotion
                          ? { opacity: 1 }
                          : { opacity: 1, scale: 1, filter: "blur(0px)" }
                      }
                      exit={
                        prefersReducedMotion
                          ? { opacity: 0 }
                          : { opacity: 0, scale: 0.6, filter: "blur(2px)" }
                      }
                      transition={{ duration: 0.15 }}
                      className="flex"
                    >
                      {expanded ? <Minimize2 /> : <Maximize2 />}
                    </motion.span>
                  </AnimatePresence>
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-foreground cursor-pointer rounded-lg"
                  onClick={onClose}
                  aria-label={ui[lang]["agent.assistant.close"]}
                >
                  <X />
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* 對話內容 */}
          <MessageScrollerProvider
            autoScroll
            defaultScrollPosition="last-anchor"
            scrollPreviousItemPeek={48}
          >
            <motion.div
              layout={!prefersReducedMotion}
              transition={{ layout: layoutTransition }}
              className={cn(
                "flex min-h-0 flex-col",
                expanded ? "flex-1" : "h-100",
              )}
            >
              <MessageScroller className="bg-card/50 h-full min-h-0 flex-1">
                <MessageScrollerViewport
                  aria-label={ui[lang]["agent.assistant.transcript"]}
                >
                  <MessageScrollerContent
                    aria-busy={busy}
                    className={cn(
                      "gap-4 p-4",
                      expanded && "mx-auto w-full max-w-3xl gap-6 py-6",
                    )}
                  >
                    <MessageScrollerItem messageId="disclaimer">
                      <Marker variant="separator">
                        <MarkerContent className="text-xs">
                          {ui[lang]["agent.assistant.disclaimer"]}
                        </MarkerContent>
                      </Marker>
                    </MessageScrollerItem>

                    {messages.length === 0 ? (
                      <MessageScrollerItem
                        messageId="empty-state"
                        className="flex shrink flex-col"
                      >
                        <Empty className="border-0 p-2">
                          <EmptyHeader>
                            <EmptyMedia variant="icon">
                              <Bot />
                            </EmptyMedia>
                            <EmptyTitle className="text-base">
                              {ui[lang]["agent.assistant.title"]}
                            </EmptyTitle>
                            <EmptyDescription>
                              {ui[lang]["agent.assistant.greeting"]}
                            </EmptyDescription>
                          </EmptyHeader>
                          <EmptyContent>
                            <QuickPromptList
                              quickPrompts={quickPrompts}
                              ariaLabelTemplate={
                                ui[lang]["agent.assistant.quickPrompt"]
                              }
                              onSelect={submitPrompt}
                              className="w-full items-start"
                            />
                          </EmptyContent>
                        </Empty>
                      </MessageScrollerItem>
                    ) : (
                      messages.map((message) => {
                        const isUser = message.role === "user";
                        const messageText = extractMessageText(message.parts);
                        const reasoningText = extractReasoningText(
                          message.parts,
                        );
                        const toolParts = collectToolParts(message.parts);
                        const showFooter =
                          !isUser && messageText !== "" && !busy;

                        return (
                          <MessageScrollerItem
                            key={message.id}
                            messageId={message.id}
                            scrollAnchor={isUser}
                          >
                            <Message align={isUser ? "end" : "start"}>
                              <MessageContent>
                                {toolParts.map((toolPart, index) => (
                                  <ToolMarker
                                    key={
                                      toolPart.toolCallId ??
                                      `${toolPart.toolName}-${index}`
                                    }
                                    lang={lang}
                                    toolPart={toolPart}
                                  />
                                ))}

                                {reasoningText !== "" && (
                                  <ReasoningDisclosure
                                    label={
                                      ui[lang]["agent.assistant.reasoning"]
                                    }
                                    text={reasoningText}
                                  />
                                )}

                                {hasRenderableText(message.parts) && (
                                  <Bubble
                                    variant={isUser ? "default" : "muted"}
                                    align={isUser ? "end" : "start"}
                                    aria-label={
                                      isUser
                                        ? ui[lang][
                                            "agent.assistant.userMessage"
                                          ]
                                        : ui[lang][
                                            "agent.assistant.assistantMessage"
                                          ]
                                    }
                                  >
                                    <BubbleContent
                                      className={cn(
                                        "prose prose-sm prose-neutral max-w-none rounded-2xl",
                                        // 在窄面板中收緊 typography 間距與標題尺寸
                                        "prose-headings:mt-3 prose-headings:mb-1.5 prose-headings:text-[0.95em] prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-pre:my-2 [&>:first-child]:mt-0 [&>:last-child]:mb-0",
                                        isUser
                                          ? "prose-invert"
                                          : "dark:prose-invert",
                                      )}
                                    >
                                      {message.parts.map((part, index) =>
                                        isTextUIPart(part) &&
                                        part.text !== "" ? (
                                          <ReactMarkdown
                                            key={index}
                                            remarkPlugins={[
                                              remarkGfm,
                                              remarkCjkFriendly,
                                              remarkCjkFriendlyGfmStrikethrough,
                                            ]}
                                          >
                                            {part.text}
                                          </ReactMarkdown>
                                        ) : null,
                                      )}
                                    </BubbleContent>
                                  </Bubble>
                                )}

                                {showFooter && (
                                  <MessageFooter className="gap-0.5 px-0">
                                    <Button
                                      variant="ghost"
                                      size="icon-xs"
                                      className="text-muted-foreground hover:text-foreground cursor-pointer rounded-md"
                                      onClick={() =>
                                        void handleCopy(message.id, messageText)
                                      }
                                      aria-label={
                                        copiedMessageId === message.id
                                          ? ui[lang]["agent.assistant.copied"]
                                          : ui[lang]["agent.assistant.copy"]
                                      }
                                    >
                                      {copiedMessageId === message.id ? (
                                        <Check />
                                      ) : (
                                        <Copy />
                                      )}
                                    </Button>
                                    {canRetry &&
                                      message.id ===
                                        lastAssistantMessage?.id && (
                                        <Button
                                          variant="ghost"
                                          size="icon-xs"
                                          className="text-muted-foreground hover:text-foreground cursor-pointer rounded-md"
                                          onClick={handleRetry}
                                          aria-label={
                                            ui[lang]["agent.assistant.retry"]
                                          }
                                        >
                                          <RefreshCw />
                                        </Button>
                                      )}
                                  </MessageFooter>
                                )}
                              </MessageContent>
                            </Message>
                          </MessageScrollerItem>
                        );
                      })
                    )}

                    {showThinking && (
                      <MessageScrollerItem messageId="thinking">
                        <Marker role="status">
                          <MarkerIcon>
                            <Spinner />
                          </MarkerIcon>
                          <MarkerContent className="shimmer">
                            {ui[lang]["agent.assistant.thinking"]}
                          </MarkerContent>
                        </Marker>
                      </MessageScrollerItem>
                    )}

                    {status === "error" && (
                      <MessageScrollerItem messageId="error">
                        <Marker role="status" className="text-destructive">
                          <MarkerIcon>
                            <TriangleAlert />
                          </MarkerIcon>
                          <MarkerContent>
                            {ui[lang]["agent.assistant.error"]}
                          </MarkerContent>
                        </Marker>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 cursor-pointer rounded-lg"
                          onClick={handleRetry}
                        >
                          <RefreshCw data-icon="inline-start" />
                          {ui[lang]["agent.assistant.retry"]}
                        </Button>
                      </MessageScrollerItem>
                    )}

                    {messages.length > 0 &&
                      status === "ready" &&
                      quickPrompts.length > 0 && (
                        <MessageScrollerItem messageId="quick-prompts">
                          <QuickPromptList
                            quickPrompts={quickPrompts}
                            ariaLabelTemplate={
                              ui[lang]["agent.assistant.quickPrompt"]
                            }
                            onSelect={submitPrompt}
                          />
                        </MessageScrollerItem>
                      )}
                  </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton className="rounded-full">
                  <ArrowDown />
                  <span className="sr-only">
                    {ui[lang]["agent.assistant.scrollToLatest"]}
                  </span>
                </MessageScrollerButton>
              </MessageScroller>
            </motion.div>
          </MessageScrollerProvider>

          {/* 輸入區域 */}
          <motion.form
            layout={!prefersReducedMotion}
            transition={{ layout: layoutTransition }}
            aria-label={ui[lang]["agent.assistant.chatForm"]}
            onSubmit={handleSubmit}
            className={cn(
              "shrink-0 p-2",
              expanded && "mx-auto w-full max-w-3xl pb-4",
            )}
          >
            {/* 內距放在容器上，送出鍵才能和 textarea 共用同一條基線 */}
            <div className="bg-muted/50 focus-within:bg-muted flex items-end gap-2 rounded-lg border border-black/10 p-1 transition-all focus-within:border-black/30 dark:border-white/15 dark:focus-within:border-white/40">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={ui[lang]["agent.assistant.placeholder"]}
                aria-describedby="chat-bot-instructions"
                rows={1}
                className="text-foreground max-h-40 min-h-9 flex-1 rounded-md border-0 bg-transparent px-3 py-2 text-sm focus-visible:ring-0 md:text-sm"
              />
              {busy ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-lg"
                  className="cursor-pointer rounded-lg"
                  onClick={() => stop()}
                  aria-label={ui[lang]["agent.assistant.stop"]}
                >
                  <Square className="size-3.5 fill-current" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon-lg"
                  className="cursor-pointer rounded-lg"
                  disabled={input.trim() === ""}
                  aria-label={ui[lang]["agent.assistant.send"]}
                >
                  <ArrowUp />
                </Button>
              )}
            </div>
            <div id="chat-bot-instructions" className="sr-only">
              {ui[lang]["agent.assistant.instructions"]}
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

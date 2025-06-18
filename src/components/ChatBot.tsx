"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, Send, X, ArrowRight, Loader } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { getLangFromUrl, useTranslations } from "../i18n/utils";
import { defaultLang } from "../i18n/ui";
import Markdown from "react-markdown";
import LoadingDots from "./LoadingDots";

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);

  // Detect language from URL path
  const lang: keyof typeof import("../i18n/ui").ui =
    typeof window !== "undefined"
      ? (getLangFromUrl(new URL(window.location.href)) as any)
      : (defaultLang as any);
  const t = useTranslations(lang);

  // Preserve scroll position and always scroll to the latest message.
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    status,
    append,
  } = useChat({
    api: "/api/chat",
    body: {
      filename: typeof window !== "undefined" ? window.location.pathname : "/",
    },
  });

  // Quick prompts definitions
  const quickPrompts = (
    lang === "zh"
      ? [
          {
            text: t("chat.quick.summarize"),
            prompt: "摘要此頁面的重點",
          },
          {
            text: t("chat.quick.background"),
            prompt: "提供此內容的背景資訊",
          },
          {
            text: t("chat.quick.perspective"),
            prompt: "說明此內容的主要觀點?",
          },
          {
            text: t("chat.quick.detail"),
            prompt: "詳細解釋此內容?",
          },
          {
            text: t("chat.quick.qna"),
            prompt: "為此內容生成問答",
          },
        ]
      : [
          {
            text: t("chat.quick.summarize"),
            prompt: "Summarize key points of this page",
          },
          {
            text: t("chat.quick.background"),
            prompt: "Provide background info of this content",
          },
          {
            text: t("chat.quick.perspective"),
            prompt: "Main perspective of this content?",
          },
          {
            text: t("chat.quick.detail"),
            prompt: "Detailed explanation of this content?",
          },
          {
            text: t("chat.quick.qna"),
            prompt: "Generate Q&A of this content",
          },
        ]
  ) as { text: string; prompt: string }[];

  const sendQuickPrompt = (promptStr: string) => {
    append({ role: "user", content: promptStr });
  };

  useEffect(() => {
    // scroll to bottom when new message arrives
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  return (
    <motion.div layoutScroll>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            className="fixed right-4 bottom-4 block w-max cursor-pointer rounded-full bg-gray-100/90 p-3 px-4 text-base shadow-sm backdrop-blur-sm hover:bg-gray-200 active:bg-gray-300 md:m-auto md:p-2 md:px-4 md:text-sm dark:bg-gray-800/80 dark:text-gray-100 dark:hover:bg-gray-700 dark:active:bg-gray-600"
            aria-label={t("chat.ariaLabel")}
            onClick={() => setIsOpen(true)}
            layoutId="chat-bot"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              className="flex items-center gap-2"
              layoutId="chat-bot-title"
            >
              <Bot size={20} /> {t("chat.button.discuss")}
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            layoutId="chat-bot"
            className="fixed right-2 bottom-2 w-90 max-w-[90vw] overflow-hidden rounded-xl bg-white shadow-lg dark:bg-gray-900"
          >
            <div className="rounded-xl border border-gray-200 bg-gray-50 text-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
              <div className="flex justify-between gap-1 p-2 pl-4">
                <motion.div
                  layoutId="chat-bot-title"
                  className="flex items-center gap-2"
                >
                  <Bot size={20} /> {t("chat.title")}
                </motion.div>

                <motion.button
                  className="cursor-pointer rounded-md border border-black/5 bg-gray-200 p-1 text-sm hover:bg-gray-300 active:bg-gray-300 dark:border-white/5 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:active:bg-gray-700"
                  onClick={() => setIsOpen(false)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X size={20} />
                </motion.button>
              </div>
              {/* Message list */}
              <div className="flex h-120 max-h-[60vh] flex-col space-y-3 overflow-y-auto border-t border-gray-200 bg-white p-4 text-sm dark:border-gray-800 dark:bg-gray-950">
                {[
                  {
                    id: "system",
                    role: "assistant",
                    content: t("chat.system.message"),
                  },
                  ...messages,
                ].map((m) => (
                  <motion.div
                    key={m.id}
                    className={`flex gap-2 ${
                      m.role === "user" ? "justify-end" : "justify-start"
                    }`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {m.role === "assistant" && (
                      <Bot size={16} className="mt-1" />
                    )}
                    <div
                      className={[
                        "prose prose-sm prose-neutral prose-tight max-w-[80%] rounded-lg px-3 py-1 break-words whitespace-pre-wrap",
                        m.role === "user"
                          ? "prose-invert bg-blue-500 text-white"
                          : "dark:prose-invert bg-gray-100 dark:bg-gray-800",
                      ].join(" ")}
                    >
                      {m.content === "" ? (
                        <p className="flex items-center">
                          <span className="text-sm text-gray-500">
                            {t("chat.loading")}
                          </span>
                          <LoadingDots />
                        </p>
                      ) : (
                        <Markdown>{m.content}</Markdown>
                      )}
                    </div>
                  </motion.div>
                ))}
                {/* Quick prompt buttons */}
                <AnimatePresence>
                  {status === "ready" && (
                    <motion.div
                      className="ml-2 flex flex-col dark:border-gray-800"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {quickPrompts
                        // filter is in messages
                        .filter(
                          (qp) =>
                            !messages.some((m) => m.content === qp.prompt),
                        )
                        .map((qp) => (
                          <button
                            key={qp.text}
                            onClick={() => sendQuickPrompt(qp.prompt)}
                            className="group flex cursor-pointer items-center gap-0.5 rounded px-4 py-1 text-left text-sm text-gray-500 transition-all hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
                          >
                            {qp.text}
                            <ArrowRight
                              size={16}
                              className="opacity-50 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                            />
                          </button>
                        ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                <div ref={messagesEndRef} className="flex-1" />
              </div>

              {/* Input area */}
              <form
                onSubmit={(e) => {
                  handleSubmit(e);
                  setInput("");
                }}
                className="dark:border-gray-800"
              >
                <div className="flex items-center gap-2 rounded-b-lg border-t border-gray-200 dark:border-gray-800">
                  <textarea
                    className="h-10 w-full resize-none bg-transparent p-2 px-4 text-gray-900 placeholder-gray-400 outline-none dark:text-gray-100 dark:placeholder-gray-500"
                    placeholder={t("chat.input.placeholder")}
                    value={input}
                    onChange={handleInputChange}
                    // Ignore Enter while the user is still composing (IME)
                    onKeyDown={(e) => {
                      const isComposing = (e.nativeEvent as any).isComposing;
                      if (e.key === "Enter" && !e.shiftKey && !isComposing) {
                        e.preventDefault();
                        handleSubmit();
                        // Clear the textarea AFTER submission when not composing
                        setInput("");
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={status === "streaming" || input.trim() === ""}
                    className="flex h-10 w-14 cursor-pointer items-center justify-center rounded-br-lg bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:disabled:bg-gray-800"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

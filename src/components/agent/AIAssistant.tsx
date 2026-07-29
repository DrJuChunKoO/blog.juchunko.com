import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Bot } from "lucide-react";

import { getLangFromUrl } from "@/i18n/utils";
import { defaultLang, ui, type Lang } from "@/i18n/ui";
import AIAssistantWindow from "./AIAssistantWindow";

/**
 * Floating launcher for the AI assistant.
 *
 * Owns only the open/closed state and the `open-chatbot` CustomEvent contract
 * (dispatched by `KeySummary`); everything about the conversation itself lives in
 * `AIAssistantWindow`, which also owns the Escape key while it is open.
 */
export default function AIAssistant({ lang: langProp }: { lang?: Lang } = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>(langProp ?? defaultLang);

  const prefersReducedMotion = Boolean(useReducedMotion());

  // `client:only` means there is no SSR pass, but the URL is still read in an
  // effect so View Transitions navigations keep the locale in sync.
  useEffect(() => {
    if (langProp) return;
    setLang(getLangFromUrl(new URL(window.location.href)));
  }, [langProp]);

  useEffect(() => {
    function handleOpenAssistant(event: Event) {
      const { detail } = event as CustomEvent<{ prompt?: string }>;
      setIsOpen(true);
      if (detail?.prompt) setPendingPrompt(detail.prompt);
    }

    window.addEventListener("open-chatbot", handleOpenAssistant);
    return () =>
      window.removeEventListener("open-chatbot", handleOpenAssistant);
  }, []);

  const handleClose = useCallback(() => setIsOpen(false), []);
  const handlePendingPromptConsumed = useCallback(
    () => setPendingPrompt(null),
    [],
  );

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label={ui[lang]["agent.assistant.openAriaLabel"]}
            initial={
              prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }
            }
            animate={
              prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }
            }
            exit={
              prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }
            }
            transition={{ duration: 0.15 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
            className="fixed right-4 bottom-4 z-40 flex cursor-pointer items-center gap-2 rounded-full border border-black/10 bg-white/95 px-4 py-3 text-base font-medium shadow-[0_2px_8px_rgba(0,0,0,.06)] backdrop-blur-md transition hover:border-black/20 hover:bg-gray-100 md:py-2 md:text-sm dark:border-white/15 dark:bg-zinc-950/95 dark:shadow-[0_2px_8px_rgba(0,0,0,.25)] dark:hover:border-white/25 dark:hover:bg-white/10"
          >
            <Bot className="size-5" />
            {ui[lang]["agent.assistant.open"]}
          </motion.button>
        )}
      </AnimatePresence>

      <AIAssistantWindow
        isOpen={isOpen}
        onClose={handleClose}
        lang={lang}
        pendingPrompt={pendingPrompt}
        onPendingPromptConsumed={handlePendingPromptConsumed}
      />
    </>
  );
}

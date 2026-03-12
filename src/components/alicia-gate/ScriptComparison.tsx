import { useState } from "react";
import { motion } from "motion/react";

interface ScriptLine {
  stage: string;
  stageCn: string;
  taiwan: string;
  iran: string;
  purpose: string;
}

const SCRIPT_LINES: ScriptLine[] = [
  {
    stage: "Initial Bait",
    stageCn: "初始誘餌",
    taiwan: "Hello? Hello?",
    iran: "Hello? Hello?",
    purpose: "模擬人類接起電話的反應，促使對方開口說話",
  },
  {
    stage: "Identity Probe",
    stageCn: "身分探測",
    taiwan: "Who is calling?",
    iran: "Who is calling?",
    purpose: "誘導對方說出名字或隸屬組織",
  },
  {
    stage: "Feigned Impairment",
    stageCn: "偽裝聽障",
    taiwan: "I can't heard you. Could you repeat?",
    iran: "I can't hear you. I can't hear you. Could you repeat?",
    purpose: "刻意的文法錯誤激發同理心，拖延時間",
  },
  {
    stage: "Disorientation",
    stageCn: "邏輯擾亂",
    taiwan:
      "I'm not sure if you are calling the right number. Who you want to speak with?",
    iran: "I'm not sure if you are calling the right number. Who you want to speak with?",
    purpose: "讓對方陷入解釋，提供更多資訊",
  },
  {
    stage: "False Familiarity",
    stageCn: "虛假熟悉感",
    taiwan: "I'm Alicia. Do you remember me?",
    iran: "I'm Alicia. Do you remember me?",
    purpose: "製造認知失調，阻止掛斷動作",
  },
  {
    stage: "Termination",
    stageCn: "強制終止",
    taiwan: "I think I don't know who are you.",
    iran: "I think I don't know who are you.",
    purpose: "腳本播完，掛斷。計費達成。",
  },
];

export default function ScriptComparison() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div className="not-prose my-8 overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-red-600 px-5 py-4">
        <h4 className="text-base font-bold text-white">
          🔬 腳本逐行比對 / Script Comparison
        </h4>
        <p className="mt-1 text-sm text-white/70">
          台灣 Twilio 通話紀錄 vs 伊朗 AP 錄音 — 六個階段，逐字吻合
        </p>
      </div>

      {/* Comparison grid */}
      <div className="divide-y divide-gray-100 dark:divide-white/5">
        {SCRIPT_LINES.map((line, i) => {
          const isActive = activeIndex === i;
          const isMatch = line.taiwan === line.iran;

          return (
            <motion.div
              key={i}
              onClick={() => setActiveIndex(isActive ? null : i)}
              className={`cursor-pointer transition-colors ${
                isActive
                  ? "bg-amber-50 dark:bg-amber-500/5"
                  : "hover:bg-gray-50 dark:hover:bg-white/[0.02]"
              }`}
            >
              {/* Stage header */}
              <div className="flex items-center gap-3 px-5 pt-4 pb-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white dark:bg-white dark:text-gray-900">
                  {i + 1}
                </span>
                <div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {line.stageCn}
                  </span>
                  <span className="ml-2 text-xs text-gray-400">
                    {line.stage}
                  </span>
                </div>
                {isMatch && (
                  <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-500/10 dark:text-green-400">
                    100% MATCH
                  </span>
                )}
              </div>

              {/* Two columns */}
              <div className="grid grid-cols-1 gap-2 px-5 pb-3 md:grid-cols-2 md:gap-4">
                <div className="rounded-lg bg-blue-50 px-3 py-2 dark:bg-blue-500/5">
                  <div className="mb-1 text-[10px] font-semibold tracking-wider text-blue-500 uppercase">
                    🇹🇼 台灣 — Twilio Log
                  </div>
                  <p className="font-mono text-sm leading-relaxed text-gray-800 italic dark:text-gray-200">
                    "{line.taiwan}"
                  </p>
                </div>
                <div className="rounded-lg bg-red-50 px-3 py-2 dark:bg-red-500/5">
                  <div className="mb-1 text-[10px] font-semibold tracking-wider text-red-500 uppercase">
                    🇮🇷 伊朗 — AP Recording
                  </div>
                  <p className="font-mono text-sm leading-relaxed text-gray-800 italic dark:text-gray-200">
                    "{line.iran}"
                  </p>
                </div>
              </div>

              {/* Purpose (shown on click) */}
              {isActive && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mx-5 mb-3 rounded-lg bg-amber-100/50 px-3 py-2 dark:bg-amber-500/5"
                >
                  <span className="text-[10px] font-semibold text-amber-600 uppercase dark:text-amber-400">
                    設計目的
                  </span>
                  <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">
                    {line.purpose}
                  </p>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-5 py-3 dark:bg-white/[0.02]">
        <p className="text-center text-xs text-gray-400">
          點擊任一階段查看設計目的 · Click any stage to see its purpose
        </p>
      </div>
    </div>
  );
}

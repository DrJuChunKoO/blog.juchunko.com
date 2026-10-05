import { useEffect, useState, type ReactNode } from "react";
import evidence from "../../data/taiwan-outlook/evidence.json";
import approvalAudit from "../../data/taiwan-outlook/approval-audit-2025.json";
import pipeline from "../../data/taiwan-outlook/pipeline.json";
import {
  benchmarkGuide,
  dramBenchmarks,
  eraOverlay,
  capabilityShare,
  countdownParts,
  reviewDeadline,
  yearsToThreshold,
} from "./model";
import "./outlook.css";

const ASOF = "2026-10-04";
const n = (x: number, digits = 2) =>
  x.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
const source = (id: string) =>
  evidence.sources.find((s) => s[0] === id)?.[3] || "#research-sources";
type Point = {
  x: number;
  a: number | null;
  b: number | null;
  breakBefore?: boolean;
  partialA?: boolean;
  partialB?: boolean;
  period?: string;
};
function Panel({
  tag,
  title,
  children,
  id,
}: {
  tag: string;
  title: string;
  children: ReactNode;
  id: string;
}) {
  const headingId = `${id}-heading`;
  return (
    <section
      className="to-widget not-prose"
      id={id}
      aria-labelledby={headingId}
    >
      <span className="to-kicker">{tag}</span>
      <h3 id={headingId}>{title}</h3>
      {children}
    </section>
  );
}
function Choices({
  label,
  choices,
  value,
  onChange,
}: {
  label: string;
  choices: string[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="to-controls" role="group" aria-label={label}>
      {choices.map((s, i) => (
        <button
          key={s}
          type="button"
          aria-pressed={i === value}
          onClick={() => onChange(i)}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
function downloadCsv(name: string, rows: (string | number | null)[][]) {
  const blob = new Blob(
    [
      "\uFEFF" +
        rows
          .map((r) =>
            r
              .map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`)
              .join(","),
          )
          .join("\r\n"),
    ],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function LineChart({
  data,
  labels,
  unit,
  selected,
  onSelect,
  xLabel,
  fixedRange,
  breakAt,
  threshold,
  emptyAfter,
  plotInset = 52,
  preciseTicks = false,
}: {
  data: Point[];
  labels: [string, string];
  unit: string;
  selected: number;
  onSelect: (v: number) => void;
  xLabel?: (x: number) => string;
  fixedRange?: [number, number];
  breakAt?: number;
  threshold?: number;
  emptyAfter?: number;
  plotInset?: number;
  preciseTicks?: boolean;
}) {
  const W = 720,
    H = 310,
    L = plotInset,
    R = 20,
    T = 30,
    B = 37;
  const values = data
    .flatMap((p) => [p.a, p.b])
    .filter((v): v is number => v !== null);
  const min = fixedRange?.[0] ?? Math.min(0, ...values);
  const rawMax = Math.max(...values, 1);
  const max =
    fixedRange?.[1] ??
    Math.ceil(rawMax / (rawMax > 100 ? 100 : rawMax > 10 ? 10 : 1)) *
      (rawMax > 100 ? 100 : rawMax > 10 ? 10 : 1);
  const xx = (i: number) =>
    L + (i * (W - L - R)) / Math.max(1, data.length - 1);
  const yy = (v: number) =>
    H - B - ((v - min) / (max - min || 1)) * (H - T - B);
  const partialKey = (key: "a" | "b") =>
    key === "a" ? "partialA" : "partialB";
  const partialPoints = data
    .map((p, i) => ({ ...p, i }))
    .filter((p) => p.partialA || p.partialB);
  function partialPath(key: "a" | "b") {
    return data
      .map((p, i) => {
        const previous = data[i - 1];
        return p[partialKey(key)] &&
          p[key] !== null &&
          previous?.[key] != null &&
          !p.breakBefore
          ? `M${xx(i - 1)},${yy(previous[key]!)} L${xx(i)},${yy(p[key]!)}`
          : "";
      })
      .join(" ");
  }
  function path(key: "a" | "b") {
    let open = false;
    return data
      .map((p, i) => {
        const v = p[key];
        if (v === null || p[partialKey(key)]) {
          open = false;
          return "";
        }
        const cmd = !open || p.breakBefore ? "M" : "L";
        open = true;
        return `${cmd}${xx(i).toFixed(2)},${yy(v).toFixed(2)}`;
      })
      .join(" ");
  }
  const labelsAt = [
    ...new Set([
      0,
      Math.round((data.length - 1) / 3),
      Math.round(((data.length - 1) * 2) / 3),
      data.length - 1,
    ]),
  ];
  const pt = data[Math.min(selected, data.length - 1)];
  return (
    <>
      <div className="to-legend">
        <span>
          <i className="to-swatch" />
          {labels[0]}
        </span>
        <span>
          <i className="to-swatch secondary" />
          {labels[1]}
        </span>
      </div>
      <svg
        className="to-chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${labels.join("與")}；縱軸${unit}。可使用下方滑桿或資料表讀取每年數值。`}
        onPointerMove={(e) => {
          if (e.pointerType === "mouse") {
            const rect = e.currentTarget.getBoundingClientRect();
            onSelect(
              Math.max(
                0,
                Math.min(
                  data.length - 1,
                  Math.round(
                    ((((e.clientX - rect.left) / rect.width) * W - L) /
                      (W - L - R)) *
                      (data.length - 1),
                  ),
                ),
              ),
            );
          }
        }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          onSelect(
            Math.max(
              0,
              Math.min(
                data.length - 1,
                Math.round(
                  ((((e.clientX - rect.left) / rect.width) * W - L) /
                    (W - L - R)) *
                    (data.length - 1),
                ),
              ),
            ),
          );
        }}
      >
        <text x={L} y={15}>
          {unit}
        </text>
        {emptyAfter !== undefined && (
          <>
            <rect
              x={xx(emptyAfter)}
              y={T}
              width={W - R - xx(emptyAfter)}
              height={H - T - B}
              fill="currentColor"
              opacity=".025"
            />
            <text x={xx(emptyAfter) + 8} y={T + 19}>
              台灣：尚未觀察
            </text>
          </>
        )}
        {partialPoints.map((p) => (
          <rect
            key={p.i}
            className="to-partial-band"
            x={xx(Math.max(0, p.i - 0.45))}
            y={T}
            width={
              xx(Math.min(data.length - 1, p.i + 0.45)) -
              xx(Math.max(0, p.i - 0.45))
            }
            height={H - T - B}
            fill="currentColor"
            opacity=".045"
          />
        ))}
        {Array.from({ length: 5 }, (_, i) => min + ((max - min) * i) / 4).map(
          (v) => (
            <g key={v}>
              <line
                className="to-axis"
                x1={L}
                x2={W - R}
                y1={yy(v)}
                y2={yy(v)}
              />
              <text x={L - 9} y={yy(v) + 4} textAnchor="end">
                {n(
                  v,
                  preciseTicks
                    ? Number.isInteger(v)
                      ? 0
                      : 1
                    : Math.abs(max - min) < 5
                      ? 1
                      : 0,
                )}
              </text>
            </g>
          ),
        )}
        {threshold !== undefined && (
          <>
            <line
              x1={L}
              x2={W - R}
              y1={yy(threshold)}
              y2={yy(threshold)}
              stroke="currentColor"
              opacity=".4"
              strokeDasharray="2 6"
            />
            <text x={W - R} y={yy(threshold) - 7} textAnchor="end">
              自選觀察線 {threshold}%
            </text>
          </>
        )}
        {breakAt !== undefined && (
          <g>
            <line
              className="to-axis"
              x1={xx(breakAt)}
              x2={xx(breakAt)}
              y1={T}
              y2={H - B}
              strokeDasharray="3 4"
            />
            <text
              x={W - R}
              y={T + (emptyAfter !== undefined ? 45 : 15)}
              textAnchor="end"
            >
              1995 統計變更
            </text>
          </g>
        )}
        <path className="to-path" d={path("a")} />
        <path className="to-path secondary" d={path("b")} />
        {(["a", "b"] as const).map((k, j) => (
          <g key={k}>
            <path
              className={`to-path to-partial-path ${j ? "secondary" : ""}`}
              d={partialPath(k)}
            />
            {partialPoints
              .filter((p) => p[partialKey(k)] && p[k] !== null)
              .map((p) => (
                <rect
                  key={p.i}
                  className={`to-dot ${j ? "secondary" : ""}`}
                  x={xx(p.i) - 5}
                  y={yy(p[k]!) - 5}
                  width="10"
                  height="10"
                  transform={`rotate(45 ${xx(p.i)} ${yy(p[k]!)})`}
                />
              ))}
          </g>
        ))}
        <line
          x1={xx(selected)}
          x2={xx(selected)}
          y1={T}
          y2={H - B}
          stroke="currentColor"
          opacity=".2"
        />
        {(["a", "b"] as const).map(
          (k, j) =>
            pt[k] !== null &&
            !pt[partialKey(k)] && (
              <circle
                key={k}
                className={`to-dot ${j ? "secondary" : ""}`}
                cx={xx(selected)}
                cy={yy(pt[k]!)}
                r="5"
              />
            ),
        )}
        {labelsAt.map((i) => (
          <text
            key={i}
            x={xx(i)}
            y={H - 10}
            textAnchor={i === data.length - 1 ? "end" : "middle"}
          >
            {xLabel ? xLabel(data[i].x) : data[i].x}
          </text>
        ))}
      </svg>
      {partialPoints.length > 0 && (
        <p className="to-partial-note">
          ◇ 菱形與點線＝部分年度累計；淡底標出該期。{partialPoints[0].period}
          ，依已公布金額繪製，未年化。
        </p>
      )}
    </>
  );
}

export function TaiwanClock() {
  const [yearIndex, setYearIndex] = useState(0);
  const [now, setNow] = useState<number | null>(null);
  const year = yearIndex === 0 ? 2030 : 2035;
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const parts = now === null ? null : countdownParts(now, reviewDeadline(year));
  const start = Date.UTC(2026, 9, 3, 16);
  const elapsed =
    now === null
      ? 0
      : Math.min(
          1,
          Math.max(0, (now - start) / (reviewDeadline(year) - start)),
        );
  const angle = elapsed * 360;
  const pad = (v: number) => String(v).padStart(2, "0");
  return (
    <Panel
      id="taiwan-clock"
      tag="THE TAIWAN CLOCK / 政策行動窗口"
      title="台灣失落倒數鐘"
    >
      <p className="to-clock-manifesto">時鐘提醒我們：未來還可以改變。</p>
      <Choices
        label="政策檢視節點"
        choices={["2030｜近程檢視", "2035｜十年視野"]}
        value={yearIndex}
        onChange={setYearIndex}
      />
      <div className="to-clock-layout">
        <svg
          className="to-clock-face"
          viewBox="0 0 240 240"
          role="img"
          aria-label={`距${year}年底政策檢視節點的時間；圓環顯示自2026年10月4日起經過的日曆比例`}
        >
          <circle className="to-ring" cx="120" cy="120" r="110" />
          {Array.from({ length: 60 }, (_, i) => (
            <line
              key={i}
              x1="120"
              y1={i % 5 ? 17 : 12}
              x2="120"
              y2="24"
              stroke="currentColor"
              opacity={i % 5 ? 0.25 : 0.8}
              transform={`rotate(${i * 6} 120 120)`}
            />
          ))}
          <circle
            cx="120"
            cy="120"
            r="91"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={`${elapsed * 572} 572`}
            transform="rotate(-90 120 120)"
          />
          <line
            x1="120"
            y1="120"
            x2="120"
            y2="43"
            stroke="currentColor"
            strokeWidth="2"
            transform={`rotate(${angle} 120 120)`}
            opacity=".4"
          />
          <rect x="66" y="87" width="108" height="70" fill="var(--to-bg)" />
          <text
            x="120"
            y="103"
            textAnchor="middle"
            fontSize="10"
            letterSpacing="2"
          >
            REVIEW YEAR
          </text>
          <text
            x="120"
            y="138"
            textAnchor="middle"
            fontSize="35"
            fontWeight="600"
            letterSpacing="-2"
          >
            {year}
          </text>
          <text x="120" y="172" textAnchor="middle" fontSize="10">
            把時間用在改變上
          </text>
        </svg>
        <div>
          <span className="to-kicker">距 {year}.12.31 台北時間年底</span>
          <div className="to-clock-digits">
            {parts ? n(parts.days, 0) : "—"}
            <small>天</small>
          </div>
          <div className="to-timecode" aria-hidden="true">
            {parts
              ? `${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}`
              : "--:--:--"}
          </div>
          <p className="to-note">
            {parts?.expired
              ? "檢視節點已到，請更新證據與下一輪行動目標。"
              : "每天在走的是行動窗口。改變的是我們能交出的成果。"}
          </p>
          <a className="to-clock-link" href="#capability-lab">
            試著把情境中的風險往後推 ↗
          </a>
        </div>
      </div>
      <p className="to-note">
        2030／2035
        是本文提出的政策檢視節點，並非估計的衰退開始日。圓環只計日曆時間；這座鐘沒有宣稱台灣將在某天失落三十年，也不是末日鐘組織的評估。
      </p>
    </Panel>
  );
}

const indicators = [
  {
    en: "MONEY",
    name: "資金",
    state: "流向變化已見",
    fact: "2025 年直接投資淨流出 343.44 億美元；2023 年為 182.59 億。",
    meaning: "總額不能量出產能外移；另列的核准統計還含大額財務避險增資。",
    action:
      "先分開核准與實際交易，再按最終用途拆分財務配置、併購與建廠，接上境內資本支出。",
    sources: ["C1", "C2"],
  },
  {
    en: "CAPACITY",
    name: "產能",
    state: "海內外同步擴張",
    fact: "台積電擴大美國布局，也揭露在台灣規劃 13 座先進製程與封裝廠。",
    meaning:
      "金額與廠數都不是可直接相加的有效產能；要同時看本地絕對量和全球份額。",
    action: "公開同節點的晶圓量、良率、先進封裝能力與投產時間。",
    sources: ["A2"],
  },
  {
    en: "CAPABILITY",
    name: "能力",
    state: "當地累積進行中",
    fact: "海外製造與研發布局持續；Rapidus 的 2nm 原型來自與 IBM 的合作路徑。",
    meaning: "台積電子公司在當地量產，與獨立競爭者能研發下一代，是不同門檻。",
    action: "追蹤首次試產、核心人才、供應商與研發決策所在地。",
    sources: ["A2", "A4"],
  },
  {
    en: "VALUE",
    name: "所得",
    state: "境內分配待補",
    fact: "台積電 2026Q2 合併毛利率 67.7%；這並不是台灣境內所得留存率。",
    meaning:
      "企業獲利仍強，是當前優勢；還要知道薪資、增加值與技術機會如何留在台灣。",
    action: "建立同產品鏈的境內增加值帳，避免營收與要素所得重複計算。",
    sources: ["A1"],
  },
  {
    en: "REPLACEMENT",
    name: "替代",
    state: "全面替代未證",
    fact: "已有海外生產與競爭者布局；目前資料尚未建立台灣被大規模商業替代的完整證據。",
    meaning: "原型、量產、良率、客戶認證與重複訂單，必須逐關檢驗。",
    action: "追查客戶能否用相近成本、品質與交期，持續轉移重要訂單。",
    sources: ["A2", "A4"],
  },
  {
    en: "MACRO",
    name: "總體",
    state: "長期因果待驗",
    fact: "直接投資淨流出擴大；尚無一致證據把它接成台灣三十年停滯的因果鏈。",
    meaning: "產業變化是否傳到薪資、生產力、信用與新企業形成，決定長期後果。",
    action: "以非半導體業與其他經濟體作對照，納入人口、景氣與金融條件。",
    sources: ["C1"],
  },
];
export function EvidenceDashboard() {
  const [active, setActive] = useState(0);
  const item = indicators[active];
  return (
    <Panel
      id="evidence-dashboard"
      tag="EVIDENCE DASHBOARD / 2026.10.04 快照"
      title="警訊在哪裡，優勢還剩什麼？"
    >
      <p>先看已知，再看下一個需要驗證的環節。</p>
      <div className="to-metrics">
        <div>
          <span>2025 FDI 淨流出</span>
          <strong>343.44</strong>
          <span>億美元 · 全產業</span>
        </div>
        <div>
          <span>美國多年計畫</span>
          <strong>2,650</strong>
          <span>億美元 · 尚未全執行</span>
        </div>
        <div>
          <span>2026Q2 毛利率</span>
          <strong>67.7%</strong>
          <span>台積電 · 全球合併</span>
        </div>
      </div>
      <div className="to-stat-grid" role="group" aria-label="六個證據面向">
        {indicators.map((d, i) => (
          <button
            className="to-evidence-button"
            key={d.en}
            type="button"
            aria-pressed={active === i}
            onClick={() => setActive(i)}
          >
            <span className="to-kicker">{d.en}</span>
            <strong>{d.name}</strong>
            <span className="to-state">{d.state}</span>
          </button>
        ))}
      </div>
      <div className="to-inset to-reading" aria-live="polite">
        <h4>
          {item.name}｜{item.state}
        </h4>
        <p>{item.fact}</p>
        <p className="to-note">判讀：{item.meaning}</p>
        <p className="to-note">
          <strong>下一筆該追的證據：</strong>
          {item.action}
        </p>
        <p className="to-note">
          原始來源：
          {item.sources.map((s, i) => (
            <span key={s}>
              {i > 0 && " · "}
              <a href={source(s)}>{s}</a>
            </span>
          ))}
        </p>
      </div>
      <p className="to-note">
        各格是證據狀態，不是國家信用評等，也不加總成衰退機率。多年美國計畫來源：
        <a href="https://www.nist.gov/news-events/news/2026/07/trump-administration-secures-additional-100-billion-us-semiconductor">
          NIST／美國商務部，2026-07-16
        </a>
        。
      </p>
    </Panel>
  );
}

export function CapitalFlows() {
  const [mode, setMode] = useState(0);
  const [selected, setSelected] = useState(11);
  const [basis, setBasis] = useState(1);
  const tw = evidence.taiwan;
  const jp = evidence.japan;
  const partial = evidence.taiwanPartial;
  const latest = basis === 0 ? partial.bop : partial.approval;
  const twBop = [...tw, { ...partial.bop, year: partial.year }];
  const compare = mode === 2;
  const data: Point[] = compare
    ? jp.map((d, i) => ({
        x: i,
        a: twBop[i]
          ? ((twBop[i].outward - twBop[i].inward) /
              (tw[0].outward - tw[0].inward)) *
            100
          : null,
        b: ((d.outward - d.inward) / (jp[0].outward - jp[0].inward)) * 100,
        breakBefore: d.breakBefore,
        partialA: i === tw.length,
        period:
          i === tw.length
            ? `台灣 2026 ${partial.bop.period}／日本 ${d.year} 全年`
            : undefined,
      }))
    : mode === 1
      ? jp.map((d) => ({
          x: d.year,
          a: d.outward * 10,
          b: d.inward * 10,
          breakBefore: d.breakBefore,
        }))
      : [
          ...tw.map((d) => ({
            x: d.year,
            a: (basis === 0 ? d.outward : d.approvedOut) * 10,
            b: (basis === 0 ? d.inward : d.approvedIn) * 10,
          })),
          {
            x: partial.year,
            a: latest.outward * 10,
            b: latest.inward * 10,
            partialA: true,
            partialB: true,
            period: `2026 ${latest.period}`,
          },
        ];
  const index = Math.min(selected, data.length - 1);
  const point = data[index];
  const labels: [string, string] = compare
    ? ["台灣淨流出指數", "日本淨流出指數"]
    : mode === 0 && basis === 0
      ? ["直接投資資產增加", "直接投資負債增加"]
      : mode === 0
        ? ["核准對外投資", "核准僑外來台"]
        : ["對外直接投資", "外來直接投資"];
  const labelX = compare ? `第 ${index} 年` : point.period || `${point.x} 全年`;
  const periodOf = (d: Point) =>
    d.period ||
    (compare ? `台灣 ${2015 + d.x}／日本 ${1983 + d.x} 全年` : `${d.x} 全年`);
  const rows = [
    [
      compare ? "相對年份" : "年份",
      labels[0],
      labels[1],
      "單位",
      "口徑",
      "資料期間",
    ],
    ...data.map((d) => [
      d.x,
      d.a,
      d.b,
      compare ? "基期=100" : "億美元",
      compare
        ? "TW2015/JP1983起點;JP1995斷點;兩國編制不同"
        : mode === 1
          ? "JETRO國際收支;曆年;1995統計變更"
          : basis === 0
            ? "CBC國際收支資產負債;曆年"
            : "MOEA核准;不含另列對陸陸資",
      periodOf(d),
    ]),
  ] as (string | number | null)[][];
  return (
    <Panel
      id="capital-flows"
      tag="CAPITAL FLOWS / 實際統計"
      title="把兩條線攤開，轉折才看得見"
    >
      <Choices
        label="國家與跨期比較"
        choices={["台灣 2015–2026", "日本 1983–2000", "跨期：淨流出指數"]}
        value={mode}
        onChange={(v) => {
          setMode(v);
          setSelected(v === 1 ? 7 : 11);
        }}
      />
      {mode === 0 && (
        <Choices
          label="投資統計口徑"
          choices={["央行｜國際收支", "經濟部｜核准"]}
          value={basis}
          onChange={setBasis}
        />
      )}
      {mode === 0 && basis === 1 && (
        <div className="to-ytd-highlight">
          <span className="to-kicker">2026 年 1–8 月 · 核准對外投資</span>
          <strong>
            {n(partial.approval.outward * 10)}
            <small> 億美元</small>
          </strong>
          <p>
            八個月累計，已超過 2024 全年 {n(tw[9].approvedOut * 10)} 億、2025
            全年 {n(tw[10].approvedOut * 10)} 億。
          </p>
        </div>
      )}
      <p className="to-note">
        {compare
          ? "各自首年=100；台灣 2015、日本 1983 是資料起點，並非相同政策衝擊。兩國編制不同，只供觀察形狀。台灣第 11 年為 2026 上半年累計，以點線標出；日本同位置仍是全年。"
          : mode === 1
            ? "JETRO 國際收支淨流量・曆年・負的外來投資代表撤資淨額。"
            : basis === 0
              ? "中央銀行・2015–2025 全年＋2026 年 1–6 月累計・含盈餘再投資與關係企業債務，並非全部現金匯出。"
              : "經濟部核准金額・2015–2025 全年＋2026 年 1–8 月累計・不含另表對中國大陸投資與陸資來台。包含財務避險、控股與併購等用途；不是實際執行額，也不是產能移轉量。"}
      </p>
      <LineChart
        data={data}
        labels={labels}
        unit={compare ? "淨流出指數（首年=100）" : "億美元"}
        selected={index}
        onSelect={setSelected}
        xLabel={compare ? (v) => `第 ${v} 年` : undefined}
        breakAt={mode > 0 ? 12 : undefined}
        emptyAfter={compare ? 11.5 : undefined}
      />
      <label>
        <span className="to-kicker">拖曳讀值 · 手機可觸碰曲線</span>
        <input
          aria-label="投資圖年份"
          type="range"
          min="0"
          max={data.length - 1}
          value={index}
          onChange={(e) => setSelected(+e.target.value)}
        />
      </label>
      <div className="to-scrub-result" aria-live="polite">
        <div>
          <small>
            {compare
              ? point.period || `${1983 + index} / ${2015 + index}`
              : "觀察期間"}
          </small>
          <strong>{labelX}</strong>
        </div>
        <div>
          <small>{labels[0]}</small>
          <strong>
            {point.a === null ? "尚未觀察" : n(point.a, compare ? 1 : 2)}
          </strong>
        </div>
        <div>
          <small>{labels[1]}</small>
          <strong>
            {point.b === null ? "—" : n(point.b, compare ? 1 : 2)}
          </strong>
        </div>
      </div>
      {mode > 0 && (
        <p className="to-warning-break">
          日本 1995 年附近因定義與匯率換算變更，JETRO
          提醒序列不嚴格連續；圖線在此斷開。跨期圖不延伸台灣的未來。
        </p>
      )}
      <details>
        <summary>展開數據與口徑</summary>
        <div className="to-table-wrap">
          <table>
            <thead>
              <tr>
                <th>資料期間／相對年</th>
                <th>{labels[0]}</th>
                <th>{labels[1]}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.x}>
                  <td>
                    {compare ? d.x : periodOf(d)}
                    {compare && `（${periodOf(d)}）`}
                  </td>
                  <td>{d.a === null ? "尚未觀察" : n(d.a, 3)}</td>
                  <td>{d.b === null ? "缺值" : n(d.b, 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          美元值為當年名目金額，沒有排除通膨、匯率或經濟體規模。基期化只改刻度，不能消除這些差異。FDI
          資產與負債的差額也不等於全部跨境資本淨流出。
        </p>
      </details>
      <div className="to-data-stamp">
        <p className="to-note">
          <a href={source("C1")}>央行 C1</a> ·{" "}
          <a href={source("J1")}>JETRO J1</a> ·{" "}
          <a href={source("M3")}>經濟部 M3</a> ·{" "}
          <a href={source("M4")}>2026 M4</a> · {ASOF} 資料快照
        </p>
        <button
          className="to-export"
          type="button"
          onClick={() =>
            downloadCsv(`taiwan-japan-flows-${mode}-${basis}.csv`, rows)
          }
        >
          下載本圖 CSV ↓
        </button>
      </div>
      <p className="to-note">
        2026 已入圖：核准 1–8 月對外 623.90／僑外來台 161.81 億美元；央行 1–6
        月資產 210.54／負債 52.84 億美元。部分年度按原值呈現，未年化。2025
        核准對外較 2024 全年減少 14.47%，與 2026
        前八月已超過兩個全年，可以同時成立。
      </p>
      {mode === 0 && basis === 1 && (
        <>
          <p className="to-note">
            2025 年包含台積電兩筆 TSMC Global 增資，合計 200 億美元，約占全年
            52%；官方用途為外匯避險與定存、債券孳息，不能視為海外建廠。
            年度下降也不能單憑時間先後歸因於關稅觀望。
          </p>
          <details id="approval-audit-2025">
            <summary>拆開 2025：每月核准額與兩筆已識別的財務用途增資</summary>
            <p className="to-note">
              單位：億美元。第三欄只列本次查明的兩筆 TSMC Global
              增資；「—」不是該月沒有其他財務用途投資。核准月份不等於決策或執行月份。
            </p>
            <div className="to-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>2025 月份</th>
                    <th>核准總額</th>
                    <th>其中兩筆增資</th>
                  </tr>
                </thead>
                <tbody>
                  {approvalAudit.monthly.map((row) => {
                    const known = approvalAudit.identifiedCases.find(
                      (item) => item.month === row.month,
                    );
                    return (
                      <tr key={row.month}>
                        <td>{row.month} 月</td>
                        <td>{n(row.amount / 100000)}</td>
                        <td>
                          {known ? (
                            <a href={known.sourceUrl}>
                              {n(known.amount / 100000)}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <th>全年</th>
                    <td>
                      {n(
                        approvalAudit.monthly.reduce(
                          (sum, row) => sum + row.amount,
                          0,
                        ) / 100000,
                      )}
                    </td>
                    <td>
                      {n(
                        approvalAudit.identifiedCases.reduce(
                          (sum, row) => sum + row.amount,
                          0,
                        ) / 100000,
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="to-note">
              3 月 110.68 億扣除該筆 100 億後為 10.68 億，4 月總額則為 12.48
              億。
              這只說明大案會改變曲線形狀；其餘金額仍可能包含其他財務用途，不能直接稱為實體投資。
              <a href={approvalAudit.sourceUrl}>經濟部 2025 年 12 月統計速報</a>
              （2026-01-15 發布；對外總表）。
            </p>
          </details>
        </>
      )}
    </Panel>
  );
}

const pledges = [
  ...pipeline.announcements.map((p) => ({ ...p, claim: false })),
  {
    date: pipeline.watch.displayBucket,
    total: pipeline.watch.total,
    text: pipeline.watch.text,
    source: pipeline.watch.source,
    claim: true,
  },
];
export function InvestmentPipeline() {
  const [active, setActive] = useState(pipeline.announcements.length - 1);
  const p = pledges[active];
  return (
    <Panel
      id="investment-pipeline"
      tag="PIPELINE & WATCH / 已公告布局與前瞻觀察"
      title="從一座廠，到一個生態系"
    >
      <p>台積電對美國的多年投資計畫，如何一再擴大。</p>
      <div className="to-legend">
        <span>
          <i className="to-pipeline-key" />
          已公告計畫
        </span>
        <span>
          <i className="to-pipeline-key claim" />
          川普說法・待確認
        </span>
      </div>
      <svg
        className="to-chart"
        viewBox="0 0 720 310"
        role="img"
        aria-label="五次公布的累計計畫總額：120、400、超過650、1650、2650億美元，不可相加。右側虛線框為川普所稱5000億美元，未確認為台積電承諾。2027之後僅為前瞻展示區，不是宣布或執行日期。"
      >
        <text x="20" y="17">
          十億美元 · 多年金額，非當年支出
        </text>
        <line className="to-axis" x1="20" x2="705" y1="245" y2="245" />
        <line
          className="to-pipeline-divider"
          x1="557"
          x2="557"
          y1="30"
          y2="292"
        />
        {pledges.map((d, i) => (
          <g key={d.date}>
            <rect
              className={`to-pipeline-bar ${d.claim ? "claim" : ""} ${active !== i ? "unselected" : ""}`}
              x={(d.claim ? 632 : 65 + 105 * i) - 24}
              y={245 - (d.total / 500) * 200}
              width="48"
              height={(d.total / 500) * 200}
            />
            <text
              x={d.claim ? 632 : 65 + 105 * i}
              y={232 - (d.total / 500) * 200}
              textAnchor="middle"
            >
              {i === 2 ? ">65" : d.claim ? "500*" : d.total}
            </text>
            <text x={d.claim ? 632 : 65 + 105 * i} y="269" textAnchor="middle">
              {d.date}
            </text>
            {d.claim && (
              <text x="632" y="290" textAnchor="middle">
                待確認說法
              </text>
            )}
          </g>
        ))}
      </svg>
      <p className="to-note">
        * 2027+ 僅是「2027 年之後」的前瞻觀察位置，不是官方時程。 5,000 億來自
        2026 年 9 月 28 日川普訪談（10 月 1
        日刊出），未確認為台積電計畫，不納入已公告總額。
      </p>
      <Choices
        label="投資公告與待確認說法"
        choices={pledges.map((d) => (d.claim ? "2027+｜待確認" : d.date))}
        value={active}
        onChange={setActive}
      />
      <div className="to-inset" aria-live="polite">
        <span className="to-kicker">
          {p.claim
            ? "川普說法 / 待確認 / 非公司承諾"
            : `${p.date} / 美國 / 多年累計計畫`}
        </span>
        <div className="to-pipeline-total">
          {active === 2 ? ">" : ""}
          {n(p.total * 10, 0)}
        </div>
        <span className="to-kicker">億美元</span>
        <p className="to-detail">{p.text}</p>
        <p className="to-note">
          <a href={p.source}>
            {p.claim ? "閱讀 TIME 訪談原文 ↗" : "閱讀當次官方公告 ↗"}
          </a>
          {p.claim && (
            <>
              {" "}
              · <a href={pipeline.watch.coverage}>INSIDE 報導 ↗</a>
            </>
          )}
        </p>
      </div>
      <div className="to-band" aria-label="單一投資項目需追蹤的階段">
        <span>宣布</span>
        <span>核准</span>
        <span>施工</span>
        <span>裝機</span>
        <span>量產</span>
        <span>良率／訂單</span>
      </div>
      <p className="to-note">
        階段列是逐案查核清單，不表示整個 2,650
        億美元計畫都已進入量產。新總額涵蓋舊承諾，不能再次加總，也不能等同當期
        FDI 或有效產能。右側 5,000 億也不可與 2,650
        億相加，或據此推算已落地產能。
      </p>
    </Panel>
  );
}

const pairs = [
  {
    label: "美國｜市場與在地化",
    old: "日本 ↔ 美國",
    current: "台灣 ↔ 美國",
    oldText:
      "貿易摩擦、市場准入與半導體協議改變競爭條件；日本失去 DRAM 優勢，不等於美國 DRAM 全盤接收。",
    newText:
      "製造、封裝與研發布局指向美國。TSMC 所有權與能力所在地分開；美國有產能，不自動等於獨立美商已追上。",
    test: "外部政策如何改變投資地點，並讓當地建立持續創新的能力？",
    country: "美國",
    keys: ["jpUS", "usJP"],
  },
  {
    label: "韓國｜獨立競爭者",
    old: "日本 ↔ 韓國",
    current: "台灣 ↔ 韓國",
    oldText:
      "三星 1983 年開發 64Kb DRAM，1992 年取得公司排名第一；韓國全國 DRAM 首位到 1998 年才出現。技術來源包含美、日。",
    newText:
      "三星是獨立競爭者；韓國與台灣也有 HBM／先進封裝的互補。不能把記憶體優勢直接當成晶圓代工替代。",
    test: "從投入與試產，走到良率、客戶認證與重複訂單，是否出現可持續替代？",
    country: "韓國",
    keys: ["jpKR", "krJP"],
  },
  {
    label: "台／日｜能力承接者",
    old: "日本 ↔ 台灣",
    current: "台灣 ↔ 日本",
    oldText:
      "1994 年 OKI 與南亞塑膠簽約；1995 年南亞科承接。東芝 1995 年授權華邦，1996 年再延伸技術。90 年代必須納入。",
    newText:
      "JASM 是台積電體系的合作布局；Rapidus 則與 IBM 合作。日本的自主追趕，要另查技術、良率與客戶，不能合併成同一條移轉。",
    test: "量產據點、人才與供應商，能否進一步形成自主研發下一代的群聚？",
    country: "日本",
    keys: ["jpTW", "twJP"],
  },
];
export function PairComparison() {
  const [pair, setPair] = useState(0);
  const [era, setEra] = useState(0);
  const [window, setWindow] = useState(0);
  const [direction, setDirection] = useState(0);
  const [scale, setScale] = useState(0);
  const [index, setIndex] = useState(10);
  const p = pairs[pair];
  const historicalEnd = window === 0 ? 1990 : 2000;
  const isOverlay = era === 2;
  const isIndexed = isOverlay && scale === 1;
  const oldPartner = pair === 2 ? "台灣" : p.country;
  const historical: Point[] = evidence.historicalPairs.map((d) => {
    const r = d as unknown as Record<string, number | null>;
    return {
      x: d.year,
      a: r[p.keys[0]] == null ? null : r[p.keys[0]]! / 1000,
      b: r[p.keys[1]] == null ? null : r[p.keys[1]]! / 1000,
    };
  });
  const modern: Point[] = evidence.modernPairs
    .filter((d) => d[1] === p.country)
    .map((d) => ({
      x: Number(String(d[0]).slice(0, 4)),
      a: Number(d[2]),
      b: Number(d[3]),
      partialA: String(d[0]).length > 4,
      partialB: String(d[0]).length > 4,
      period: String(d[0]).length > 4 ? String(d[0]) : undefined,
    }));
  const historicalWindow = historical.filter(
    (d) => d.x >= 1980 && d.x <= historicalEnd,
  );
  const key = direction === 0 ? "a" : "b";
  const overlay = eraOverlay(
    historical.map((d) => ({ year: d.x, value: d[key] })),
    modern.map((d) => ({
      year: d.x,
      value: d[key],
      partial: d.partialA,
      period: d.period,
    })),
    historicalEnd,
    isIndexed,
  );
  const data = isOverlay ? overlay.data : era === 0 ? historicalWindow : modern;
  const selected = Math.min(index, data.length - 1);
  const pt = data[selected];
  const overlayPoint = overlay.data[selected];
  const historicalLabels: [string, string] = [
    `日本 → ${oldPartner}`,
    `${oldPartner} → 日本`,
  ];
  const modernLabels: [string, string] = [
    `台灣 → ${p.country}`,
    `${p.country} → 台灣`,
  ];
  const pairLabels: [string, string] = isOverlay
    ? [historicalLabels[direction], modernLabels[direction]]
    : era === 0
      ? historicalLabels
      : modernLabels;
  const historicalBasis =
    pair === 0
      ? "BEA 金融交易，全產業"
      : pair === 1
        ? "JETRO 雙向國際收支；僅 1995–2000 具同口徑數據"
        : "台灣記錄的雙向核准投資，曆年";
  const modernBasis =
    "台灣核准投資，全產業；2015–2025 全年＋2026 年 1–8 月累計";
  const basis = isOverlay
    ? `歷史：${historicalBasis}；當代：${modernBasis}`
    : era === 0
      ? historicalBasis
      : modernBasis;
  const unit = isIndexed ? "指數 · 各自起點＝100" : "十億美元 · 全產業";
  const hasHistoricalValues = historicalWindow.some(
    (d) => d.a !== null || d.b !== null,
  );
  const readValue = (value: number | null) =>
    value === null ? "缺資料" : n(value, isIndexed ? 1 : 3);
  return (
    <Panel
      id="three-pairs"
      tag="THREE RELATIONSHIPS / 兩組關係，一起檢驗"
      title="不是只比一個對手，而是看整個局"
    >
      <Choices
        label="比較關係"
        choices={pairs.map((d) => d.label)}
        value={pair}
        onChange={setPair}
      />
      <div className="to-split">
        <div>
          <span className="to-kicker">歷史 · 1980–{historicalEnd}</span>
          <h4>{p.old}</h4>
          <p className="to-note">{p.oldText}</p>
        </div>
        <div>
          <span className="to-kicker">當代 · 2015–2026</span>
          <h4>{p.current}</h4>
          <p className="to-note">{p.newText}</p>
        </div>
      </div>
      <div className="to-inset">
        <span className="to-kicker">共同待驗機制</span>
        <p>{p.test}</p>
      </div>
      <Choices
        label="雙向投資視圖"
        choices={["歷史投資", "當代投資", "雙線疊圖"]}
        value={era}
        onChange={(v) => {
          setEra(v);
          setIndex(v === 0 ? historicalWindow.length - 1 : v === 1 ? 11 : 10);
        }}
      />
      {era !== 1 && (
        <Choices
          label="歷史比較區間"
          choices={["擴張期｜1980–1990", "看後來｜1980–2000"]}
          value={window}
          onChange={(v) => {
            setWindow(v);
            setIndex(isOverlay ? 10 : v === 0 ? 10 : 20);
          }}
        />
      )}
      {isOverlay && (
        <div className="to-overlay-options">
          <p className="to-kicker">OVERLAY / 把兩個年代，放上同一張圖</p>
          <Choices
            label="疊圖投資方向"
            choices={["對外投資", "流入投資"]}
            value={direction}
            onChange={setDirection}
          />
          <Choices
            label="疊圖尺度"
            choices={["原始金額", "起點＝100"]}
            value={scale}
            onChange={setScale}
          />
          <p className="to-note">
            第 0 年＝日本 1980／台灣 2015；每格都是一年，共用同一縱軸。
            {isIndexed
              ? `指數＝當期金額 ÷ 各自起點金額 × 100。起點：歷史 ${overlay.baseA === null ? "缺值" : n(overlay.baseA, 4)}／當代 ${overlay.baseB === null ? "缺值" : n(overlay.baseB, 4)} 十億美元。`
              : "原始金額不縮放貼合，不調整物價、匯率或經濟規模。"}
          </p>
          {isIndexed && (!overlay.canIndexA || !overlay.canIndexB) && (
            <p className="to-data-gap" role="status">
              {!overlay.canIndexA ? "歷史" : "當代"}
              起點缺值、為零或非正值，無法計算起點指數；不自動改用其他年份。請切回「原始金額」查看可得資料。
            </p>
          )}
        </div>
      )}
      <p className="to-note">{basis}；不同資料口徑只並列，不合成同一指標。</p>
      {era !== 1 && !hasHistoricalValues && (
        <p className="to-data-gap" role="status">
          日韓在 1980–1990 年缺少雙向同口徑資料，歷史線留白，不代表零。
          <button
            type="button"
            onClick={() => {
              setWindow(1);
              setIndex(15);
              setScale(0);
            }}
          >
            查看 1995 年起的可得資料 →
          </button>
        </p>
      )}
      <div className={isOverlay ? "to-era-overlay" : undefined}>
        <LineChart
          data={data}
          labels={pairLabels}
          unit={unit}
          selected={selected}
          onSelect={setIndex}
          xLabel={isOverlay ? (x) => `第 ${x} 年` : undefined}
          emptyAfter={isOverlay && window === 1 ? 11.5 : undefined}
          plotInset={isIndexed ? 84 : 52}
          preciseTicks={isOverlay}
        />
      </div>
      {isOverlay && (
        <p className="to-note">
          實線＝歷史日本；虛線＝當代台灣。台灣 2026 年 1–8 月保留在第 11 年；
          {window === 0
            ? "歷史線依所選區間止於第 10 年（1990），切換「看後來」可顯示後續。"
            : "台灣尚未觀察到的後續年份留白，不以日本走勢代填。"}
        </p>
      )}
      <label>
        {isOverlay ? "相對年｜下方同步顯示兩個實際年份" : "年份"}
        <input
          aria-label="雙邊圖年份"
          type="range"
          min="0"
          max={data.length - 1}
          value={selected}
          onChange={(e) => setIndex(+e.target.value)}
        />
      </label>
      <div className="to-scrub-result" aria-live="polite">
        <div>
          <small>{isOverlay ? "距起點" : "觀察年"}</small>
          <strong>{isOverlay ? `第 ${pt.x} 年` : pt.period || pt.x}</strong>
        </div>
        <div>
          <small>{pairLabels[0]}</small>
          {isOverlay && <small>{overlayPoint.periodA}</small>}
          <strong>
            {isOverlay && overlayPoint.yearA === null
              ? "區間外"
              : readValue(pt.a)}
          </strong>
        </div>
        <div>
          <small>{pairLabels[1]}</small>
          {isOverlay && <small>{overlayPoint.periodB}</small>}
          <strong>
            {isOverlay && overlayPoint.yearB === null
              ? "未觀察"
              : readValue(pt.b)}
          </strong>
        </div>
      </div>
      <p className="to-note">讀值單位：{unit}。</p>
      {era !== 1 && (
        <p className="to-comparison-boundary">
          比較擴張階段，不預測破裂年份。1980／2015
          是固定展示起點，不是經估計的相同景氣位置；各組不另找高峰對齊。2027、2030
          不是由疊圖推算的危機日期。
        </p>
      )}
      <details>
        <summary>數據、缺值與來源</summary>
        <div className="to-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{isOverlay ? "相對年" : "年"}</th>
                {isOverlay && (
                  <>
                    <th>歷史期間</th>
                    <th>當代期間</th>
                  </>
                )}
                <th>{pairLabels[0]}</th>
                <th>{pairLabels[1]}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.x}>
                  <td>
                    {isOverlay ? `第 ${d.x} 年` : d.period || `${d.x} 全年`}
                  </td>
                  {isOverlay && (
                    <>
                      <td>{overlay.data[d.x].periodA}</td>
                      <td>{overlay.data[d.x].periodB}</td>
                    </>
                  )}
                  <td>{readValue(d.a)}</td>
                  <td>{readValue(d.b)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          表格單位：{unit}。日韓 1995
          年以前：日本對韓另有韓國申報資料，韓國對日缺少可校準年表；本圖保留兩側同口徑的空白。沒有把缺值當零。日美早期版本差異、日台與當代核准口徑均見附檔研究說明。
        </p>
        <p>
          <a href={source("J1")}>JETRO</a> · <a href={source("B1")}>BEA 入</a> ·{" "}
          <a href={source("B2")}>BEA 出</a> · <a href={source("M1")}>MOEA 出</a>{" "}
          · <a href={source("M2")}>MOEA 入</a>
        </p>
      </details>
      <button
        className="to-export"
        type="button"
        onClick={() =>
          isOverlay
            ? downloadCsv(
                `bilateral-overlay-${pair}-${direction}-${scale}-${historicalEnd}.csv`,
                [
                  [
                    "相對年",
                    "歷史期間",
                    "當代期間",
                    pairLabels[0],
                    pairLabels[1],
                    "單位",
                    "歷史原始值（十億美元）",
                    "當代原始值（十億美元）",
                    "口徑",
                  ],
                  ...overlay.data.map((d) => [
                    d.x,
                    d.periodA,
                    d.periodB,
                    d.a,
                    d.b,
                    unit,
                    d.rawA,
                    d.rawB,
                    basis,
                  ]),
                ],
              )
            : downloadCsv(`bilateral-${pair}-${era}-${historicalEnd}.csv`, [
                ["年份", pairLabels[0], pairLabels[1], "單位", "口徑"],
                ...data.map((d) => [
                  d.period || `${d.x} 全年`,
                  d.a,
                  d.b,
                  "十億美元",
                  basis,
                ]),
              ])
        }
      >
        {isOverlay ? "下載疊圖數據 CSV ↓" : "下載雙向數據 CSV ↓"}
      </button>
      <p className="to-note">
        這是三組以日本／台灣為中心的關係；美韓、美日、IBM、Philips
        等外部連結也影響結果。共同衝擊可能讓三組同時變動，因此不能當成三份獨立證明。FDI
        不等於 DRAM 技術流量。
      </p>
    </Panel>
  );
}

export function DramHistory() {
  const [selected, setSelected] = useState(0);
  const data = dramBenchmarks(evidence.dram);
  const xPosition = (year: number) => 67 + ((year - 1986) / 14) * 605;
  const guide = (country: "japan" | "korea") =>
    benchmarkGuide(
      data.map((p) => ({
        x: xPosition(p.year),
        y: p[country] === null ? null : 197 - p[country] * 2,
      })),
    );
  const d = data[selected];
  return (
    <Panel
      id="dram-history"
      tag="HISTORICAL BENCHMARKS / 歷史參考點"
      title="轉移，往往比衰退的標題更早開始"
    >
      <p className="to-note">
        全球 DRAM
        營收份額，按公司總部國籍。四個近似基準年；不是廠址份額，也不是完整逐年序列。
      </p>
      <div className="to-legend">
        <span>
          <i className="to-swatch" />
          日本
        </span>
        <span>
          <i className="to-swatch secondary" />
          韓國
        </span>
      </div>
      <svg
        className="to-chart"
        viewBox="0 0 720 240"
        role="img"
        aria-label="日本DRAM參考份額1986年77%、1990年60%、1995年42%、2000年17%，以實線連接；韓國分別小於5%、15%、35%、50%，虛線從1990年開始。連線僅引導視線，不插補缺年。"
      >
        {[0, 20, 40, 60, 80].map((v) => (
          <g key={v}>
            <line
              className="to-axis"
              x1="48"
              x2="692"
              y1={197 - v * 2}
              y2={197 - v * 2}
            />
            <text x="36" y={201 - v * 2} textAnchor="end">
              {v}%
            </text>
          </g>
        ))}
        <path className="to-path" data-series="japan" d={guide("japan")} />
        <path
          className="to-path secondary"
          data-series="korea"
          d={guide("korea")}
        />
        {data.map((p, i) => {
          const x = xPosition(p.year);
          return (
            <g key={p.year} opacity={selected === i ? 1 : 0.5}>
              <circle cx={x} cy={197 - p.japan * 2} r="6" fill="currentColor" />
              {p.korea === null ? (
                <text x={x} y="189" textAnchor="middle">
                  &lt;5%
                </text>
              ) : (
                <rect
                  x={x - 5}
                  y={192 - p.korea * 2}
                  width="10"
                  height="10"
                  fill="var(--to-bg)"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              )}
              <text x={x} y="226" textAnchor="middle">
                {p.year}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="to-note">
        實線／虛線僅連接參考點以引導視線，不代表缺年估值。 韓國 1986
        年只有「低於 5%」，未當成精確值連線；虛線從 1990 年開始。
      </p>
      <Choices
        label="歷史基準年"
        choices={data.map((p) => String(p.year))}
        value={selected}
        onChange={setSelected}
      />
      <div className="to-scrub-result" aria-live="polite">
        <div>
          <small>參考年</small>
          <strong>{d.year}</strong>
        </div>
        <div>
          <small>日本</small>
          <strong>約 {d.japan}%</strong>
        </div>
        <div>
          <small>韓國</small>
          <strong>{d.korea === null ? "<5%" : `約 ${d.korea}%`}</strong>
        </div>
      </div>
      <p className="to-note">
        來源：<a href={source("D1")}>半導體歷史館 D1</a>{" "}
        的產業史近似值；其他研究版本有差異。完整逐年原表仍缺，不能拿四點估計因果時滯。
      </p>
    </Panel>
  );
}

export function CapabilityLab() {
  const [s0, setS0] = useState(70),
    [gt, setGt] = useState(5),
    [go, setGo] = useState(15),
    [q, setQ] = useState(50),
    [selected, setSelected] = useState(10);
  const horizon = yearsToThreshold(s0 / 100, gt / 100, go / 100, q / 100);
  const data: Point[] = Array.from({ length: 31 }, (_, h) => {
    const s = capabilityShare(s0 / 100, gt / 100, go / 100, h) * 100;
    return { x: h, a: s, b: 100 - s };
  });
  const current = data[selected];
  const defaults = () => {
    setS0(70);
    setGt(5);
    setGo(15);
    setQ(50);
    setSelected(10);
  };
  const presets = [
    [5, 15],
    [15, 15],
    [0, 15],
  ];
  const preset = presets.findIndex((v) => v[0] === gt && v[1] === go);
  const sliders = [
    {
      label: "台灣起始能力份額（假設）",
      value: s0,
      min: 40,
      max: 90,
      setter: setS0,
    },
    { label: "台灣境內能力年成長", value: gt, min: -5, max: 25, setter: setGt },
    { label: "海外能力年成長", value: go, min: 0, max: 25, setter: setGo },
    { label: "自選份額觀察線", value: q, min: 30, max: 60, setter: setQ },
  ];
  return (
    <Panel
      id="capability-lab"
      tag="SCENARIO LAB / 全部參數均為假設"
      title="親手試一次：把鐘往回撥"
    >
      <p>
        讓海外繼續成長。試著提高台灣的創新與能力增速，看看曲線和門檻時間如何改變。
      </p>
      <Choices
        label="能力成長情境"
        choices={[
          "兩地成長，海外較快",
          "台灣加速，兩地同速",
          "境內停滯，海外成長",
        ]}
        value={preset}
        onChange={(i) => {
          setGt(presets[i][0]);
          setGo(presets[i][1]);
        }}
      />
      <div className="to-sliders">
        {sliders.map((d) => (
          <label key={d.label}>
            <span className="to-label-row">
              <span>{d.label}</span>
              <strong>{d.value}%</strong>
            </span>
            <input
              aria-label={d.label}
              type="range"
              min={d.min}
              max={d.max}
              value={d.value}
              onChange={(e) => d.setter(+e.target.value)}
            />
          </label>
        ))}
      </div>
      <div className="to-huge-result" aria-live="polite">
        <span className="to-kicker">模型中，降至自選 {q}% 觀察線所需時間</span>
        <strong>
          {horizon === 0
            ? "起點已達觀察線"
            : !Number.isFinite(horizon)
              ? "不會向下穿越"
              : `${n(horizon, 1)} 年`}
        </strong>
        <p className="to-result-desc">
          {horizon === 0
            ? "調高起始份額或調低觀察線，即可觀察尚未跨線的情境。"
            : !Number.isFinite(horizon)
              ? "在這組固定成長率假設下，台灣份額持平或增加。"
              : "從假設起點起算；這是份額門檻的數學結果，並非衰退日期。"}
        </p>
      </div>
      <LineChart
        data={data}
        labels={["台灣能力份額", "海外能力份額"]}
        unit="假設能力份額（%）"
        fixedRange={[0, 100]}
        selected={selected}
        onSelect={setSelected}
        threshold={q}
        xLabel={(v) => `第 ${v} 年`}
      />
      <label>
        觀察模擬年份
        <input
          aria-label="情境模擬年份"
          type="range"
          min="0"
          max="30"
          value={selected}
          onChange={(e) => setSelected(+e.target.value)}
        />
      </label>
      <div className="to-metrics" aria-live="polite">
        <div>
          <span>第 {selected} 年台灣份額</span>
          <strong>{n(current.a!, 1)}%</strong>
          <span>相對地位</span>
        </div>
        <div>
          <span>台灣絕對能力</span>
          <strong>{n(Math.pow(1 + gt / 100, selected) * 100, 0)}</strong>
          <span>台灣起點＝100</span>
        </div>
        <div>
          <span>海外絕對能力</span>
          <strong>{n(Math.pow(1 + go / 100, selected) * 100, 0)}</strong>
          <span>海外起點＝100</span>
        </div>
      </div>
      <p className="to-note">
        起始 70%、觀察線 50%、年增 5%／15%
        都是教學假設，並非台灣實測值。兩地絕對能力指數各自設
        100，不能直接相加推算份額；份額另使用上方起始權重。成長率固定、能力可比較，也是模型假設。
      </p>
      <div className="to-controls">
        <button type="button" onClick={defaults}>
          重設示範情境
        </button>
        <button
          className="to-export"
          type="button"
          onClick={() =>
            downloadCsv("taiwan-capability-scenario.csv", [
              [
                "全為假設",
                "s0",
                s0,
                "gTW",
                gt,
                "gOverseas",
                go,
                "threshold",
                q,
              ],
              [
                "相對年",
                "台灣份額%",
                "海外份額%",
                "台灣能力指數_起點100",
                "海外能力指數_起點100",
              ],
              ...data.map((d) => [
                d.x,
                d.a,
                d.b,
                100 * Math.pow(1 + gt / 100, d.x),
                100 * Math.pow(1 + go / 100, d.x),
              ]),
            ])
          }
        >
          下載情境 CSV ↓
        </button>
      </div>
    </Panel>
  );
}

export function ActionAgenda() {
  return (
    <Panel
      id="action-agenda"
      tag="A COMMON AGENDA / 從今天開始的共同工作"
      title="把每一格警訊，變成一項可以交付的成果"
    >
      <p>以下是本文提出的工作目標，完成與否應由公開成果驗證。</p>
      <ul className="to-action-list">
        <li>
          <span className="to-kicker">90 DAYS</span>
          <div>
            <strong>把帳攤開：一張國家能力資產負債表</strong>
            <p>
              行政部門與產業共同公布境內／海外投資、有效產能、首次量產與研發所在地；每筆附來源、口徑與更新日。
            </p>
          </div>
        </li>
        <li>
          <span className="to-kicker">1 YEAR</span>
          <div>
            <strong>讓下一代技術，在台灣更容易發生</strong>
            <p>
              將供電可靠度、園區基礎設施、研究設備與人才居留問題列出時程、責任機關及可驗收指標。
            </p>
          </div>
        </li>
        <li>
          <span className="to-kicker">EVERY 6M</span>
          <div>
            <strong>讓海外的成功，持續回到台灣</strong>
            <p>
              公開檢視全球布局帶來的本地研發、供應商升級、青年實質所得與創業機會；好消息與壞消息一起列。
            </p>
          </div>
        </li>
        <li>
          <span className="to-kicker">2030 / 35</span>
          <div>
            <strong>驗收新的成長來源</strong>
            <p>
              檢視 AI
              應用、軟體、機器人及其他新產業是否形成可持續的本地生產力與所得；讓成功不只集中在一家公司。
            </p>
          </div>
        </li>
      </ul>
      <p className="to-note">
        政策成果不直接代入模型加分。只有當能力、所得與替代風險的實際數據改變，才更新判斷。
      </p>
    </Panel>
  );
}

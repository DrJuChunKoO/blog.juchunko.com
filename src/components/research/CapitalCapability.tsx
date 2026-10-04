import { useEffect, useId, useState } from "react";
import {
  investment,
  partial,
  regions,
  sources,
  commitments,
  japanInvestment,
  japanSource,
} from "../../data/research/taiwan-investment";
import "./capital-capability.css";
const f = (n: number) => n.toFixed(2);
const Frame = ({
  label,
  title,
  id,
  children,
}: {
  label: string;
  title: string;
  id?: string;
  children: React.ReactNode;
}) => (
  <section id={id} className="cc not-prose" aria-label={title}>
    <div className="cc-kicker">{label}</div>
    <h3>{title}</h3>
    {children}
  </section>
);
const point = (i: number, n: number, value: number, max: number) =>
  `${52 + (i / (n - 1)) * 642},${280 - (value / max) * 230}`;
const path = (values: number[], max: number) =>
  values.map((v, i) => point(i, values.length, v, max)).join(" ");

export function CapitalCurves() {
  const [mode, setMode] = useState<"tw" | "jp" | "compare">("tw");
  const [index, setIndex] = useState(8);
  const [china, setChina] = useState(false);
  const compare = mode === "compare";
  const jp = compare ? japanInvestment.slice(0, 10) : japanInvestment;
  const rows = mode === "jp" ? jp : investment;
  const selected = Math.min(index, rows.length - 1);
  const a = compare
    ? jp.map((r) => (r.out / jp[0].out) * 100)
    : rows.map(
        (r) =>
          r.out +
          (mode === "tw" && china
            ? investment.find((x) => x.year === r.year)!.china
            : 0),
      );
  const b = compare
    ? investment.map((r) => (r.out / investment[0].out) * 100)
    : rows.map((r) => r.in);
  const max = compare ? 1600 : mode === "jp" ? 80 : 55;
  const labels = compare
    ? ["日本對外投資（1980＝100）", "台灣對外投資（2016＝100）"]
    : ["對外投資", mode === "jp" ? "流入日本" : "僑外來台"];
  const switchMode = (m: "tw" | "jp" | "compare") => {
    setMode(m);
    setIndex(m === "jp" ? 9 : 8);
  };
  return (
    <Frame
      id="capital-curves"
      label="資本曲線 / 移動滑鼠、點選年份或拖曳"
      title="兩條線之間，台灣的轉折正在發生"
    >
      <div className="cc-presets">
        {[
          { id: "tw", text: "台灣：進出雙線" },
          { id: "jp", text: "日本：進出雙線" },
          { id: "compare", text: "跨期：成長軌跡" },
        ].map((m) => (
          <button
            key={m.id}
            aria-pressed={mode === m.id}
            onClick={() => switchMode(m.id as typeof mode)}
          >
            {m.text}
          </button>
        ))}
      </div>
      <p className="cc-note">
        {compare
          ? "日本 1980–1989／台灣 2016–2025，各自第一年＝100；年份按先後排列，未按政策事件對齊。"
          : mode === "tw"
            ? "2016–2025 曆年・核准統計・單位：十億美元"
            : "1980–2000 財政年（4 月起）・日本官方歷史行政統計・單位：十億美元"}
      </p>
      {mode === "tw" && (
        <label className="cc-toggle">
          <input
            type="checkbox"
            checked={china}
            onChange={(e) => setChina(e.target.checked)}
          />
          <span>對外投資納入中國大陸；來台仍不含陸資</span>
        </label>
      )}
      <div className="cc-legend">
        <span>
          <i className="cc-line-key" />
          {labels[0]}
        </span>
        <span>
          <i className="cc-line-key dashed" />
          {labels[1]}
        </span>
      </div>
      <svg
        viewBox="0 0 760 335"
        role="img"
        aria-label={`${labels.join("與")}互動雙線圖`}
        onPointerMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - box.left) / box.width) * 760;
          setIndex(
            Math.max(
              0,
              Math.min(
                rows.length - 1,
                Math.round(((x - 52) / 642) * (rows.length - 1)),
              ),
            ),
          );
        }}
      >
        {(compare
          ? [0, 400, 800, 1200, 1600]
          : mode === "jp"
            ? [0, 20, 40, 60, 80]
            : [0, 10, 20, 30, 40, 50]
        ).map((t) => (
          <g key={t}>
            <line
              x1="52"
              x2="694"
              y1={280 - (t / max) * 230}
              y2={280 - (t / max) * 230}
              stroke="currentColor"
              opacity=".12"
            />
            <text
              x="40"
              y={284 - (t / max) * 230}
              textAnchor="end"
              fontSize="12"
              fill="currentColor"
            >
              {t}
            </text>
          </g>
        ))}
        <polyline
          points={path(a, max)}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <polyline
          points={path(b, max)}
          fill="none"
          stroke="currentColor"
          opacity=".6"
          strokeWidth="3"
          strokeDasharray="8 6"
          strokeLinejoin="round"
        />
        <line
          x1={52 + (selected / (rows.length - 1)) * 642}
          x2={52 + (selected / (rows.length - 1)) * 642}
          y1="38"
          y2="280"
          stroke="currentColor"
          opacity=".25"
        />
        {[a, b].map((line, k) => (
          <circle
            key={k}
            cx={52 + (selected / (rows.length - 1)) * 642}
            cy={280 - (line[selected] / max) * 230}
            r="5"
            fill="currentColor"
            opacity={k === 0 ? 1 : 0.6}
          />
        ))}
        {rows.map(
          (r, n) =>
            n % (rows.length > 12 ? 2 : 1) === 0 && (
              <text
                key={r.year}
                x={52 + (n / (rows.length - 1)) * 642}
                y="308"
                textAnchor="middle"
                fontSize="12"
                fill="currentColor"
              >
                {compare ? `+${n}` : r.year}
              </text>
            ),
        )}
      </svg>
      <label className="cc-scrub">
        <span>
          {compare
            ? `日本 ${jp[selected].year}／台灣 ${investment[selected].year}`
            : rows[selected].year}
        </span>
        <input
          aria-label="選擇比較年份"
          type="range"
          min="0"
          max={rows.length - 1}
          value={selected}
          onChange={(e) => setIndex(Number(e.target.value))}
        />
      </label>
      <div className="cc-metric-grid" aria-live="polite">
        <div>
          <span>{labels[0]}</span>
          <strong>
            {f(a[selected])}
            <small>{compare ? "指數" : "十億美元"}</small>
          </strong>
        </div>
        <div>
          <span>{labels[1]}</span>
          <strong>
            {f(b[selected])}
            <small>{compare ? "指數" : "十億美元"}</small>
          </strong>
        </div>
        <div>
          <span>
            {compare
              ? "不是同步年份，也不是因果估計"
              : mode === "jp"
                ? "對外／流入"
                : "對外／來台"}
          </span>
          <strong>
            {compare ? "看形狀" : "× " + f(a[selected] / b[selected])}
          </strong>
        </div>
      </div>
      <p className="cc-note">
        {compare
          ? "基期選擇會影響形狀，兩國行政口徑亦不同。這張圖提出問題，不能單獨判定兩國走向相同。"
          : mode === "jp"
            ? "日本 1989 財政年對外投資達高點；圖保留其後回落及流入增加，避免只截取最相似的一段。"
            : "2026 年 1–8 月另列：對外 62.40、來台 16.17 十億美元；未年化，不接成全年曲線。"}
      </p>
      <details>
        <summary>資料來源與完整數列</summary>
        <div className="cc-table-scroll">
          <table>
            <thead>
              <tr>
                <th>年</th>
                <th>對外</th>
                <th>流入</th>
              </tr>
            </thead>
            <tbody>
              {(mode === "jp" ? japanInvestment : investment).map((r) => (
                <tr key={r.year}>
                  <td>{r.year}</td>
                  <td>{r.out.toFixed(6)}</td>
                  <td>{r.in.toFixed(6)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          台灣：<a href={sources.history}>海基會／投審司</a>，2025 採
          <a href={sources.outward}>經濟部最新修訂</a>；日本：
          <a href={japanSource}>JETRO 2002 白皮書 Fig. I-9，印刷頁 14</a>
          。日本不是國際收支淨流量，台灣也是核准而非執行。跨期模式固定用不含中國大陸的台灣對外投資。年度美元額未經通膨、GDP
          或匯率調整。
        </p>
      </details>
    </Frame>
  );
}

export function CommitmentChart() {
  const [i, setI] = useState(4);
  const c = commitments[i];
  return (
    <Frame
      label="未來布局 / 各次宣布的累計計畫"
      title="從一座廠，到 2,650 億美元的美國布局"
    >
      <p className="cc-note">多年投資總額・單位：十億美元・不是每年實支</p>
      <svg
        viewBox="0 0 760 320"
        role="img"
        aria-label="2020至2026年台積電對美投資計畫擴大曲線"
      >
        <line
          x1="52"
          x2="694"
          y1="280"
          y2="280"
          stroke="currentColor"
          opacity=".2"
        />
        <polyline
          points={path(
            commitments.map((r) => r.total),
            280,
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
        {commitments.map((r, n) => (
          <g key={r.date}>
            <circle
              cx={52 + (n / 4) * 642}
              cy={280 - (r.total / 280) * 230}
              r={i === n ? 6 : 4}
              fill="currentColor"
            />
            <text
              x={52 + (n / 4) * 642}
              y={264 - (r.total / 280) * 230}
              textAnchor="middle"
              fontSize="15"
              fill="currentColor"
            >
              {n === 2 ? "≥65" : r.total}
            </text>
            <text
              x={52 + (n / 4) * 642}
              y="310"
              textAnchor="middle"
              fontSize="12"
              fill="currentColor"
            >
              {r.date}
            </text>
          </g>
        ))}
      </svg>
      <div className="cc-presets">
        {commitments.map((r, n) => (
          <button key={r.date} aria-pressed={i === n} onClick={() => setI(n)}>
            {r.date}
          </button>
        ))}
      </div>
      <div className="cc-inset" aria-live="polite">
        <span className="cc-kicker">{`${c.date} / ${c.delta}`}</span>
        <div className="cc-big">
          {c.totalLabel}
          <span> 美元</span>
        </div>
        <p>{c.detail}</p>
        <a href={c.source}>當次官方公告</a>
      </div>
      <p className="cc-note">
        各點按宣布順序等距排列。新總額涵蓋舊承諾，不再加總；金額增加也不等於產能等比例增加。
      </p>
    </Frame>
  );
}

export function CapabilitySimulator() {
  const [tw, setTw] = useState(20);
  const [over, setOver] = useState(80);
  const id = useId();
  const a = Array.from({ length: 11 }, (_, n) => 100 + (tw * n) / 10),
    b = Array.from({ length: 11 }, (_, n) => 100 + (over * n) / 10);
  const share = ((100 + tw) / (200 + tw + over)) * 100;
  return (
    <Frame
      label="條件模擬 / 不是實測或預測"
      title="同樣是海外成長，台灣可以走向兩個未來"
    >
      <div className="cc-presets">
        {[
          { label: "一起變強", tw: 20, over: 80 },
          { label: "境內收縮", tw: -20, over: 80 },
          { label: "台灣再加速", tw: 80, over: 20 },
        ].map((p) => (
          <button
            key={p.label}
            aria-pressed={tw === p.tw && over === p.over}
            onClick={() => {
              setTw(p.tw);
              setOver(p.over);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="cc-legend">
        <span>
          <i className="cc-line-key" />
          台灣境內能力
        </span>
        <span>
          <i className="cc-line-key dashed" />
          海外能力
        </span>
      </div>
      <svg
        viewBox="0 0 760 330"
        role="img"
        aria-label={`示意雙線：台灣能力從100變為${100 + tw}，海外從100變為${100 + over}`}
      >
        <line
          x1="52"
          x2="694"
          y1={280 - (100 / 260) * 230}
          y2={280 - (100 / 260) * 230}
          stroke="currentColor"
          opacity=".15"
        />
        <polyline
          points={path(a, 260)}
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
        />
        <polyline
          points={path(b, 260)}
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray="8 6"
          opacity=".55"
          fill="none"
        />
        <text x="52" y="310" fontSize="14" fill="currentColor">
          起點：雙方均為 100
        </text>
        <text
          x="694"
          y="310"
          textAnchor="end"
          fontSize="14"
          fill="currentColor"
        >
          情境終點
        </text>
        <text
          x="710"
          y={285 - ((100 + tw) / 260) * 230}
          fontSize="14"
          fill="currentColor"
        >
          {100 + tw}
        </text>
        <text
          x="710"
          y={285 - ((100 + over) / 260) * 230}
          fontSize="14"
          fill="currentColor"
        >
          {100 + over}
        </text>
      </svg>
      <div className="cc-sliders">
        {[
          { key: "tw", label: "台灣境內能力變化", value: tw, set: setTw },
          { key: "over", label: "海外能力變化", value: over, set: setOver },
        ].map((s) => (
          <label htmlFor={`${id}-${s.key}`} key={s.key}>
            <span>
              {s.label}
              <strong>{`${s.value > 0 ? "+" : ""}${s.value}%`}</strong>
            </span>
            <input
              id={`${id}-${s.key}`}
              type="range"
              min={s.key === "tw" ? -50 : 0}
              max="150"
              step="5"
              value={s.value}
              onChange={(e) => s.set(Number(e.target.value))}
            />
          </label>
        ))}
      </div>
      <div className="cc-inset" aria-live="polite">
        <strong>
          {tw < 0
            ? "台灣境內能力收縮"
            : over > tw
              ? "台灣變強，但相對份額下降"
              : over === tw
                ? "相對份額維持，境內能力看絕對增量"
                : "台灣能力與相對份額一起提升"}
        </strong>
        <p>
          {`台灣份額由 50% 變為 ${f(share)}%。${
            tw < 0
              ? "這才接近需要追查的替代情境。"
              : over > tw
                ? "份額變小，不代表本地能做的事情變少。"
                : "這種情境下，本地能力並未被海外擴張替代。"
          }`}
        </p>
      </div>
      <p className="cc-note">
        兩條線以線性插值畫出假設的起點與終點；中間路徑未經估計，沒有指定發生年份。
      </p>
    </Frame>
  );
}

const evidence = [
  {
    name: "資本",
    en: "Money",
    status: "差距擴大",
    metric: "3.86 倍",
    desc: "2026 前八月對外／來台核准額；不是戰略 FDI 比。",
    next: "追到實際執行及最終用途。",
    source: sources.outward,
    kind: "observed",
  },
  {
    name: "產能",
    en: "Capacity",
    status: "海外擴建已啟動",
    metric: "N4 已量產",
    desc: "美國首廠已量產；台灣也持續建置前沿產能。",
    next: "比較同節點有效產能與台灣新增量。",
    source: "https://www.tsmc.com/static/abouttsmcaz/index.htm",
    kind: "observed",
  },
  {
    name: "核心能力",
    en: "Capability",
    status: "有計畫，移轉待查",
    metric: "研發＋封裝",
    desc: "美國研發、封裝列入計畫；未證實核心研發已遷移。",
    next: "首次量產、核心人才、獨立研發所在地。",
    source: "https://pr.tsmc.com/english/news/3210",
    kind: "pending",
  },
  {
    name: "收益",
    en: "Rent",
    status: "缺完整分配資料",
    metric: "留台多少？",
    desc: "尚不能由營收或市值推算境內增加值及超額收益。",
    next: "薪資、稅收、IP、增加值分配。",
    source: null,
    kind: "unknown",
  },
  {
    name: "替代",
    en: "Replacement",
    status: "尚未證實",
    metric: "能否轉單？",
    desc: "海外有廠，不代表已有同成本、良率與規模的替代。",
    next: "客戶是否出現可商業化的轉單選擇。",
    source: null,
    kind: "unknown",
  },
  {
    name: "總體回饋",
    en: "Macro",
    status: "長期停滯未證實",
    metric: "衝擊有傳導？",
    desc: "本文尚未證實產業衝擊已造成信用、投資與生產力持續惡化。",
    next: "實質薪資、非 ICT 生產力、金融曝險。",
    source: null,
    kind: "unknown",
  },
];
export function Monitor() {
  const [selected, setSelected] = useState(0);
  const e = evidence[selected];
  return (
    <Frame
      id="evidence-dashboard"
      label="台灣產業預警儀表板 / 證據截至 2026.10.04"
      title="錢已在移動。其餘五層，走到哪裡？"
    >
      <p>
        兩項有觀察紀錄，一項有未來計畫，三項仍待驗證。這是證據盤點，不是風險分數。
      </p>
      <div className="cc-dashboard">
        {evidence.map((e, i) => (
          <button
            key={e.en}
            onClick={() => setSelected(i)}
            aria-pressed={selected === i}
            className={`cc-evidence ${e.kind}`}
          >
            <span className="cc-kicker">{e.en}</span>
            <span className="cc-card-head">
              {e.name}
              <span className="cc-status">{e.status}</span>
            </span>
            <strong>{e.metric}</strong>
            <span className="cc-card-desc">{e.desc}</span>
          </button>
        ))}
      </div>
      <div className="cc-inset" aria-live="polite">
        <strong>{`${e.name}的下一個關鍵證據`}</strong>
        <p>{e.next}</p>
        {e.source && <a href={e.source}>查看已知紀錄的官方來源</a>}
      </div>
      <p className="cc-note">
        「待驗證」不等於安全；「有計畫」也不等於已完成能力替代。各層不能相加成危機機率。
      </p>
    </Frame>
  );
}

const clockScenarios = [
  {
    label: "目前證據",
    angle: 120,
    title: "產能布局重組期",
    text: "海外產能已落地與擴建；台灣境內能力收縮、可替代性及長期停滯尚未證實。",
    type: "當前盤點",
  },
  {
    label: "假設替代成形",
    angle: 240,
    title: "產業替代警戒期",
    text: "如果台灣核心能力停滯或收縮，海外又能提供可商業替代，警訊才會往金融與所得的回饋推進。",
    type: "條件情境，非預測",
  },
  {
    label: "假設台灣再加速",
    angle: 60,
    title: "時鐘可以逆轉",
    text: "若台灣研發、首次量產、人才與新產業持續增長，海外布局可成為全球擴張的力量。",
    type: "條件情境，非預測",
  },
];
export function LostDecadesClock() {
  const [scenario, setScenario] = useState(0);
  const [now, setNow] = useState(new Date("2026-10-04T00:00:00+08:00"));
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const days = Math.max(
    0,
    Math.ceil(
      (new Date("2031-01-01T00:00:00+08:00").getTime() - now.getTime()) /
        86400000,
    ),
  );
  const years = Math.floor(days / 365),
    rest = days % 365;
  const s = clockScenarios[scenario];
  const theta = ((s.angle - 90) * Math.PI) / 180;
  return (
    <Frame
      id="policy-clock"
      label="失落三十年倒數鐘 / 倒數的是政策窗口"
      title="我們還有多久，能改寫這個故事？"
    >
      <div className="cc-clock-layout">
        <svg
          viewBox="0 0 360 350"
          role="img"
          aria-label={`風險階段示意鐘，目前顯示${s.title}，不是危機發生日期或風險百分比`}
        >
          {Array.from({ length: 60 }, (_, n) => {
            const a = ((n * 6 - 90) * Math.PI) / 180;
            const r = n % 5 === 0 ? 119 : 125;
            return (
              <line
                key={n}
                x1={180 + Math.cos(a) * r}
                y1={168 + Math.sin(a) * r}
                x2={180 + Math.cos(a) * 132}
                y2={168 + Math.sin(a) * 132}
                stroke="currentColor"
                opacity={n % 5 === 0 ? 0.6 : 0.18}
              />
            );
          })}
          {[
            "長期停滯",
            "資本流向",
            "海外產能",
            "核心能力",
            "商業替代",
            "總體回饋",
          ].map((l, n) => {
            const a = ((n * 60 - 90) * Math.PI) / 180;
            return (
              <text
                key={l}
                x={180 + Math.cos(a) * 151}
                y={173 + Math.sin(a) * 151}
                textAnchor="middle"
                fontSize="12"
                fill="currentColor"
              >
                {l}
              </text>
            );
          })}
          <line
            x1="180"
            y1="168"
            x2={180 + Math.cos(theta) * 90}
            y2={168 + Math.sin(theta) * 90}
            stroke="currentColor"
            strokeWidth="3"
          />
          <circle cx="180" cy="168" r="6" fill="currentColor" />
          <text
            x="180"
            y="226"
            textAnchor="middle"
            fontSize="11"
            fill="currentColor"
          >
            階段示意・非機率
          </text>
        </svg>
        <div className="cc-clock-digital">
          <span className="cc-kicker">距 2030 年底觀察節點</span>
          <div className="cc-countdown">
            <strong>{years}</strong>
            <span>年</span>
            <strong>{rest}</strong>
            <span>天</span>
          </div>
          <p>
            2030
            年底是本文設定的檢查點，參照亞利桑那後續廠的公開量產目標。不是台灣衰退的起算日。
          </p>
          <span className="cc-kicker">{s.type}</span>
          <h4>{s.title}</h4>
          <p aria-live="polite">{s.text}</p>
        </div>
      </div>
      <div className="cc-presets">
        {clockScenarios.map((s, i) => (
          <button
            key={s.label}
            aria-pressed={scenario === i}
            onClick={() => setScenario(i)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="cc-note">
        年以 365
        天換算、日期以台北時間計。鐘面是本文的條件推演：沒有倒數至「危機日」，也沒有宣稱各階段必然依序發生。
      </p>
    </Frame>
  );
}

export function PairComparison() {
  const [i, setI] = useState(0);
  const pairs = [
    {
      label: "美國",
      past: "日本 ↔ 美國",
      now: "台灣 ↔ 美國",
      old: "市場、協議與產品競爭同時發生。美國的設計、邏輯與設備能力，也不同於日本 DRAM 的競爭位置。",
      current:
        "美國推動製造、封裝與研發在地化。台灣企業在美國的廠，仍須區別企業所有權與能力所在地。",
    },
    {
      label: "韓國",
      past: "日本 ↔ 韓國",
      now: "台灣 ↔ 韓國",
      old: "韓國在 DRAM 的競爭，需要分開觀察技術授權、人才、財閥投資、政策，以及日本供應商。",
      current:
        "晶圓代工有直接競爭；HBM 又是重要互補。不能把合作供應鏈全當成搶生意。",
    },
    {
      label: "台灣／日本",
      past: "日本 ↔ 台灣",
      now: "台灣 ↔ 日本",
      old: "台灣的專業代工、封測與設計生態系，亦來自工研院、外部技術與商業模式創新。",
      current: "日本可能同時是合作夥伴、產能承接地與潛在替代能力的培育地。",
    },
  ];
  const p = pairs[i];
  return (
    <Frame label="歷史對照 / 點選三條邊" title="不是一個對手，而是一個競爭網絡">
      <div className="cc-presets">
        {pairs.map((p, n) => (
          <button key={p.label} aria-pressed={i === n} onClick={() => setI(n)}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="cc-pair-grid">
        <div>
          <span className="cc-kicker">1980–2000</span>
          <h4>{p.past}</h4>
          <p>{p.old}</p>
        </div>
        <div>
          <span className="cc-kicker">2015–2026</span>
          <h4>{p.now}</h4>
          <p>{p.current}</p>
        </div>
      </div>
      <p className="cc-note">
        比較機制，不把三條相關的邊當作三份獨立證明。完整歷史雙向 FDI
        與同產品市占，仍待重建。
      </p>
    </Frame>
  );
}

export function GeographyChart() {
  return (
    <Frame label="統計口徑" title="資金登記地，不等於工廠所在地">
      <div className="cc-region-list">
        {regions.map((r) => (
          <div key={r.name}>
            <span>{r.name}</span>
            <span>{`${f((r.value / partial.out) * 100)}%`}</span>
          </div>
        ))}
      </div>
      <p className="cc-note">
        2026 前八月對外核准額；<a href={sources.outward}>經濟部按地區統計</a>
        。多層控股與最終用途須另行追蹤。
      </p>
    </Frame>
  );
}

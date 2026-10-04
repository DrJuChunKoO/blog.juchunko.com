// Unit: US$ billion. Approval statistics, NOT balance-of-payments flows.
// 2016–2024: SEF compilation of MOEA DIR statistics, retrieved 2026-10-04.
// 2025–2026: MOEA EE521 latest tables; 2025 outward revised by US$104,000
// from SEF's earlier snapshot. Do not silently mix approval and execution.
export const investment = [
  { year: 2016, out: 12.123094, in: 11.037061, china: 9.670732 },
  { year: 2017, out: 11.573208, in: 7.513192, china: 9.248862 },
  { year: 2018, out: 14.294562, in: 11.440234, china: 8.49773 },
  { year: 2019, out: 6.851155, in: 11.195975, china: 4.17309 },
  { year: 2020, out: 11.805105, in: 9.144336, china: 5.906489 },
  { year: 2021, out: 12.599132, in: 7.476273, china: 5.863173 },
  { year: 2022, out: 9.962282, in: 13.303265, china: 5.046755 },
  { year: 2023, out: 23.577239, in: 11.254769, china: 3.036819 },
  { year: 2024, out: 44.931956, in: 7.858118, china: 3.654259 },
  { year: 2025, out: 38.432367, in: 11.392819, china: 1.49887 },
];
export const partial = {
  period: "2026 年 1–8 月",
  out: 62.39673,
  in: 16.170879,
};
export const regions = [
  { name: "亞洲", value: 3.834969 },
  { name: "北美", value: 23.756202 },
  { name: "歐洲", value: 1.428453 },
  { name: "中南美洲", value: 32.433366 },
  { name: "大洋洲", value: 0.317102 },
  { name: "非洲", value: 0.626636 },
];
export const sources = {
  history: "https://www.seftb.org/cp-1009-1494-ba483-1.html",
  outward: "https://service.moea.gov.tw/EE521/common/Common.aspx?code=H&no=2",
  inward: "https://service.moea.gov.tw/EE521/common/Common.aspx?code=H&no=6",
};
// Cumulative announced US plans: snapshots, not annual investment flows.
export const commitments = [
  {
    date: "2020.05",
    total: 12,
    totalLabel: "約 120 億",
    delta: "起始計畫",
    detail: "亞利桑那第一座先進晶圓廠；原宣布支出期間為 2021–2029。",
    source: "https://pr.tsmc.com/english/news/2033",
  },
  {
    date: "2022.12",
    total: 40,
    totalLabel: "約 400 億",
    delta: "規模上修",
    detail: "新增第二座晶圓廠；兩廠合計約 400 億美元。",
    source: "https://pr.tsmc.com/english/news/2977",
  },
  {
    date: "2024.04",
    total: 65,
    totalLabel: "超過 650 億",
    delta: "規模上修",
    detail:
      "規劃第三座晶圓廠，並公布 CHIPS 初步補助條件。圖示以 650 億為下限。",
    source: "https://pr.tsmc.com/english/news/3122",
  },
  {
    date: "2025.03",
    total: 165,
    totalLabel: "1,650 億",
    delta: "再增加 1,000 億",
    detail:
      "新增三座晶圓廠、兩座先進封裝設施及一座主要研發中心；台積電與川普政府皆宣布。",
    source: "https://pr.tsmc.com/english/news/3210",
  },
  {
    date: "2026.07",
    total: 265,
    totalLabel: "2,650 億",
    delta: "再增加 1,000 億",
    detail:
      "新增四座先進製造／封裝設施，政府公告合計 12 座此類設施；屬多年總計畫。",
    source:
      "https://www.nist.gov/news-events/news/2026/07/trump-administration-secures-additional-100-billion-us-semiconductor",
  },
];
// JETRO 2002 White Paper, Fig. I-9 (printed page 14), Ministry of Finance
// historical administrative statistics; fiscal years starting April 1.
// Unit converted from US$ million to US$ billion. Not BoP net-flow series.
export const japanInvestment = [
  { year: 1980, out: 4.693, in: 0.299 },
  { year: 1981, out: 8.932, in: 0.432 },
  { year: 1982, out: 7.703, in: 0.749 },
  { year: 1983, out: 8.145, in: 0.813 },
  { year: 1984, out: 10.155, in: 0.493 },
  { year: 1985, out: 12.217, in: 0.93 },
  { year: 1986, out: 22.32, in: 0.94 },
  { year: 1987, out: 33.364, in: 2.214 },
  { year: 1988, out: 47.022, in: 3.243 },
  { year: 1989, out: 67.54, in: 2.861 },
  { year: 1990, out: 56.911, in: 2.778 },
  { year: 1991, out: 41.584, in: 4.339 },
  { year: 1992, out: 34.138, in: 4.084 },
  { year: 1993, out: 36.025, in: 3.078 },
  { year: 1994, out: 41.051, in: 4.155 },
  { year: 1995, out: 50.694, in: 3.837 },
  { year: 1996, out: 48.02, in: 6.841 },
  { year: 1997, out: 53.972, in: 5.527 },
  { year: 1998, out: 40.747, in: 10.469 },
  { year: 1999, out: 66.694, in: 21.51 },
  { year: 2000, out: 48.58, in: 28.276 },
];
export const japanSource =
  "https://www.jetro.go.jp/ext_images/en/reports/white_paper/2002.pdf";

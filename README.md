# DrJuChunKo Blog

本倉庫使用 **[Astro](https://astro.build/)** 建置，並透過 [Content Collections](https://docs.astro.build/en/guides/content-collections/) 管理多語系文章（Markdown / MDX）。

> 本專案基於 Astro 官方範例 [withastro/astro examples/blog](https://github.com/withastro/astro/tree/latest/examples/blog) 進行二次開發。

下方說明將帶你：

1. 建立/編輯一般文章 (Blog Post)
2. 建立/編輯日誌 (Journal) 文章
3. 新增作者 (Author) 與分類 (Category)
4. 上傳圖片與引用
5. 本地啟動與預覽

---

## 1. 專案結構

```text
src/
├── components/           # 可重複使用的 UI 元件
│   └── Journal.tsx       # 日誌圖片輪播元件
├── content/              # 內容主目錄
│   ├── blog/             # 文章 (Markdown / MDX)
│   │   ├── en/           # 英文
│   │   └── zh/           # 中文
│   ├── authors/          # 作者資料 (JSON)
│   └── categories/       # 分類資料 (JSON)
├── layouts/              # 文章版面
└── pages/                # 路由 (自動產生)
public/
└── images/               # 所有靜態圖片 (含 og 圖)
```

---

## 2. 撰寫一般文章

### 2-1. 建立檔案

1. 依語系進入 `src/content/blog/en` 或 `src/content/blog/zh`。
2. 以 **slug** 為檔名建立 `.md` / `.mdx` 檔，例如：
   ```
   src/content/blog/zh/my-first-post.mdx
   ```

### 2-2. Frontmatter 結構

`src/content.config.ts` 中定義了下列欄位 (⚠ 必填、✨ 選填)：

```yaml
---
title: "⚠ 標題"
description: "⚠ 文章描述 (用於 SEO)"
pubDate: "⚠ 發佈日期 (YYYY-MM-DD)"
updatedDate: "✨ 更新日期 (YYYY-MM-DD)"
author: "⚠ 對應 authors/<id>.json"
heroImage: "⚠ 文章首圖路徑 (建議 1200×630)"
categories: ["⚠ 列表可多選", "對應 categories/<id>.json"]
---
```

> 若僅有單一分類也可直接寫成 `categories: "devlog"`，系統會自動轉成陣列。

### 2-3. 內容撰寫

- Markdown 語法皆可使用。
- 若需插入 React 元件 (如日誌) 請改用 **MDX** 副檔名。
- 插入圖片：
  ```markdown
  ![替代文字](/images/path/to/file.jpg)
  ```

---

## 3. 撰寫日誌 (Journal)

日誌通常包含多張圖片及時間軸，建議使用 React 元件 `Journal`。

### 3-1. 檔案位置

```
src/content/blog/zh/journal/YYYY-MM-DD.mdx
```

### 3-2. Frontmatter 範例

```yaml
---
title: "寶博立院日誌 - 開議前一日"
description: "簡短描述"
pubDate: "2024-02-19"
heroImage: "/journal/20240219/IMG_1357.jpg"
author: "juchun-ko"
categories: ["legislative-diary"]
---
```

### 3-3. 使用 `Journal` 元件

```mdx
import Journal from "@/components/Journal";

<Journal
  client:only="react"
  title="上午 09:00"
  imgs={[
    { src: "/journal/20240219/IMG_1330.jpg" },
    { src: "/journal/20240219/IMG_1332.jpg" },
  ]}
>
  參加立法院新春團拜
</Journal>
```

- `title`：時間或段落標題
- `imgs`：圖片陣列，`src` 必填、`alt` 可選

---

## 4. 新增作者與分類

### 4-1. 作者

在 `src/content/authors/` 下新增 `<id>.json`，範例如下：

```json
{
  "name": { "en": "John Doe", "zh": "約翰‧多" },
  "avatar": "/images/authors/john.jpg",
  "bio": {
    "en": "English bio…",
    "zh": "中文簡介…"
  },
  "social": {
    "twitter": "https://twitter.com/john",
    "github": "https://github.com/john"
  }
}
```

### 4-2. 分類

在 `src/content/categories/` 下新增 `<id>.json`：

```json
{
  "name": { "en": "DevLog", "zh": "開發日誌" }
}
```

之後即可在文章 frontmatter 的 `categories` 寫入 `"devlog"`。

---

## 5. 上傳圖片

所有圖片放在 `public/` 內，網址即為檔案路徑。

- 文章首圖：`/images/<post>/og.jpg` (1200×630 最佳化社群分享預覽)。
- 內容圖片：自由放置，如 `/journal/20240219/IMG_1357.jpg`。

---

## 6. 本地開發

```bash
pnpm install      # 初次安裝
pnpm dev          # 啟動開發伺服器 http://localhost:4321
```

如需產生正式版：

```bash
pnpm build
pnpm preview      # 在本地測試 dist/
```

---

> 如果文件有任何錯誤或需要補充，歡迎直接發 PR！

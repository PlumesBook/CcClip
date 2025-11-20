# CcClip CapCut 風格編輯器 UI 重構方案（v1）

## 1. 背景與總體目標

- **目標**：在不推翻既有架構的前提下，最大程度復刻 CapCut Web Editor 的操作體驗與視覺框架，讓 CcClip 在布局、交互和視覺層級接近「幾乎無學習成本的 CapCut 替代品」。
- **約束**：
  - 保持現有路由和核心狀態（Pinia stores）對業務邏輯的兼容，盡量做到「UI 重構而非業務重構」。
  - 優先桌面端體驗（>= 1366×768），後續再考慮響應式與縮放。
- **哲學**：
  - 優先「消除特殊情況」而非「堆 if」，例如把空狀態、無軌道等都視爲 UI 正常狀態的一部分。
  - 「Never break userspace」：已有快捷鍵、導出流程、時間軸操作語義保持不變，只在視覺與交互細節上追趕 CapCut。

---

## 2. 目標界面：CapCut Editor 拆解

### 2.1 高層信息架構

從 DevTools 可訪問樹和實際操作觀察，CapCut Editor 的頂層信息架構可抽象爲：

- **全局層**：帳號、雲端工程管理、語言、系統設置（不納入本次重構重心）。
- **工程層（Project）**：單個視頻工程的編輯上下文，對應我們的 `Editor.vue`。
- **編輯器 5 區域**：
  - **頂部工具欄（Header）**：Logo、工程標題、基礎工具入口、導出按鈕、帳號區。
  - **左側資源面板（Sidebar/Resources）**：
    - 垂直主菜單：媒體、範本、元素、音訊、文字、字幕、轉錄稿、特效、轉場、濾鏡、品牌套件、外掛程式…
    - 對應右側的二級列表：當前類別的資源瀏覽與操作區。
  - **中間預覽畫布區（Canvas/Player）**：
    - 視頻畫面預覽、播放控制、空狀態提示（如「按一下以上傳或拖放到此處」）。
  - **右側屬性面板（Inspector/Attributes）**：
    - 針對當前選中軌道/素材/時間點的屬性編輯。
  - **底部時間軸（Timeline）**：
    - 時間刻度尺、播放頭、視頻/音頻/字幕等多條軌道，支持拖拽、縮放、對齊線等。

### 2.2 布局特徵

- **固定頭部 + 自適應內容**：Header 高度固定，其下整個 viewport 由「左側資源 + 中間畫布 + 右側屬性 + 底部時間軸」組成。
- **左右/上下分割可調**：
  - 左資源面板與中間畫布區的寬度比可調。
  - 右屬性面板寬度可調。
  - 中畫布區與底時間軸高度比可調。
- **深色主題 + 高對比重點色**：
  - 背景多爲接近黑色的灰階，搭配高亮青/藍作為主操作色。
- **空狀態是第一視圖**：
  - 在尚未導入任何素材時，畫布區與時間軸都展示極具引導性的空狀態文案與操作入口。

### 2.3 典型交互模式

- **拖拽優先**：拖拽媒體到時間軸，而非僅靠按鈕添加。
- **時間軸縮放**：`Ctrl/⌘ + 滾輪` 調整時間軸縮放。
- **選中驅動屬性**：
  - 當前選中素材/軌道決定右側屬性面板內容。
- **播放頭與時間同步**：
  - 點擊時間尺、拖動播放頭會同步更新畫布顯示與當前時間顯示。

---

## 3. 當前 CcClip 編輯器現狀梳理

### 3.1 技術棧與啓動

- **技術棧**：
  - Vue 3 + Vite
  - Pinia（`usePageState`, `useTrackState`, `usePlayerState` 等）
  - Element Plus（部分基礎組件與 Loading）
  - Tailwind CSS（`bg-cc-*`, `text-cc-*` 等自定義色板）
- **入口**：`src/main.ts`
  - 創建 `App`，註冊 Pinia、Router、Icon、FFmpeg 插件等。
- **根組件**：`src/App.vue`
  - `ElConfigProvider` 包裹 `RouterView`，提供全局 size/zIndex 配置。

### 3.2 編輯器頁布局結構

- **頁面組件**：`src/pages/views/Editor.vue`
  - 結構：
    - `HeaderContainer` — 頂部工具欄。
    - `ResourcesContainer` — 左側資源區，含主菜單與資源列表，支持收起狀態。
    - 中間區域：
      - `CanvasPlayer` — 畫布預覽區。
      - `AttributeContainer` — 右側屬性面板，寬度由 `pageStore.attrWidth` 控制，通過 `SplitLine` 調整。
    - 底部：`TrackContainer` — 時間軸容器，內部使用 `TrackList` 顯示具體軌道。

### 3.3 功能對應關係（現狀 vs CapCut）

- **Header**
  - `HeaderContainer.vue` 已有 Logo、標題、導出按鈕與導出對話框，與 CapCut header 結構高度對齊。
- **左側資源面板**
  - `ResourcesContainer.vue` + `MenuList.vue` + `ItemList.vue`：
    - 已具有垂直菜單與對應資源列表，且支持「隱藏二級面板」的折疊狀態（`store.hideSubMenu`）。
    - 與 CapCut 左側資源面板在信息架構上高度相似，只是在視覺與具體分類命名上存在差異。
- **中間畫布和播放器**
  - `CanvasPlayer.vue` + `Player.vue`：
    - 使用 `<canvas>` 播放畫面，提供空狀態提示（「點擊上傳素材」「或將文件拖拽到這裏」）與上傳入口，與 CapCut 的畫布空狀態高度一致。
- **右側屬性面板**
  - `AttributeContainer.vue`：
    - 使用 `import.meta.glob('@/data/options/*.ts')` 動態裝載屬性配置，根據選中資源類型動態渲染。
    - 目前有基礎頭部（「屬性」標題）和空狀態提示（「選中軌道以編輯屬性」）。
- **底部時間軸**
  - `TrackContainer.vue` + `TrackList.vue`：
    - 使用 `SplitLine` 控制時間軸高度（`page.trackHeight`）。
    - `TrackList` 已具備：時間尺、播放頭、拖拽添加素材、Ctrl/⌘+滾輪縮放時間軸、主/非主軌道區分等，與 CapCut 的行爲模型基本一致。

### 3.4 差異與不足（對齊 CapCut 的維度）

- **視覺層級與密度**：
  - 部分邊框、陰影、圓角、間距與 CapCut 存在差異，導致整體「密度感」和「深度感」略顯鬆散。
- **佈局可調性**：
  - 右屬性面板與底時間軸已可拖拽調整尺寸，但左資源面板寬度尚未統一進入同一 layout 系統管理。
- **交互細節**：
  - 部分 hover 狀態、高亮狀態、按鈕禁用/加載狀態未完全按照 CapCut 的交互節奏來設計。
- **狀態統一管理**：
  - `usePageState` 已承擔了部分 UI 佈局狀態（如 `attrWidth`, `trackHeight`, `hideSubMenu`），但沒有形成一個明確的「EditorLayout 狀態模型」。

---

## 4. 目標 UI 架構設計

### 4.1 布局層（Layout Layer）

**目標**：在不大改路由的情況下，明確 Editor 頁面的布局骨架，與 CapCut 的五區域對齊。

- **布局總覽**（以 `Editor.vue` 爲中心）：
  - `HeaderContainer` — 對齊 CapCut Header。
  - `.flex-row` 主體：
    - `ResourcesContainer` — 左側資源面板。
    - 右側主編輯區：
      - 上半部分：`CanvasPlayer`（畫布） + `AttributeContainer`（屬性）。
      - 下半部分：`TrackContainer`（時間軸）。
- **調整策略**：
  - 保留 `Editor.vue` 的結構不變，主要通過：
    - 精準調整 Tailwind 類（間距、高度、寬度）。
    - 補充/統一邊框與背景色 tokens。
    - 引入 layout 常量（如頭部高度、面板最小寬度）到單一地方管理（例如 `pageState` 或專門的 `useLayoutState`）。

### 4.2 狀態層（State Layer）

**現狀**：
- `usePageState`：保存頁面級 UI 狀態，如 `attrWidth`, `trackHeight`, `hideSubMenu` 等。
- `useTrackState`：時間軸與軌道相關邏輯。
- `usePlayerState`：播放器與畫布狀態，如 `frameCount`, `playerWidth/Height` 等。

**目標設計**：
- 在現有基礎上，明確「EditorLayout 狀態模型」：
  - `leftPanelWidth`：左側資源面板寬度（新增，支持拖拽）。
  - `rightPanelWidth`：右側屬性面板寬度（現有 `attrWidth`）。
  - `timelineHeight`：時間軸高度（現有 `trackHeight`）。
  - `resourcePanelCollapsed`：二級資源列表是否折疊（現有 `hideSubMenu`）。
- 優先方案：
  - 在 **不拆 store 名稱** 的前提下，直接擴展 `usePageState`，避免大範圍 API 變更。

### 4.3 設計系統層（Design System Layer）

- **顏色變量**：
  - 繼續沿用 `bg-cc-*`, `text-cc-*`, `border-cc-*` 等 Tailwind 自定義色板，對齊 CapCut 的：
    - 背景：接近 #0B0B0F~#111118 級別的暗色。
    - 邊框：更淺一級灰，保證面板邊緣清晰但不刺眼。
    - 主色：亮青色（類似 #00E5FF）用於主要 CTA 和關鍵高亮。
- **排版與間距**：
  - 全局字號偏小（`text-xs`, `text-sm` 爲主），提升密度與專業感。
  - 常用間距規則化：
    - 面板內邊距：`px-4 py-3`。
    - 列表行高：`h-8` 或 `h-9` 爲主，用於資源列表、時間線標尺等。
- **組件樣式統一**：
  - 統一按鈕風格：主操作使用亮青色實心按鈕（如導出），次要操作用細邊框 + 透明背景。
  - 對話框樣式與 `HeaderContainer` 中的導出對話框對齊，形成統一模式。

### 4.4 響應式與縮放策略

- **最小推薦分辨率**：
  - 在文檔與 UI 提示中建議至少 1366×768。
- **布局縮放優先級**：
  1. 優先縮放時間軸高度（下限爲 200px）。
  2. 再縮放左/右側面板寬度（保持畫布區不至於過窄）。
  3. 當寬度過小時，左資源面板可自動折疊爲更窄圖標列（保留 tooltip）。

---

## 5. 分模塊重構方案

### 5.1 全局 Shell 與 Header（`App.vue` + `HeaderContainer.vue`）

**目標**：
- 頂部頭部區與 CapCut 對齊：高度、背景色、分隔線、右側操作區密度。

**具體方案**：
- 在不改動路由結構的前提下：
  - `App.vue` 確保根容器始終佔滿 viewport（`w-full h-full flex flex-col` 已有）。
  - `HeaderContainer.vue`：
    - 固定高度：使用 Tailwind 保證一致 `h-12`。
    - 加強頂部邊界：`border-b border-cc-border` 已存在，可微調顏色與透明度。
    - 右側操作區：
      - 導出按鈕樣式與 CapCut 接近（已有亮青色 `ElButton`）。
      - 保留用戶頭像/帳號入口位置，爲後續帳號體驗預留空間。

### 5.2 左側資源面板（`ResourcesContainer.vue` + 子組件）

**目標**：
- 完全對齊 CapCut 式左側資源體驗：垂直圖標菜單 + 二級資源列表面板 + 折疊/展開行爲。

**現狀**：
- 已存在 `MenuList` 與 `ItemList`，數據源來自 `menuData`，並以 `usePageState.hideSubMenu` 控制折疊。

**改造要點**：
- **布局**：
  - 爲左側整體引入「可調寬度」：新增 `pageStore.leftPanelWidth` 或類似字段，並使用 `SplitLine` 垂直分割。
- **信息架構**：
  - 將 `menuData` 條目對齊 CapCut 類別名稱與排序（允許在數據層調整，不影響組件結構）。
- **交互**：
  - 折疊狀態下，僅保留圖標與 tooltip，模擬 CapCut 的「mini sidebar」。
  - 在資源列表空狀態下，加入與畫布/時間軸空狀態呼應的文案，形成一致 onboarding。

### 5.3 中央畫布區（`CanvasPlayer.vue` + `Player.vue`）

**目標**：
- 畫布區無論在空狀態還是播放狀態下，都與 CapCut 保持視覺層級、居中策略和交互一致。

**現狀**：
- `Player.vue` 已經有：
  - 居中的畫布 `<canvas>`。
  - 空狀態提示 + 上傳入口 + 文件拖拽提示。

**改造要點**：
- **畫布容器**：
  - 通過 `containerSize` + `CanvasPlayer` 中的 `updateContainerSize` 確保畫布始終在可用空間中最大化顯示，保留上下留白。
- **空狀態視覺**：
  - 按照 CapCut 的風格微調圖標大小、陰影和動畫，強化「按一下以上傳 / 拖拽上傳」的感知，避免與左資源區入口產生競爭。
- **層級管理**：
  - 空狀態層、播放控制層、實際畫布層，通過合理的 `z-index` 和 pointer-events 管理，確保交互路徑清晰。

### 5.4 右側屬性面板（`AttributeContainer.vue`）

**目標**：
- 與 CapCut 屬性面板對齊：清晰的標題、分組、折疊面板、滑桿/輸入框的對齊與密度。

**現狀**：
- 動態載入配置，符合「配置驅動屬性表單」的方向，對後續擴展友好。

**改造要點**：
- **布局與樣式**：
  - 固定標題區高度（如 `h-10 px-4`），邊框與背景色統一。
  - 屬性表單區使用 `px-3 py-4` 作為內邊距，列表間距適度收緊。
- **配置驅動 UI 模型**：
  - 在 `@/data/options/*.ts` 中補充字段，指定控件類型、分組、折疊邏輯等，便於構建更接近 CapCut 的屬性面板。

### 5.5 底部時間軸（`TrackContainer.vue` + `TrackList.vue` 等）

**目標**：
- 使用現有的邏輯基礎，對齊 CapCut 的視覺節奏與交互細節。

**現狀**：
- 時間軸已經支持：
  - 播放頭、時間尺、拖拽添加素材。
  - Ctrl/⌘ + 滾輪縮放（`handleWheel` + `setScale`）。
  - 滾動同步 `startX`, `startY` 等。

**改造要點**：
- **空狀態**：
  - 已有「將素材拖拽到這裏，開始編輯你的大作吧~」提示，可在視覺上向 CapCut 靠攏（色彩、圖標風格）。
- **軌道樣式**：
  - 統一軌道行高、左右 padding，對齊 CapCut 的軌道密度。
  - 爲主軌道與輔助軌道設置更明顯的視覺區別（背景/邊框輕微差異）。
- **縮放與捲動體驗**：
  - 確認在高縮放倍率下依然保持線條與文本可讀。

---

## 6. 漸進式改造路線（避免大爆炸）

### 階段 0：建立「EditorLayout 協議」

- 在文檔中約定：
  - 編輯器至少包含五區域：Header, LeftSidebar, Canvas, Inspector, Timeline。
  - 其尺寸由統一的 layout 狀態控制（`pageState`）。
- 僅整理與補充 `usePageState` 中的字段，不改任何組件邏輯。

### 階段 1：統一路徑與樣式基調

- 調整全局色板與字體大小，使當前界面在不更改結構的情況下，視覺更接近 CapCut。
- 收斂 Header、面板、時間軸的邊框與背景色，形成統一的「深色工作臺」。

### 階段 2：左資源面板升級

- 爲 `ResourcesContainer` 引入可調寬度與 mini 折疊模式。
- 對齊 CapCut 菜單順序與命名；補充缺失類別時，優先僅在 UI 上掛出入口，後續再逐步補數據能力。

### 階段 3：畫布區與空狀態打磨

- 精修 `Player.vue` 的空狀態與畫布居中策略。
- 確保在不同 layout 尺寸下，畫布仍保持合理的安全區域與最大可見範圍。

### 階段 4：屬性面板配置化收斂

- 梳理 `@/data/options/*.ts`，定義統一的屬性控件模型。
- 首先讓 UI 完全對齊 CapCut 的分組與控件形態，再迭代具體屬性內容。

### 階段 5：時間軸視覺與交互微調

- 在不動核心邏輯的前提下，細化軌道顏色、邊框、選中狀態與對齊輔助線的視覺強度。
- 確保 `Ctrl/⌘ + 滾輪`、拖拽、捲動等操作在視覺上有清晰反饋。

---

## 7. 風險與「不破壞用戶空間」策略

- **風險 1：既有使用者習慣被打斷**
  - 緩解：避免修改已有快捷鍵、播放/導出流程，只優化視覺與交互提示。
- **風險 2：布局調整導致狀態錯亂**
  - 緩解：
    - 所有尺寸相關狀態集中在 `usePageState` 管理。
    - 在每次調整前後增加嚴格測試用例與手動驗證場景。
- **風險 3：與后端/FFmpeg 任務耦合**
  - 緩解：
    - UI 重構過程中不更改 `useVideoExport`、`FFManager` 及相關服務 API，只優化 Loading 與進度顯示方式。

---

## 8. 後續可擴展方向

- 插件/外掛區域：對齊 CapCut 的「外掛程式」面板，在左資源區預留入口，後續可掛載第三方能力。
- 模板市場：將現有素材與模板通過配置化方式展示，逐步增加模板生態。
- 多語系：CapCut 風格本身即面向全球，用戶界面後續可抽象爲 i18n 文案，實現中/英/其他語言切換。

---

> 本方案僅定義 UI 架構與重構路線，不觸碰具體業務邏輯與數據流實現。後續每一階段在落地時，需配合具體設計稿與交互細節再進行微調與驗證。

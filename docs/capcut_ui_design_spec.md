# CapCut Desktop UI 设计规范与分析报告

## 1. 设计哲学 (Design Philosophy)
**"内容为王，工具隐身"**
CapCut 的桌面端设计采用了极致的沉浸式暗黑风格。所有的 UI 元素都为了突显视频内容本身而服务。视觉层级清晰，操作逻辑符合非线性编辑（NLE）的直觉。

## 2. 色彩系统 (Color System)

### 背景色 (Backgrounds)
*   **Global Background**: `#121212` (深邃黑，用于应用底色)
*   **Panel Background**: `#1E1E1E` (面板背景，如侧边栏、属性面板)
*   **Component Background**: `#2C2C2C` (输入框、未选中轨道等)
*   **Hover/Active Background**: `#383838` (悬停或次级激活态)

### 品牌色 (Brand Colors)
*   **Primary Cyan**: `#5DE2C2` - `#00E5FF` (渐变或高亮色，用于主要按钮、选中边框、时间轴滑块)
    *   *注：截图中 Export 按钮显示为蓝色系 `#369EFF` 或相近，部分 UI 元素使用标志性的青色。需统一为 Element Plus 的 Primary 变量。*
*   **Action Blue**: `#2D8CF0` (导出按钮等强引导操作)

### 文字色 (Typography)
*   **Text Primary**: `#FFFFFF` (主要标题、按钮文字)
*   **Text Secondary**: `#A3A3A3` (次要标签、未选中状态)
*   **Text Disabled**: `#505050`

## 3. 布局架构 (Layout Architecture)
界面采用经典的 **"三栏式 + 底部时间轴"** 布局，各区域通过细微的分割线或背景色差区分。

### A. 顶部导航栏 (Header) - `h-12` (约 48px)
*   左侧：品牌标识 / 空间名称。
*   中间：项目名称、状态指示。
*   右侧：撤销/重做、缩放比例、布局切换、用户头像、**Export (导出)** 按钮。

### B. 左侧资源区 (Left Sidebar & Drawer)
1.  **一级导航 (Primary Nav)**:
    *   宽约 `60px`。
    *   垂直排列图标 + 文字 (Media, Audio, Text, Sticker, Effects...)。
    *   状态：选中时高亮，可能有左侧或底部指示条。
2.  **二级资源面板 (Secondary Drawer)**:
    *   宽约 `300px`。
    *   顶部搜索框 + 筛选器。
    *   内容区：Grid 布局 (素材) 或 List 布局 (音乐/文字)。
    *   分类 Tabs：推荐、收藏、具体类别。

### C. 中间预览区 (Player / Canvas)
*   占据核心视觉区域。
*   包含播放控制条 (Play, Pause, Timecode, Duration)。
*   画布支持拖拽、缩放、参考线吸附。

### D. 右侧属性面板 (Property Panel)
*   宽约 `300px - 350px`。
*   Context-sensitive (根据选中对象变化)。
*   Tabs 切换：Video, Audio, Speed, Animation, Adjustment。
*   控件密集：Sliders, Toggle Switches, Dropdowns, Number Inputs。

### E. 底部时间轴 (Timeline)
*   **工具栏**: 左上角包含 Split, Delete, Freeze, Reverse 等常用工具。
*   **轨道**:
    *   主视频轨道 (Main Track)。
    *   画中画/文字/音频轨道 (Overlay Tracks)。
    *   层级清晰，不同类型轨道有颜色区分（视频蓝/青，音频绿，文字橙）。
*   **指针 (Playhead)**: 垂直贯穿，顶部有把手。

## 4. 关键组件细节 (Component Specs)

### 按钮 (Buttons)
*   **Primary**: 圆角矩形 (Radius ~4px-6px)，实色背景 (Blue/Cyan)，白字。
*   **Secondary/Ghost**: 灰色背景或透明背景，Hover 变亮。
*   **Icon Button**: 无边框，Hover 显示背景色圆角。

### 轨道块 (Track Segments)
*   **圆角**: 小圆角 (2px - 4px)。
*   **缩略图**: 视频轨道显示连续缩略图。
*   **标签**: 顶部显示文件名。
*   **选中态**: 亮色边框 (Cyan/White) 高亮。

### 输入控件 (Inputs)
*   **Search Bar**: 圆角胶囊型或圆角矩形，左侧 Search Icon，深灰背景。
*   **Sliders**: 细轨道，圆形拖拽点 (Thumb)，拖拽时可能放大。

## 5. 给前端重构的建议 (Refactoring Notes)
1.  **Tailwind 配置**:
    *   扩展 `colors` 配置，预设 `bg-panel-dark`, `text-secondary-light` 等语义化变量。
    *   使用 `grid` 或 `flex` 实现响应式布局，确保中间 Canvas 自适应剩余空间。
2.  **Element Plus 定制**:
    *   完全覆盖 Element Plus 的默认亮色主题。
    *   Input, Select, Slider 组件需去重写 Border 和 Background 样式以融入暗黑风格。
3.  **状态管理**:
    *   左侧导航切换需联动二级面板内容。
    *   Timeline 选中物体需联动右侧属性面板。

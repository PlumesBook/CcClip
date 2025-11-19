# CapCut 复刻 UI 重构方案

## 1. 核心设计理念 (Philosophy)
- **沉浸式暗黑美学**: 摒弃繁杂的装饰，采用深灰与黑色的层次叠加，营造专业、专注的剪辑环境。
- **无干扰交互 (Invisible Interface)**: UI 仅在需要时凸显，内容（视频/轨道）永远是主角。
- **像素级还原**: 对标 CapCut Web 端，从圆角、阴影到动效，追求 1:1 的视觉体验。

## 2. UI 设计规范 (Design Spec)

### 2.1 色彩系统 (Color Palette)
基于 CapCut 风格的暗黑模式定义：

| 用途 | 色值 | 说明 |
| :--- | :--- | :--- |
| **背景 (Global Bg)** | `#121212` | 应用主背景色，极深灰 |
| **表面 (Surface)** | `#1D1D1F` | 侧边栏、属性面板背景 |
| **表面-亮 (Surface Light)** | `#252525` | 悬浮态、输入框背景 |
| **分割线 (Border)** | `#333333` | 模块间分割线 |
| **主色 (Primary)** | `#00E5FF` | (参考) 选中高亮、关键帧颜色 (CapCut 青) |
| **主色-蓝 (Primary Blue)** | `#3A7AF0` | 按钮、主要操作 (参考截图中的蓝色) |
| **文字-主 (Text Main)** | `#FFFFFF` | 主要信息 (Opacity 90%) |
| **文字-次 (Text Sub)** | `#8E8E8E` | 辅助信息 (Opacity 60%) |

### 2.2 布局架构 (Layout Architecture)
采用 **"左侧导航-中上预览-中下轨道-右侧属性"** 的经典布局。

```
+-----------------------------------------------------------------------+
| Header (48px) - Logo | Title | Export                                 |
+-----+-----------------+---------------------------+-------------------+
| Nav | Resource Panel  |      Player (Canvas)      |  Attribute Panel  |
| Bar | (Drawer)        |      (Flex-1)             |  (300px)          |
| (60)| (300px)         |                           |                   |
| px  |                 +---------------------------+                   |
|     |                 |      Toolbar (Action)     |                   |
|     |                 +---------------------------+                   |
|     |                 |      Timeline (Track)     |                   |
|     |                 |      (Height: 300px+)     |                   |
+-----+-----------------+---------------------------+-------------------+
```

### 2.3 关键组件设计

1.  **Header**:
    *   高度压缩至 48px-54px。
    *   左侧: Logo + 项目名称 (可编辑)。
    *   右侧: 用户头像 + 醒目的 "Export" 按钮 (渐变蓝/纯色蓝)。

2.  **Resources (Left)**:
    *   **一级导航 (Nav Bar)**: 垂直排列的图标 (Media, Audio, Text, etc.)。选中高亮。
    *   **二级面板 (Drawer)**: 紧贴导航栏，展示具体素材列表。支持 Grid/List 切换。

3.  **Player (Center)**:
    *   背景纯黑或深灰格纹 (透明背景)。
    *   视频区域居中，四周留白。
    *   底部控制条悬浮或固定。

4.  **Timeline (Bottom)**:
    *   时间轴标尺 (Ruler) 优化刻度密度。
    *   轨道 (Track) 增加圆角 (Rounded-md)，不同类型轨道颜色区分。
    *   指针 (Cursor) 样式优化，增加 "吸附" 效果感。

5.  **Attributes (Right)**:
    *   Tab 切换 (Video/Audio/Speed/Animation)。
    *   表单控件 (Slider, Input, Switch) 样式完全重写，覆盖 Element Plus 默认样式。

## 3. 最佳实现方案 (Implementation Scheme)

### 3.1 技术栈调整
- **Tailwind CSS**: 作为主力样式引擎，配置 `tailwind.config.js` 扩展颜色和间距。
- **Element Plus**: 仅保留复杂交互组件 (Slider, Dialog, Input)，但通过 CSS Variable 和 Deep Selector 彻底覆盖其样式。
- **Icons**: 引入 `@iconify-json/ph` (Phosphor Icons) 或 `@iconify-json/mingcute`，风格更接近 CapCut。

### 3.2 重构步骤 (Step-by-Step)

#### 第一阶段：基础设施 (Infrastructure)
1.  **配置 Tailwind**: 定义 `colors.cc-bg`, `colors.cc-surface`, `colors.cc-primary` 等变量。
2.  **全局样式重置**: 在 `main.css` 中强制设置 `body { background: #121212; color: #fff; }`，并重写 Element Plus 的 `--el-color-primary` 等 CSS 变量。

#### 第二阶段：布局修复 (Layout Fix)
1.  修复 `src/pages/views/Editor.vue` 中的 `flex-nowrapf` 拼写错误。
2.  重组 Grid/Flex 结构，使其符合上述布局架构。

#### 第三阶段：模块化重构 (Component Refactor)
1.  **ResourcesContainer**: 拆分为 `SideNavBar.vue` (图标栏) 和 `ResourceList.vue`。
2.  **HeaderContainer**: 去除多余边框，优化按钮样式。
3.  **TrackContainer**: 优化轨道渲染样式，增加可视区域对比度。
4.  **AttributeContainer**: 扁平化设计，移除卡片式阴影，改为分割线分隔。

#### 第四阶段：细节打磨 (Polish)
1.  **滚动条**: 使用 Webkit 伪类隐藏或美化滚动条 (Slim Scrollbar)。
2.  **动效**: 增加 Hover 态的微交互 (Transition-all)。

## 4. 预期成果
- 获得 200万美元 融资（如您所言）。
- 打造出市面上最接近原生体验的 Web 视频剪辑器 UI。

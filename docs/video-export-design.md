# 离线帧渲染 + 视频导出设计文档

> 版本：v0.1（设计 + 实现说明：阶段 1-3 已完成，阶段 4 暂未实施）  
> 范围：基于当前 CcClip 架构，在浏览器端完成离线帧渲染与 mp4 视频导出。

---

## 1. 目标与边界

### 1.1 目标

- 从**时间轴工程**导出一个 **mp4 视频文件**，满足：
  - 时间轴上的视频 / 图片 / 文本轨道按当前播放规则合成到画面中；
  - 音频来源于现有的音轨（视频+音频），尊重静音等属性；
  - 导出结果在常规播放器中可正常播放。
- 不依赖后端，完全在浏览器 + ffmpeg.wasm 内完成。

### 1.2 非目标（本版不做）

- 不追求实时导出速度，允许导出时间接近或大于视频时长；
- 不做复杂编码参数调整（码率、gop 等），使用一组固定、稳定的默认参数；
- 不在本版处理：滤镜 / 特效的 GPU 加速或更高级调色，仅复用现有 Canvas 渲染结果；
- 不考虑超长（> 5 分钟）、超高分辨率（> 1080p）的工程性能优化，本版以 Demo/demo 级工程为主。

---

## 2. 现有架构概览

### 2.1 轨道与时间轴

- `useTrackState`：
  - `trackList: TrackLineItem[]`：时间轴轨道列表；
  - `TrackItem` 统一表示 video/audio/text/image/effect/transition/filter 等条目；
  - 关键字段：`type, name, start, end, frameCount, offsetL, offsetR, ...`。
- `formatTrackItemData`：将素材数据（接口返回）格式化为轨道条目，确定 `start/end/time/frameCount` 等。

### 2.2 播放与画面渲染

- `usePlayerState`：
  - `frameCount`：工程总帧数；
  - `playerWidth/playerHeight`：输出画面逻辑尺寸（由视频轨初次出现时确定）；
  - `playStartFrame`：当前播放帧；
  - `playTargetTrackMap: Map`：当前帧需要参与渲染的 TrackItem 集合。
- `CanvasPlayer`（`canvasDraw.ts`）：
  - 负责基于 `playStartFrame` 和 `playTargetTrackMap`，将当前帧画面渲染到 `canvas`：
    - 从 ffmpeg FS 读视频帧：`ffmpeg.getFrame(name, frameIndex)`；
    - 读 GIF 帧：`ffmpeg.getGifFrame(name, frameIndex)`；
    - 文本按 `trackAttrMap[id]` 直接在 canvas 上绘制；
  - 内部有一个 `renderPlayer` 预渲染 canvas，再拷贝到真正的播放器 canvas。

> 现状：画面渲染是**实时、只存在于 Canvas 中**，没有持久化为图片或视频。

### 2.3 音频合成

- `ffmpegManager.getAudio(trackList, trackAttrMap)`：
  - 根据传入的 TrackItem 列表和属性（静音等）构造 ffmpeg 命令；
  - 使用 `mergeAudio`（在 `ffmpegCommand` 中定义）将多个音轨混合成一条音频文件；
  - 返回 `{ start, end, audioUrl }`，其中 `audioUrl` 为 Blob URL，可直接用于播放或下载。

> 现状：音频已经有完整的**离线合成 + 导出**能力，视频尚无离线合成管线。

---

## 3. 视频导出的总体方案

### 3.1 思路概述

1. **离线帧渲染（Frame Rendering）**
   - 在不影响 UI 播放的前提下，驱动 `CanvasPlayer` 按帧渲染整个工程：
     - 帧范围：`0 .. playerState.frameCount - 1`；
     - 每帧将 `renderPlayer` 或最终播放器 canvas 输出为一张图片（建议 PNG）；
     - 将图片写入 ffmpeg 虚拟 FS，形成 `frame-%06d.png` 序列。

2. **音频合成（Audio Mix）**
   - 复用已有 `ffmpegManager.getAudio(...)`，生成一条完整的音频文件（建议 aac 或 mp3）。

3. **音视频合成（Muxing）**
   - 在 ffmpeg.wasm 中执行命令，将帧序列视频 + 音频文件合成 mp4：
     - 视频编码：H.264（libx264），`-pix_fmt yuv420p`，保证兼容性；
     - 音频编码：aac；
     - 帧率：采用工程 fps（目前固定 30）。

4. **导出文件**
   - 从 ffmpeg FS 读取 `output.mp4`，封装成 Blob，生成 URL，触发浏览器下载。

### 3.2 约束条件与简化

- 帧率固定为 30fps（与 `baseFps` 对齐）。
- 输出分辨率采用 `playerState.playerWidth/playerHeight`，不再做额外缩放；
- 暂不支持工程导出时的区域裁剪（如只导出选区的一部分时间）。

---

## 4. 模块划分与改造点

### 4.1 新增导出服务层

- 文件建议：`src/services/exportVideo.ts`
- 职责：
  - 提供一个高层 API：`exportProjectToVideo(options)`；
  - 内部协调：
    - 帧渲染（调用 CanvasPlayer）
    - ffmpeg 写入帧序列 / 合成音频 / 合成视频
    - 进度汇报、错误处理、取消。

#### 4.1.1 API 草案

```ts
export interface ExportVideoOptions {
  /** 工程名称，用于默认文件名 */
  projectName?: string;
  /** 导出回调用于展示进度 */
  onProgress?: (info: {
    phase: 'prepare' | 'render-frames' | 'merge-audio' | 'merge-video' | 'done';
    progress: number; // 0-1
    currentFrame?: number;
    totalFrames?: number;
  }) => void;
  /** 是否允许用户取消 */
  signal?: AbortSignal;
}

export interface ExportVideoResult {
  fileName: string;
  blob: Blob;
}

export async function exportProjectToVideo(options: ExportVideoOptions): Promise<ExportVideoResult>;
```

### 4.2 Canvas 帧渲染接口

目标：在不破坏现有播放器逻辑的前提下，为离线导出提供“渲染指定帧到 canvas”的接口。

#### 4.2.1 设计思路

- 利用 `CanvasPlayer` 的能力，而不是重写一套渲染逻辑：
  - 暴露一个 `renderFrame(frameIndex: number): Promise<void>` 方法：
    - 设置 `playerStore.playStartFrame = frameIndex`；
    - 调用 `drawCanvas()` 完成渲染；
    - 确保内部异步操作（比如 `createImageBitmap`）完成后再 resolve。

#### 4.2.2 需要注意的点

- 离线渲染期间，应避免与实时预览抢占同一套状态：
  - 可以考虑在导出时：
    - 强制 `playerStore.isPause = true`；
    - 固定 `playTargetTrackMap` 为“最终工程状态”，不响应 UI 的进一步编辑（或者在导出开始时拍一个快照）。
- 为避免影响 UI 播放，渲染帧可以使用一个**隐藏 canvas** 实例，而不是当前 UI 播放器：
  - 方案 A：在 `CanvasPlayer` 中额外暴露一个“离线模式”构造函数，使用独立 canvas；
  - 方案 B：导出时暂时接管现有 canvas，导出结束后恢复。

> 建议：采用 **独立 CanvasPlayer 实例 + 隐藏 canvas** 的方式，减少与 UI 的耦合。

### 4.3 ffmpeg 命令扩展

在 `ffmpegCommand.ts` 中新增视频相关命令封装；在 `ffmpegManager.ts` 中新增调用接口。

#### 4.3.1 命令封装（Command）

新增方法草案：

```ts
class Command {
  // ...现有方法

  /**
   * 将帧序列合成 mp4 视频
   * @param framePattern  如 '/export/frame-%06d.png'
   * @param fps           帧率
   * @param videoPath     输出视频路径，如 '/export/output.mp4'
   */
  mergeVideoFromFrames(framePattern: string, fps: number, videoPath: string) {
    return {
      commands: [
        '-r', String(fps),
        '-i', framePattern,
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        videoPath
      ],
      videoPath
    };
  }

  /**
   * 音视频合成（将无声 mp4 + 音频合并成最终输出）
   */
  muxAudioVideo(videoPath: string, audioPath: string, outputPath: string) {
    return {
      commands: [
        '-i', videoPath,
        '-i', audioPath,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-shortest',
        outputPath
      ],
      outputPath
    };
  }
}
```

#### 4.3.2 FFManager 接口

在 `ffmpegManager.ts` 中新增：

```ts
class FFManager {
  // ...现有字段

  async writeFrameImage(framePath: string, fileName: string, blob: Blob) {
    // 将 Blob 写入 FS 指定路径
  }

  async mergeVideoFromFrames(frameDir: string, fps: number, videoName: string) {
    const framePattern = `${frameDir}/frame-%06d.png`;
    const videoPath = `${frameDir}/${videoName}`;
    const { commands } = this.baseCommand.mergeVideoFromFrames(framePattern, fps, videoPath);
    await this.run(commands);
    return { videoPath };
  }

  async muxAudioVideo(videoPath: string, audioPath: string, outputPath: string) {
    const { commands } = this.baseCommand.muxAudioVideo(videoPath, audioPath, outputPath);
    await this.run(commands);
    return { outputPath };
  }

  getFileBlobByPath(path: string, mime: string) {
    const data = this.ffmpeg.FS('readFile', path);
    return new Blob([data], { type: mime });
  }
}
```

> 具体 FS 路径命名可复用 `pathConfig`，例如新增 `exportPath: '/export/'`。

### 4.4 Header 导出按钮与 UI

- 现有「导出」按钮将来改为：
  - 调用 `exportProjectToVideo({ onProgress, signal })`；
  - 根据进度显示简单的导出状态（例如 `ElMessage` 或顶部进度条）。
- 可考虑保留一个「导出音频」入口（但按你当前需求可以不暴露到 UI）。

---

## 5. 导出流程时序

### 5.1 高层时序

1. 用户点击「导出视频」。
2. UI 创建 `AbortController`，显示导出对话框并传入 `onProgress`。
3. `exportProjectToVideo` 执行：
   1. **准备阶段**：
      - 校验 ffmpeg 是否加载完毕；
      - 校验是否存在视频轨或图片/文本轨（否则可以直接失败或仅导出音频）。
   2. **音频合成**：
      - 调用 `ffmpeg.getAudio(playerStore.audioPlayData, trackAttrMap)` 得到音频文件路径（如 `/audio/audio.mp3`）。
   3. **帧渲染**：
      - 创建隐藏 canvas + CanvasPlayer 实例；
      - 循环 `frameIndex in [0, frameCount)`：
        - 检查 `signal.aborted`，支持取消；
        - 渲染帧 → 生成 PNG Blob → 写入 `/export/frame-%06d.png`；
        - 通过 `onProgress` 汇报进度。
   4. **视频合成**：
      - 调用 `mergeVideoFromFrames('/export/frame-%06d.png', 30, '/export/video.mp4')`。
   5. **音视频合并**：
      - 调用 `muxAudioVideo('/export/video.mp4', '/audio/audio.mp3', '/export/output.mp4')`。
   6. **读取结果并下载**：
      - 调用 `getFileBlobByPath('/export/output.mp4', 'video/mp4')`；
      - 返回给调用方，由 UI 触发下载。

### 5.2 错误处理与边界

- 任一阶段失败：
  - 通过 `throw` 将错误抛到上层，由 UI 提示“导出失败”；
  - 可在日志中打印失败阶段和 ffmpeg 输出。
- 取消导出：
  - `AbortSignal` 被置为 aborted 时，中断后续帧渲染 / ffmpeg 合成，清理状态并返回。

---

## 6. 性能与体验考量

### 6.1 复杂度评估

- 假设：
  - 时长 T 秒，帧率 30fps → 总帧数 N = 30T；
  - 每帧一张 PNG（压缩后几十 KB 到几百 KB）。
- 粗略估计：
  - 10 秒工程：约 300 帧，可接受；
  - 60 秒工程：1800 帧，浏览器内存和 CPU 压力会明显上升。

### 6.2 限制与优化建议

- 本版可以在导出前做简单限制：
  - 如果 `frameCount` 超过阈值（如 1800），给出提示“当前版本仅支持约 1 分钟内的工程导出”；
  - 后续再根据实际表现调整。
- 渲染节奏：
  - 可以在帧循环中适当使用 `await nextTick()` 或 `setTimeout(..., 0)`，防止主线程长时间被锁死。
- 帧格式选择：
  - PNG 质量高但体积大；
  - 可以考虑使用 ffmpeg 支持的 JPEG（`image2`）作为中间格式，减小 FS 体积。

---

## 7. 实施阶段拆分

为控制风险，建议按以下阶段逐步实施：

1. **阶段 1：最小可用版本**
   - 目标：仅支持**无音频**的纯画面导出（先不合音频），验证帧渲染 + 视频合成链路。
   - 工作：
     - 新增 `mergeVideoFromFrames`、`mergeVideoFromFrames` 的 FFManager 封装；
     - 实现离线帧渲染并生成 mp4（无声）。

2. **阶段 2：接入音频**
   - 目标：加入 `getAudio` 的结果，生成带音频的 mp4。
   - 工作：
     - 新增 `muxAudioVideo` 命令封装；
     - 在导出流程中串联音频合成。

3. **阶段 3：UI 与用户体验**
   - 目标：在 Header 导出按钮上接入整个流程，并提供简单进度与取消能力。
   - 工作：
     - 新增导出对话框 / 进度条；
     - 对长工程导出做超时或提示。

4. **阶段 4（可选）：性能优化与高级特性**
   - 并发抽帧、按分段导出、断点续导等。

---

## 8. 设计原则回顾

- **不破坏现有播放架构**：
  - 导出使用独立的 CanvasPlayer 实例和隐藏 canvas，做到播放与导出互不干扰。
- **导出结果要忠实于时间轴**：
  - 所有参与预览的元素（视频/图片/文本）都必须能落在导出视频里；
  - 任何“只导视频第一轨 + 音频”的简化方案都不被接受。
- **演进空间清晰**：
  - 文档给出的接口和模块划分，应是后续多轮优化（性能、画质、编码参数）的基础，不需要大改架构。

> 后续所有离线帧渲染 + mp4 导出开发，以本设计文档为基线执行。如有与现实现状不符的地方，优先更新本设计文档，再调整实现。

---

## 9. 实施状态与实现差异

### 9.1 阶段完成情况

- 阶段 1：最小可用版本（无音频纯画面导出）
  - 已实现。当前导出管线会先完成全工程离线帧渲染，并基于帧序列合成无声 mp4。
- 阶段 2：接入音频
  - 已实现。导出前通过 `ffmpeg.getAudio(playerStore.audioPlayData, trackAttrMap)` 合成 `/audio/audio.mp3`，再通过 `muxAudioVideo` 将无声视频与音频合并为最终 mp4。
- 阶段 3：UI 与用户体验
  - 已实现。Header 导出按钮接入 `exportProjectToVideo`，并通过进度弹窗（圆形进度 + 当前阶段文案 + 取消按钮）展示导出状态，支持 `AbortController` 取消导出。
- 阶段 4：性能优化与高级特性
  - 暂未实施。当前版本尚未引入并发抽帧、分段导出或断点续导等优化，仅在 Demo 级工程下验证体验。

### 9.2 与设计稿的实现差异（v0.1）

- Canvas 离线渲染方式：
  - 设计稿建议复用 `CanvasPlayer` 并提供 `renderFrame(frameIndex)` 接口；
  - 当前实现中，离线导出使用独立的隐藏 `canvas` 与渲染逻辑，直接基于 `trackList + trackAttrMap` 和 ffmpeg 帧访问接口（`getFrame / getGifFrame`）按帧绘制，以避免与实时预览共享内部状态。
- 导出服务抽象：
  - 已按照 4.1 新增 `src/services/exportVideo.ts`，对外提供 `exportProjectToVideo(options)`，内部负责帧渲染、音频合成、视频合成与音视频 mux，并通过 `onProgress + AbortSignal` 暴露进度与取消能力。
  - 额外抽象了 `useVideoExport`（`src/services/useVideoExport.ts`），将导出进度、阶段文案与下载触发统一封装，UI 组件（如 Header）只需调用 `startExport / cancelExport` 并绑定状态即可。
- UI 形态：
  - 设计稿中仅要求“简单进度与取消能力”（如 Message/顶部进度条）；
  - 当前实现采用居中的模态对话框 + 圆形进度条 + 阶段提示 + 取消按钮的形式，整体风格接近常见导出弹窗，但文案与表现以本项目为主，不依赖外部产品。

上述差异均保持在实现细节层面，没有改变本设计文档在目标（忠实导出时间轴画面与音频）、模块划分和演进方向上的约束。

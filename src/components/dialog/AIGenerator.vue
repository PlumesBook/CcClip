<template>
  <div class="ai-generator-container">
    <div class="scroll-area custom-scrollbar">
      <!-- Header -->
      <div class="header-section">
        <div class="title-group">
          <h2 class="main-title">
            <el-icon class="title-icon">
              <component :is="activeTab === 'video' ? VideoCamera : MagicStick" />
            </el-icon>
            {{ activeTab === 'video' ? 'AI 视频生成' : 'AI 图片生成' }}
          </h2>
          <p class="sub-title">
            {{ activeTab === 'video' ? '描述您想要的画面，AI 将为您生成视频素材' : '描述您想要的画面，AI 将为您生成图片素材' }}
          </p>
        </div>

        <!-- Task Retrieval & API Config -->
        <el-popover placement="bottom" :width="320" trigger="click" popper-class="cc-popover">
          <template #reference>
            <el-button link size="small" class="settings-btn">
              <el-icon class="mr-1">
                <Setting />
              </el-icon>
              设置
            </el-button>
          </template>
          <div class="settings-panel">
            <!-- API Key Config -->
            <div class="setting-group">
              <h4 class="group-title">
                <el-icon class="group-icon">
                  <Key />
                </el-icon>
                API 配置
              </h4>
              <el-input v-model="apiKeyInput" size="small" placeholder="输入 MiniMax API Key..." type="password"
                show-password class="mb-2 cc-input" />
              <el-button type="primary" size="small" class="w-full cc-btn-primary" @click="saveApiKey">
                {{ apiKeyInput ? (hasApiKey ? '更新 Key' : '保存 Key') : '清除 Key' }}
              </el-button>
              <p class="status-text">{{ hasApiKey ? '✓ 已配置' : '未配置时将使用演示模式' }}</p>
            </div>

            <!-- Task Retrieval -->
            <div class="setting-group">
              <h4 class="group-title">找回历史任务</h4>
              <el-input v-model="retrieveInput" size="small" placeholder="输入 Task ID / File ID..."
                class="mb-2 cc-input" />
              <el-button type="primary" size="small" class="w-full cc-btn-primary" :loading="isRetrieving"
                @click="handleRetrieve" :disabled="!retrieveInput || !hasApiKey">
                获取视频
              </el-button>
            </div>
          </div>
        </el-popover>
      </div>

      <!-- Tabs -->
      <div v-if="!type || type === 'all'" class="type-tabs">
        <button class="tab-btn" :class="{ 'is-active': activeTab === 'video' }" @click="activeTab = 'video'">
          <el-icon>
            <VideoPlay />
          </el-icon>
          视频生成
        </button>
        <button class="tab-btn" :class="{ 'is-active': activeTab === 'image' }" @click="activeTab = 'image'">
          <el-icon>
            <Picture />
          </el-icon>
          图片生成
        </button>
      </div>

      <!-- Input Area -->
      <div class="input-section">
        <div class="textarea-wrapper">
          <el-input v-model="prompt" type="textarea" :rows="4" placeholder="例如：一只可爱的小猫在阳光下的草地上奔跑，电影质感，4k..."
            class="cc-textarea" resize="none" maxlength="500" show-word-limit />
          <div class="model-tag-wrapper">
            <el-tag size="small" type="info" effect="dark" class="model-tag">
              {{ activeTab === 'video' ? 'T2V' : 'T2I' }}
            </el-tag>
          </div>
        </div>

        <div class="action-bar">
          <!-- Config Items -->
          <div class="config-items">
            <div v-if="activeTab === 'video'" class="config-item">
              <span class="label">模型</span>
              <el-select v-model="videoConfig.model" size="small" class="config-select cc-select">
                <el-option label="Hailuo-2.3" value="MiniMax-Hailuo-2.3" />
              </el-select>
            </div>
            <template v-else>
              <div class="config-item">
                <span class="label">模型</span>
                <el-select v-model="imageConfig.model" size="small" class="config-select cc-select">
                  <el-option label="Image-01" value="image-01" />
                </el-select>
              </div>
              <div class="config-item">
                <span class="label">比例</span>
                <el-select v-model="imageConfig.aspectRatio" size="small" class="config-select cc-select">
                  <el-option v-for="opt in aspectRatioOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
              </div>
            </template>
          </div>
          <el-button type="primary" class="cc-btn-primary generate-btn" :loading="isGenerating" @click="handleGenerate"
            :disabled="!prompt.trim()">
            {{ isGenerating ? '生成中...' : '立即生成' }}
          </el-button>
        </div>
      </div>

      <!-- Progress / Result Area -->
      <div class="result-area">

        <!-- Placeholder -->
        <div v-if="!currentTask && !generatedVideoUrl && !generatedImageUrl" class="placeholder-state">
          <el-icon :size="48" class="placeholder-icon">
            <component :is="activeTab === 'video' ? Film : Picture" />
          </el-icon>
          <p>生成结果将在这里预览</p>
        </div>

        <!-- Loading State -->
        <div v-if="currentTask && !generatedVideoUrl && !generatedImageUrl" class="loading-state">
          <div class="spinner-wrapper">
            <div class="spinner-bg"></div>
            <div class="spinner-active"></div>
          </div>
          <h3 class="status-title">{{ statusText }}</h3>
          <p class="status-desc">
            {{ activeTab === 'video' ? '视频生成通常需要 1-3 分钟，请耐心等待...' : '图片生成通常需要 10-30 秒，请耐心等待...' }}
          </p>
          <div class="task-id-wrapper">
            <span class="task-id">TaskID: {{ currentTask }}</span>
          </div>
        </div>

        <!-- Result Player (Video) -->
        <div v-if="generatedVideoUrl" class="result-content">
          <div class="preview-box">
            <video ref="videoRef" :src="generatedVideoUrl" class="preview-media" controls loop autoplay></video>
          </div>
          <div class="result-actions">
            <span class="success-text">获取成功</span>
            <div class="btn-group">
              <el-button @click="clearResult" class="cc-btn-secondary">清除</el-button>
              <el-button type="primary" @click="saveAndSelect" class="cc-btn-primary">
                保存并使用
              </el-button>
            </div>
          </div>
        </div>

        <!-- Result Viewer (Image) -->
        <div v-if="generatedImageUrl" class="result-content">
          <div class="preview-box">
            <img :src="generatedImageUrl" class="preview-media" @error="handleImageError" />
            <!-- Show message if image fails to load -->
            <div v-if="imageLoadFailed" class="image-load-error">
              <el-icon :size="48" class="error-icon">
                <Picture />
              </el-icon>
              <p class="error-text">由于安全策略限制，无法直接显示图片</p>
              <p class="error-hint">请使用下方按钮下载或在新窗口打开</p>
            </div>
          </div>
          <div class="result-actions">
            <span class="success-text">{{ imageLoadFailed ? '图片已生成' : '获取成功' }}</span>
            <div class="btn-group">
              <el-button @click="openImageInNewTab" class="cc-btn-secondary" v-if="imageLoadFailed">
                新窗口打开
              </el-button>
              <el-button @click="downloadImage" class="cc-btn-secondary">
                {{ imageLoadFailed ? '下载图片' : '下载' }}
              </el-button>
              <el-button @click="clearResult" class="cc-btn-secondary">清除</el-button>
              <el-button type="primary" @click="saveAndSelect" class="cc-btn-primary" :disabled="imageLoadFailed">
                保存并使用
              </el-button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { MagicStick, VideoCamera, Film, Setting, Key } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { getApiKey, setApiKey, generateVideo, queryTaskStatus, fetchFileDownloadUrl, generateImage } from '@/api/minimax';
import { saveUploadResource, getUploadResources } from '@/utils/uploadStore';
import { Picture, VideoPlay } from '@element-plus/icons-vue';

const props = defineProps({
  type: {
    type: String,
    default: '' // 'video', 'image', or empty for both
  }
});

const emit = defineEmits(['select']);

// --- State ---
const apiKeyInput = ref(getApiKey()); // 初始化时加载已有的 Key
const hasApiKey = ref(!!getApiKey());
const prompt = ref('');
const isGenerating = ref(false);
const currentTask = ref<string | null>(null);
const statusText = ref('正在加入队列...');
const generatedVideoUrl = ref('');
const generatedImageUrl = ref('');
const imageLoadFailed = ref(false); // Track if image failed to load due to COEP
const pollTimer = ref<any>(null);

const activeTab = ref<'video' | 'image'>(props.type === 'image' ? 'image' : 'video');

const videoConfig = ref({
  model: 'MiniMax-Hailuo-2.3'
});

const imageConfig = ref({
  model: 'image-01',
  aspectRatio: '1:1'
});

const aspectRatioOptions = [
  { label: '1:1 (正方形)', value: '1:1' },
  { label: '16:9 (横屏)', value: '16:9' },
  { label: '9:16 (竖屏)', value: '9:16' },
  { label: '4:3', value: '4:3' },
  { label: '3:4', value: '3:4' },
];

// Retrieve Manual
const retrieveInput = ref('');
const isRetrieving = ref(false);

// --- API Key Mgmt ---
function saveApiKey() {
  const key = apiKeyInput.value.trim();
  setApiKey(key); // 空字符串会清除 Key
  hasApiKey.value = !!key;
  ElMessage.success(key ? 'API Key 已保存' : 'API Key 已清除');
}

// --- Helper Functions for COEP Bypass ---
// --- Fix: Fetch video as Blob to bypass COEP ---
async function finishGeneration(url: string) {
  stopPolling();
  statusText.value = '正在下载视频流...';

  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    generatedVideoUrl.value = blobUrl;
    statusText.value = '完成';
  } catch (e) {
    console.error(e);
    ElMessage.error('视频流下载失败 (Network/CORS)');
    // Fallback: Try showing direct URL (might fail if COEP is strict)
    generatedVideoUrl.value = url;
    statusText.value = '完成 (Direct)';
  } finally {
    isGenerating.value = false;
  }
}

// --- Fix: Fetch image as Blob to bypass COEP ---
// Note: Due to strict COEP policy, fetching cross-origin images may fail
// In that case, we'll try to use the direct URL and let the browser handle it
async function finishImageGeneration(url: string) {
  statusText.value = '正在加载图片...';

  try {
    // Try fetching as blob first (may fail due to COEP)
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    generatedImageUrl.value = blobUrl;
    statusText.value = '完成';
    isGenerating.value = false;
  } catch (e) {
    console.warn('Failed to fetch image as blob, using direct URL:', e);

    // Fallback: Use direct URL
    // This may still fail to display due to COEP, but at least we tried
    generatedImageUrl.value = url;
    statusText.value = '完成';
    isGenerating.value = false;

    // Show warning to user
    ElMessage.warning({
      message: '图片加载受限，建议下载后重新上传使用',
      duration: 5000
    });
  }
}

// --- Generation Logic ---

// --- Generation Logic ---
async function handleGenerate() {
  if (!prompt.value.trim()) return;

  isGenerating.value = true;
  currentTask.value = null;
  generatedVideoUrl.value = '';
  generatedImageUrl.value = '';
  statusText.value = '正在提交任务...';

  // Demo Mode: No API Key
  if (!hasApiKey.value) {
    currentTask.value = 'DEMO-' + Date.now();
    if (activeTab.value === 'video') {
      await simulateDemoGeneration();
    } else {
      await simulateDemoImageGeneration();
    }
    return;
  }

  try {
    if (activeTab.value === 'video') {
      const { task_id } = await generateVideo({
        prompt: prompt.value,
        model: videoConfig.value.model
      });
      currentTask.value = task_id;
      startPolling(task_id);
    } else {
      const { id, image_urls } = await generateImage({
        prompt: prompt.value,
        model: imageConfig.value.model as any,
        aspect_ratio: imageConfig.value.aspectRatio as any
      });
      currentTask.value = id;
      if (image_urls && image_urls.length > 0) {
        // Convert remote image URL to blob URL to bypass COEP
        await finishImageGeneration(image_urls[0]);
      } else {
        // Fallback if async (though currently it seems sync)
        statusText.value = '生成完成，但未返回图片链接';
        isGenerating.value = false;
      }
    }
  } catch (e: any) {
    ElMessage.error(e.message || '生成失败');
    isGenerating.value = false;
  }
}

// --- Demo Mode: Simulate generation with user's first video ---
async function simulateDemoGeneration() {
  const stages = [
    { text: '排队中...', delay: 800 },
    { text: '正在分析提示词...', delay: 1200 },
    { text: '正在生成视频帧...', delay: 2000 },
    { text: '正在合成视频...', delay: 1500 },
    { text: '正在下载视频流...', delay: 1000 }
  ];

  for (const stage of stages) {
    statusText.value = stage.text;
    await sleep(stage.delay);
  }

  // Fetch user's first uploaded video
  try {
    const uploads = await getUploadResources('video');
    if (uploads.length > 0) {
      const firstVideo = uploads[0];
      const blobUrl = URL.createObjectURL(firstVideo.file);
      generatedVideoUrl.value = blobUrl;
      statusText.value = '完成 (演示)';
      ElMessage.success('演示模式：已使用您上传的视频作为示例');
    } else {
      ElMessage.warning('演示模式：请先上传一个视频素材');
      statusText.value = '无可用素材';
      currentTask.value = null;
    }
  } catch (e) {
    console.error(e);
    ElMessage.error('获取演示素材失败');
    currentTask.value = null;
  } finally {
    isGenerating.value = false;
  }
}

async function simulateDemoImageGeneration() {
  const stages = [
    { text: '排队中...', delay: 800 },
    { text: '正在分析提示词...', delay: 1000 },
    { text: '正在生成图片...', delay: 1500 },
    { text: '正在优化细节...', delay: 1000 }
  ];

  for (const stage of stages) {
    statusText.value = stage.text;
    await sleep(stage.delay);
  }

  // Fetch user's first uploaded image
  try {
    const uploads = await getUploadResources('image');
    if (uploads.length > 0) {
      const firstImage = uploads[0];
      const blobUrl = URL.createObjectURL(firstImage.file);
      generatedImageUrl.value = blobUrl;
      statusText.value = '完成 (演示)';
      ElMessage.success('演示模式：已使用您上传的图片作为示例');
    } else {
      // Fallback to a placeholder if no uploads
      generatedImageUrl.value = 'https://via.placeholder.com/512x512?text=Demo+Image';
      statusText.value = '完成 (演示)';
      ElMessage.success('演示模式：使用占位图片');
    }
  } catch (e) {
    console.error(e);
    ElMessage.error('获取演示素材失败');
    currentTask.value = null;
  } finally {
    isGenerating.value = false;
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function startPolling(taskId: string) {
  statusText.value = '排队中...';

  pollTimer.value = setInterval(async () => {
    try {
      const res = await queryTaskStatus(taskId);

      if (res.status === 'Success' && res.download_url) {
        // IMPORTANT: We pass download_url to finishGeneration.
        // Inside finishGeneration, we must FETCH it to a Blob URL to avoid COEP/CORS issues.
        await finishGeneration(res.download_url);
      } else if (res.status === 'Fail') {
        throw new Error(res.error || '生成失败');
      } else if (res.status === 'Processing') {
        statusText.value = '正在生成中... (MiniMax)';
      } else {
        statusText.value = `状态: ${res.status}`;
      }
    } catch (e: any) {
      stopPolling();
      ElMessage.error(e.message || '查询状态失败');
      isGenerating.value = false;
      // Keep task id visible for manual recovery
    }
  }, 3000); // Poll every 3s
}

function stopPolling() {
  if (pollTimer.value) {
    clearInterval(pollTimer.value);
    pollTimer.value = null;
  }
}

function handleImageError() {
  console.warn('Image failed to load due to COEP policy');
  imageLoadFailed.value = true;
}

function openImageInNewTab() {
  if (generatedImageUrl.value) {
    window.open(generatedImageUrl.value, '_blank');
  }
}

async function downloadImage() {
  if (!generatedImageUrl.value) return;

  try {
    // Try to download via link
    const link = document.createElement('a');
    link.href = generatedImageUrl.value;
    link.download = `ai_image_${Date.now()}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    ElMessage.success('已开始下载');
  } catch (e) {
    console.error('Download failed:', e);
    ElMessage.error('下载失败，请尝试在新窗口打开后手动保存');
  }
}

function clearResult() {
  if (generatedVideoUrl.value && generatedVideoUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(generatedVideoUrl.value);
  }
  if (generatedImageUrl.value && generatedImageUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(generatedImageUrl.value);
  }
  generatedVideoUrl.value = '';
  generatedImageUrl.value = '';
  imageLoadFailed.value = false;
  currentTask.value = null;
}

// --- Manual Retrieve Logic ---
async function handleRetrieve() {
  if (!retrieveInput.value) return;
  const input = retrieveInput.value.trim();
  isRetrieving.value = true;

  try {
    // Heuristic: if input is numeric and long (like task_id usually is), try task status first
    // But file_id is also numeric. MiniMax task_id/file_id formats are similar (long ints).
    // Let's try queryTaskStatus first, if that fails or returns file_id, we use it.

    // 1. Try as Task ID
    try {
      const res = await queryTaskStatus(input);
      if (res.status === 'Success' && res.download_url) {
        await finishGeneration(res.download_url);
        retrieveInput.value = ''; // clear on success
        return;
      } else if (res.status === 'Success' && res.file_id) {
        // Got file_id but no url? Try fetch
        const url = await fetchFileDownloadUrl(res.file_id);
        if (url) {
          await finishGeneration(url);
          retrieveInput.value = '';
          return;
        }
      } else if (res.status === 'Processing' || res.status === 'Queueing') {
        // It's a running task, start polling
        currentTask.value = input;
        startPolling(input);
        retrieveInput.value = '';
        return;
      }
    } catch (e) {
      // Ignore task query error, might be a file ID directly
    }

    // 2. Try as File ID directly
    try {
      const url = await fetchFileDownloadUrl(input);
      if (url) {
        await finishGeneration(url);
        retrieveInput.value = '';
        return;
      }
    } catch (e) {
      throw new Error('无法找到对应任务或文件');
    }

  } catch (e: any) {
    ElMessage.error(e.message || '找回失败');
  } finally {
    isRetrieving.value = false;
  }
}

// --- Save Logic ---
async function saveAndSelect() {
  if (!generatedVideoUrl.value && !generatedImageUrl.value) return;

  const loadingMsg = ElMessage({
    message: '正在保存到库...',
    type: 'info',
    duration: 0,
    grouping: true
  });
  try {
    if (activeTab.value === 'video') {
      // 1. Get Blob (If it's already a blob url, we fetch it locally which is instant)
      const res = await fetch(generatedVideoUrl.value);
      const blob = await res.blob();
      const file = new File([blob], `ai_video_${Date.now()}.mp4`, { type: 'video/mp4' });

      // 2. Get Meta (Width/Height/Duration)
      const meta = await getVideoMetadata(file);

      // 3. Save to IDB
      const { id } = await saveUploadResource({
        activeKey: 'video',
        groupType: 'video',
        groupTitle: '我的上传',
        name: (prompt.value.slice(0, 20) || 'AI 生成视频'),
        format: 'mp4',
        cover: meta.cover,
        width: meta.width,
        height: meta.height,
        fps: 30,
        frameCount: Math.floor(meta.duration * 30),
        time: meta.duration * 1000,
        file: file,
        isAI: true
      });

      // 4. Emit select event
      const item = {
        id,
        uploadId: id,
        name: prompt.value.slice(0, 20),
        cover: meta.cover,
        source: URL.createObjectURL(file),
        width: meta.width,
        height: meta.height,
        time: meta.duration * 1000,
        _isUpload: true,
        isAI: true
      };
      emit('select', item);

    } else {
      // Image Save Logic
      const res = await fetch(generatedImageUrl.value);
      const blob = await res.blob();
      const file = new File([blob], `ai_image_${Date.now()}.png`, { type: 'image/png' });

      // Get Image Meta
      const meta = await getImageMetadata(file);

      const { id } = await saveUploadResource({
        activeKey: 'image',
        groupType: 'image',
        groupTitle: '我的上传',
        name: (prompt.value.slice(0, 20) || 'AI 生成图片'),
        format: 'png',
        cover: meta.url, // For image, cover is itself
        width: meta.width,
        height: meta.height,
        fps: 0,
        frameCount: 0,
        time: 0, // Image duration is 0 or default
        file: file,
        isAI: true
      });

      const item = {
        id,
        uploadId: id,
        name: prompt.value.slice(0, 20),
        cover: meta.url,
        source: meta.url,
        width: meta.width,
        height: meta.height,
        time: 3000, // Default duration for image in track
        _isUpload: true,
        isAI: true
      };
      emit('select', item);
    }

  } catch (e) {
    console.error(e);
    ElMessage.error('保存失败');
  } finally {
    loadingMsg.close();
  }
}

function getImageMetadata(file: File): Promise<{ width: number, height: number, url: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
        url: url
      });
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Helper to get video metadata
function getVideoMetadata(file: File): Promise<{ width: number, height: number, duration: number, cover: string }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      // Seek to 1s or start to capture cover
      video.currentTime = 0.1;
    };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        const coverUrl = URL.createObjectURL(blob!);
        resolve({
          width: video.videoWidth,
          height: video.videoHeight,
          duration: video.duration,
          cover: coverUrl
        });
        // Cleanup
        URL.revokeObjectURL(video.src);
      }, 'image/jpeg', 0.7);
    };
    video.onerror = reject;
  });
}

onUnmounted(() => {
  stopPolling();
  if (generatedVideoUrl.value && generatedVideoUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(generatedVideoUrl.value);
  }
  if (generatedImageUrl.value && generatedImageUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(generatedImageUrl.value);
  }
});

</script>

<style lang="scss" scoped>
.ai-generator-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #181818;
  color: #e0e0e0;
  position: relative;
}

.scroll-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px;
  overflow-y: auto;
}

.header-section {
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  .title-group {
    .main-title {
      font-size: 18px;
      font-weight: 500;
      color: white;
      display: flex;
      align-items: center;
      gap: 8px;

      .title-icon {
        color: #00b894;
      }
    }

    .sub-title {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }
  }

  .settings-btn {
    color: #666;

    &:hover {
      color: #00b894;
    }
  }
}

.type-tabs {
  margin-bottom: 24px;
  display: flex;
  background-color: #252525;
  padding: 4px;
  border-radius: 8px;

  .tab-btn {
    flex: 1;
    padding: 6px 0;
    font-size: 14px;
    border-radius: 6px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: transparent;
    border: none;
    color: #888;
    cursor: pointer;

    &:hover {
      color: #bbb;
    }

    &.is-active {
      background-color: #333;
      color: white;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }
  }
}

.input-section {
  margin-bottom: 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  .textarea-wrapper {
    position: relative;

    .model-tag-wrapper {
      position: absolute;
      bottom: 8px;
      left: 8px;
    }

    .model-tag {
      background-color: #333;
      border: none;
      color: #888;
    }
  }

  .action-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;

    .config-items {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .config-item {
      display: flex;
      align-items: center;
      gap: 8px;

      .label {
        font-size: 12px;
        color: #888;
        white-space: nowrap;
      }

      .config-select {
        width: 120px;
      }
    }

    .generate-btn {
      padding: 0 32px;
      margin-left: auto;
    }
  }
}

.result-area {
  flex: 1;
  background-color: #1f1f1f;
  border-radius: 8px;
  border: 1px solid #2a2a2a;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  min-height: 300px;
}

.placeholder-state {
  text-align: center;
  color: #555;

  .placeholder-icon {
    margin-bottom: 8px;
    opacity: 0.3;
  }

  p {
    font-size: 14px;
  }
}

.loading-state {
  text-align: center;
  width: 100%;
  padding: 0 40px;

  .spinner-wrapper {
    margin: 0 auto 16px;
    position: relative;
    width: 80px;
    height: 80px;

    .spinner-bg {
      position: absolute;
      inset: 0;
      border: 4px solid #333;
      border-radius: 50%;
    }

    .spinner-active {
      position: absolute;
      inset: 0;
      border: 4px solid #00b894;
      border-radius: 50%;
      border-top-color: transparent;
      animation: spin 1s linear infinite;
    }
  }

  .status-title {
    color: white;
    font-weight: 500;
    margin-bottom: 4px;
  }

  .status-desc {
    font-size: 12px;
    color: #666;
  }

  .task-id-wrapper {
    margin-top: 8px;

    .task-id {
      font-size: 10px;
      color: #444;
      background-color: #111;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: monospace;
      user-select: all;
    }
  }
}

.result-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;

  .preview-box {
    flex: 1;
    position: relative;
    background-color: black;
    height: 270px;
    display: flex;
    align-items: center;
    justify-content: center;

    .preview-media {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
  }

  .result-actions {
    height: 56px;
    background-color: #252525;
    border-top: 1px solid #333;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;

    .success-text {
      font-size: 12px;
      color: #888;
    }

    .btn-group {
      display: flex;
      gap: 4px;
    }
  }

  .image-load-error {
    position: absolute;
    inset: 0;
    background-color: rgba(24, 24, 24, 0.95);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    text-align: center;
    z-index: 10;

    .error-icon {
      color: #666;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .error-text {
      font-size: 14px;
      color: #ccc;
      margin-bottom: 8px;
      font-weight: 500;
    }

    .error-hint {
      font-size: 12px;
      color: #888;
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

// Global/Common overrides
.custom-scrollbar {
  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: #333;
    border-radius: 4px;

    &:hover {
      background-color: #444;
    }
  }
}

/* Inputs */
:deep(.cc-input .el-input__wrapper),
:deep(.cc-textarea .el-textarea__inner) {
  background-color: #252525;
  box-shadow: none;
  border: 1px solid #333;
  color: #eee;
  border-radius: 6px;

  &.is-focus,
  &:focus {
    border-color: #00b894;
    box-shadow: 0 0 0 1px #00b894;
  }
}

:deep(.cc-select .el-input__wrapper) {
  background-color: #333;
  box-shadow: none;
  border: 1px solid #444;
  color: #eee;
}

:deep(.cc-select .el-input__inner) {
  color: #eee;
}

/* Buttons */
.cc-btn-primary {
  background-color: #00b894;
  border-color: #00b894;
  color: white;

  &:hover {
    background-color: #00a383;
    border-color: #00a383;
  }

  &:disabled {
    background-color: #2a2a2a;
    border-color: #333;
    color: #555;
  }
}

.cc-btn-secondary {
  background: transparent;
  border: 1px solid #444;
  color: #ccc;

  &:hover {
    background: #333;
    color: white;
  }
}
</style>
<style lang="scss">
// Popover styles need to be global or use popper-class
.cc-popover {
  .settings-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .setting-group {
    padding: 12px;
    background-color: #f5f5f5;
    border-radius: 8px;

    .group-title {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
      color: #333;
      display: flex;
      align-items: center;
      gap: 4px;

      .group-icon {
        color: #00b894;
      }
    }

    .status-text {
      font-size: 10px;
      color: #999;
      margin-top: 4px;
    }
  }
}
</style>

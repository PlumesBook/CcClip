<template>
  <div class="h-full flex flex-col bg-[#181818] text-[#e0e0e0] relative">
    <div class="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
      <!-- Header -->
      <div class="mb-6 flex justify-between items-start">
        <div>
          <h2 class="text-lg font-medium text-white flex items-center gap-2">
            <el-icon class="text-[#00b894]">
              <component :is="activeTab === 'video' ? VideoCamera : MagicStick" />
            </el-icon>
            {{ activeTab === 'video' ? 'AI 视频生成' : 'AI 图片生成' }}
          </h2>
          <p class="text-xs text-[#666] mt-1">
            {{ activeTab === 'video' ? '描述您想要的画面，AI 将为您生成视频素材' : '描述您想要的画面，AI 将为您生成图片素材' }}
          </p>
        </div>

        <!-- Task Retrieval & API Config -->
        <el-popover placement="bottom" :width="320" trigger="click">
          <template #reference>
            <el-button link size="small" class="text-[#666] hover:text-[#00b894]">
              <el-icon class="mr-1">
                <Setting />
              </el-icon>
              设置
            </el-button>
          </template>
          <div class="space-y-4">
            <!-- API Key Config -->
            <div class="p-3 bg-[#f5f5f5] rounded-lg">
              <h4 class="text-sm font-medium mb-2 text-[#333] flex items-center gap-1">
                <el-icon class="text-[#00b894]">
                  <Key />
                </el-icon>
                API 配置
              </h4>
              <el-input v-model="apiKeyInput" size="small" placeholder="输入 MiniMax API Key..." type="password"
                show-password class="mb-2" />
              <el-button type="primary" size="small" class="w-full" @click="saveApiKey">
                {{ apiKeyInput ? (hasApiKey ? '更新 Key' : '保存 Key') : '清除 Key' }}
              </el-button>
              <p class="text-[10px] text-[#999] mt-1">{{ hasApiKey ? '✓ 已配置' : '未配置时将使用演示模式' }}</p>
            </div>

            <!-- Task Retrieval -->
            <div class="p-3 bg-[#f5f5f5] rounded-lg">
              <h4 class="text-sm font-medium mb-2 text-[#333]">找回历史任务</h4>
              <el-input v-model="retrieveInput" size="small" placeholder="输入 Task ID / File ID..." class="mb-2" />
              <el-button type="primary" size="small" class="w-full" :loading="isRetrieving" @click="handleRetrieve"
                :disabled="!retrieveInput || !hasApiKey">
                获取视频
              </el-button>
            </div>
          </div>
        </el-popover>
      </div>

      <!-- Tabs (Only show if no specific type is enforced, or if we want to allow switching) -->
      <!-- User request: "business logic is separate", so we should probably enforce the type -->
      <div v-if="!type || type === 'all'" class="mb-6 flex bg-[#252525] p-1 rounded-lg">
        <button class="flex-1 py-1.5 text-sm rounded-md transition-all flex items-center justify-center gap-2"
          :class="activeTab === 'video' ? 'bg-[#333] text-white shadow-sm' : 'text-[#888] hover:text-[#bbb]'"
          @click="activeTab = 'video'">
          <el-icon>
            <VideoPlay />
          </el-icon>
          视频生成
        </button>
        <button class="flex-1 py-1.5 text-sm rounded-md transition-all flex items-center justify-center gap-2"
          :class="activeTab === 'image' ? 'bg-[#333] text-white shadow-sm' : 'text-[#888] hover:text-[#bbb]'"
          @click="activeTab = 'image'">
          <el-icon>
            <Picture />
          </el-icon>
          图片生成
        </button>
      </div>

      <!-- Config Form -->
      <div class="mb-4 bg-[#252525] rounded-lg p-4 border border-[#333]">
        <div v-if="activeTab === 'video'" class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs text-[#aaa]">模型</span>
            <el-select v-model="videoConfig.model" size="small" class="w-40 cc-select">
              <el-option label="Hailuo-2.3" value="MiniMax-Hailuo-2.3" />
            </el-select>
          </div>
        </div>
        <div v-else class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs text-[#aaa]">模型</span>
            <el-select v-model="imageConfig.model" size="small" class="w-40 cc-select">
              <el-option label="Image-01" value="image-01" />
            </el-select>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-[#aaa]">比例</span>
            <el-select v-model="imageConfig.aspectRatio" size="small" class="w-40 cc-select">
              <el-option v-for="opt in aspectRatioOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="space-y-4 mb-8">
        <div class="relative">
          <el-input v-model="prompt" type="textarea" :rows="4" placeholder="例如：一只可爱的小猫在阳光下的草地上奔跑，电影质感，4k..."
            class="cc-textarea" resize="none" maxlength="500" show-word-limit />
          <div class="absolute bottom-2 left-2">
            <el-tag size="small" type="info" effect="dark" class="bg-[#333] border-none text-[#888]">
              {{ activeTab === 'video' ? 'T2V' : 'T2I' }}
            </el-tag>
          </div>
        </div>

        <div class="flex justify-between items-center">
          <span class="text-xs text-[#666]">{{ hasApiKey ? '* 生成一次消耗约 ¥3-5 元' : '* 演示模式 (未配置API)' }}</span>
          <el-button type="primary" class="cc-btn-primary px-8" :loading="isGenerating" @click="handleGenerate"
            :disabled="!prompt.trim()">
            {{ isGenerating ? '生成中...' : '立即生成' }}
          </el-button>
        </div>
      </div>

      <!-- Progress / Result Area -->
      <div
        class="flex-1 bg-[#1f1f1f] rounded-lg border border-[#2a2a2a] flex items-center justify-center relative overflow-hidden min-h-[300px]">

        <!-- Placeholder -->
        <div v-if="!currentTask && !generatedVideoUrl && !generatedImageUrl" class="text-center text-[#555]">
          <el-icon :size="48" class="mb-2 opacity-30">
            <component :is="activeTab === 'video' ? Film : Picture" />
          </el-icon>
          <p class="text-sm">生成结果将在这里预览</p>
        </div>

        <!-- Loading State -->
        <div v-if="currentTask && !generatedVideoUrl && !generatedImageUrl" class="text-center w-full px-10">
          <div class="mb-4 relative w-20 h-20 mx-auto">
            <!-- Simple spinner or lottie placeholder -->
            <div class="absolute inset-0 border-4 border-[#333] rounded-full"></div>
            <div class="absolute inset-0 border-4 border-[#00b894] rounded-full border-t-transparent animate-spin">
            </div>
          </div>
          <h3 class="text-white font-medium mb-1">{{ statusText }}</h3>
          <p class="text-xs text-[#666]">
            {{ activeTab === 'video' ? '视频生成通常需要 1-3 分钟，请耐心等待...' : '图片生成通常需要 10-30 秒，请耐心等待...' }}
          </p>
          <div class="mt-2">
            <span class="text-[10px] text-[#444] bg-[#111] px-2 py-1 rounded font-mono select-all">TaskID: {{
              currentTask
              }}</span>
          </div>
        </div>

        <!-- Result Player (Video) -->
        <div v-if="generatedVideoUrl" class="w-full h-full flex flex-col">
          <div class="flex-1 relative bg-black group h-[270px]">
            <video ref="videoRef" :src="generatedVideoUrl" class="w-full h-full object-contain" controls loop
              autoplay></video>
          </div>
          <div class="h-14 bg-[#252525] border-t border-[#333] flex items-center justify-between px-4">
            <span class="text-xs text-[#888]">获取成功</span>
            <div class="flex gap-1">
              <el-button @click="clearResult" class="cc-btn-secondary">清除</el-button>
              <el-button type="primary" @click="saveAndSelect" class="cc-btn-primary">
                保存并使用
              </el-button>
            </div>
          </div>
        </div>

        <!-- Result Viewer (Image) -->
        <div v-if="generatedImageUrl" class="w-full h-full flex flex-col">
          <div class="flex-1 relative bg-black group h-[270px] flex items-center justify-center">
            <img :src="generatedImageUrl" class="max-w-full max-h-full object-contain" />
          </div>
          <div class="h-14 bg-[#252525] border-t border-[#333] flex items-center justify-between px-4">
            <span class="text-xs text-[#888]">获取成功</span>
            <div class="flex gap-1">
              <el-button @click="clearResult" class="cc-btn-secondary">清除</el-button>
              <el-button type="primary" @click="saveAndSelect" class="cc-btn-primary">
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
        generatedImageUrl.value = image_urls[0];
        statusText.value = '完成';
        isGenerating.value = false;
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

// --- Fix: Fetch video as Blob to bypass COEP ---
async function finishGeneration(url: string) {
  stopPolling();

  // Show loading state while fetching blob
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

function clearResult() {
  if (generatedVideoUrl.value && generatedVideoUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(generatedVideoUrl.value);
  }
  if (generatedImageUrl.value && generatedImageUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(generatedImageUrl.value);
  }
  generatedVideoUrl.value = '';
  generatedImageUrl.value = '';
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

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #333;
  border-radius: 4px;
}

/* Inputs */
:deep(.cc-input .el-input__wrapper),
:deep(.cc-textarea .el-textarea__inner) {
  background-color: #252525;
  box-shadow: none;
  border: 1px solid #333;
  color: #eee;
  border-radius: 6px;
}

:deep(.cc-input .el-input__wrapper.is-focus),
:deep(.cc-textarea .el-textarea__inner:focus) {
  border-color: #00b894;
  box-shadow: 0 0 0 1px #00b894;
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
}

.cc-btn-primary:hover {
  background-color: #00a383;
  border-color: #00a383;
}

.cc-btn-primary:disabled {
  background-color: #2a2a2a;
  border-color: #333;
  color: #555;
}

.cc-btn-secondary {
  background: transparent;
  border: 1px solid #444;
  color: #ccc;
}

.cc-btn-secondary:hover {
  background: #333;
  color: white;
}
</style>

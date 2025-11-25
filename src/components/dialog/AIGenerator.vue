<template>
  <div class="h-full flex flex-col bg-[#181818] text-[#e0e0e0] relative">
    <div class="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
      <!-- Header -->
      <div class="mb-6 flex justify-between items-start">
        <div>
          <h2 class="text-lg font-medium text-white flex items-center gap-2">
            <el-icon class="text-[#00b894]">
              <VideoCamera />
            </el-icon>
            AI 视频生成
          </h2>
          <p class="text-xs text-[#666] mt-1">描述您想要的画面，AI 将为您生成视频素材</p>
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

      <!-- Input Area -->
      <div class="space-y-4 mb-8">
        <div class="relative">
          <el-input v-model="prompt" type="textarea" :rows="4" placeholder="例如：一只可爱的小猫在阳光下的草地上奔跑，电影质感，4k..."
            class="cc-textarea" resize="none" maxlength="500" show-word-limit />
          <div class="absolute bottom-2 left-2">
            <el-tag size="small" type="info" effect="dark" class="bg-[#333] border-none text-[#888]">T2V</el-tag>
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
        <div v-if="!currentTask && !generatedVideoUrl" class="text-center text-[#555]">
          <el-icon :size="48" class="mb-2 opacity-30">
            <Film />
          </el-icon>
          <p class="text-sm">生成结果将在这里预览</p>
        </div>

        <!-- Loading State -->
        <div v-if="currentTask && !generatedVideoUrl" class="text-center w-full px-10">
          <div class="mb-4 relative w-20 h-20 mx-auto">
            <!-- Simple spinner or lottie placeholder -->
            <div class="absolute inset-0 border-4 border-[#333] rounded-full"></div>
            <div class="absolute inset-0 border-4 border-[#00b894] rounded-full border-t-transparent animate-spin">
            </div>
          </div>
          <h3 class="text-white font-medium mb-1">{{ statusText }}</h3>
          <p class="text-xs text-[#666]">视频生成通常需要 1-3 分钟，请耐心等待...</p>
          <div class="mt-2">
            <span class="text-[10px] text-[#444] bg-[#111] px-2 py-1 rounded font-mono select-all">TaskID: {{
              currentTask
              }}</span>
          </div>
        </div>

        <!-- Result Player -->
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

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { MagicStick, VideoCamera, Film, Setting, Key } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { getApiKey, setApiKey, generateVideo, queryTaskStatus, fetchFileDownloadUrl } from '@/api/minimax';
import { saveUploadResource, getUploadResources } from '@/utils/uploadStore';

const emit = defineEmits(['select']);

// --- State ---
const apiKeyInput = ref(getApiKey()); // 初始化时加载已有的 Key
const hasApiKey = ref(!!getApiKey());
const prompt = ref('');
const isGenerating = ref(false);
const currentTask = ref<string | null>(null);
const statusText = ref('正在加入队列...');
const generatedVideoUrl = ref('');
const pollTimer = ref<any>(null);

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
async function handleGenerate() {
  if (!prompt.value.trim()) return;

  isGenerating.value = true;
  currentTask.value = null;
  generatedVideoUrl.value = '';
  statusText.value = '正在提交任务...';

  // Demo Mode: No API Key
  if (!hasApiKey.value) {
    currentTask.value = 'DEMO-' + Date.now();
    await simulateDemoGeneration();
    return;
  }

  try {
    const { task_id } = await generateVideo({ prompt: prompt.value });
    currentTask.value = task_id;
    startPolling(task_id);
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
  generatedVideoUrl.value = '';
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
  if (!generatedVideoUrl.value) return;

  const loadingMsg = ElMessage({
    message: '正在保存到库...',
    type: 'info',
    duration: 0,
    grouping: true
  });
  try {
    // 1. Get Blob (If it's already a blob url, we fetch it locally which is instant)
    const res = await fetch(generatedVideoUrl.value);
    const blob = await res.blob();
    const file = new File([blob], `ai_gen_${Date.now()}.mp4`, { type: 'video/mp4' });

    // 2. Get Meta (Width/Height/Duration)
    // We can use a temp video element to get metadata
    const meta = await getVideoMetadata(file);

    // 3. Save to IDB
    const { id } = await saveUploadResource({
      activeKey: 'video', // Default to video category
      groupType: 'video',
      groupTitle: '我的上传',
      name: (prompt.value.slice(0, 20) || 'AI 生成视频'),
      format: 'mp4',
      cover: meta.cover,
      width: meta.width,
      height: meta.height,
      fps: 30, // Default assumption
      frameCount: Math.floor(meta.duration * 30),
      time: meta.duration * 1000, // ms
      file: file,
      isAI: true // <--- Important
    });

    // 4. Emit select event (Mock item structure matching ResourceSelectDialog)
    const item = {
      id, // Use uploadId as ID
      uploadId: id,
      name: prompt.value.slice(0, 20),
      cover: meta.cover, // blob url
      source: URL.createObjectURL(file),
      width: meta.width,
      height: meta.height,
      time: meta.duration * 1000,
      _isUpload: true,
      isAI: true
    };

    emit('select', item);

  } catch (e) {
    console.error(e);
    ElMessage.error('保存失败');
  } finally {
    loadingMsg.close();
  }
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

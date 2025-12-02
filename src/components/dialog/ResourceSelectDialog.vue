<template>
  <el-dialog v-model="visible" :title="dialogTitle" width="960px" top="8vh"
    class="resource-select-dialog cc-dark-dialog" destroy-on-close :close-on-click-modal="false" append-to-body
    @close="handleClose">
    <div class="flex h-[600px] bg-[#181818] text-[#e0e0e0] overflow-hidden rounded-lg border border-[#333]">
      <!-- Left Sidebar -->
      <div class="w-[200px] flex-shrink-0 bg-[#1f1f1f] border-r border-[#2a2a2a] flex flex-col py-4">

        <!-- AI Tool Entry -->
        <div v-if="['video', 'image'].includes(resourceType)" class="px-2 mb-4">
          <div
            class="cursor-pointer px-3 py-2.5 rounded-md text-sm flex items-center gap-3 transition-all duration-200 select-none"
            :class="isAIActive ? 'bg-gradient-to-r from-[#00b894]/20 to-transparent text-[#00b894] font-medium border border-[#00b894]/30' : 'text-[#ccc] hover:bg-[#2a2a2a]'"
            @click="handleAIActive">
            <el-icon :size="18">
              <MagicStick />
            </el-icon>
            <span>AI 生成</span>
            <el-tag size="small" type="success" effect="dark"
              class="ml-auto scale-75 origin-right bg-[#00b894] border-none text-white">NEW</el-tag>
          </div>
        </div>

        <div class="px-4 mb-2">
          <span class="text-xs font-bold text-[#666] uppercase tracking-wider">分类</span>
        </div>
        <div class="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-1">
          <div v-for="(cat, index) in categories" :key="index"
            class="cursor-pointer px-3 py-2.5 rounded-md text-sm flex items-center gap-3 transition-all duration-200 select-none"
            :class="(!isAIActive && activeCategoryIndex === index) ? 'bg-[#333] text-white font-medium' : 'text-[#999] hover:bg-[#2a2a2a] hover:text-[#ccc]'"
            @click="handleCategoryClick(index)">
            <el-icon :size="16"
              :class="(!isAIActive && activeCategoryIndex === index) ? 'text-primary-400' : 'text-[#666]'">
              <component :is="getCategoryIcon(cat.type)" />
            </el-icon>
            <span class="truncate">{{ cat.title }}</span>
            <span class="ml-auto text-xs" v-if="cat.items?.length">{{ cat.items.length }}</span>
          </div>
        </div>
      </div>

      <!-- Right Content -->
      <div class="flex-1 flex flex-col bg-[#181818] min-w-0 relative">

        <!-- AI Generator View -->
        <div v-if="isAIActive" class="absolute inset-0 z-10">
          <AIGenerator :type="resourceType" @select="handleAISelect" />
        </div>

        <!-- Standard Grid View -->
        <template v-else>
          <!-- Top Bar -->
          <div class="h-16 border-b border-[#2a2a2a] flex items-center px-6 gap-4 justify-between bg-[#181818]">
            <div class="text-lg font-medium text-white">{{ currentCategory?.title || '全部素材' }}</div>

            <div class="flex items-center gap-3">
              <div class="relative w-64">
                <el-input v-model="searchQuery" placeholder="搜索素材名称..." prefix-icon="Search" class="cc-search-input"
                  clearable @input="handleSearch" />
              </div>
            </div>
          </div>

          <!-- Grid Area -->
          <div class="flex-1 overflow-y-auto p-5 custom-scrollbar relative" v-loading="loading"
            element-loading-background="rgba(24, 24, 24, 0.8)">

            <!-- Empty State -->
            <div v-if="!filteredList.length && !loading"
              class="absolute inset-0 flex flex-col items-center justify-center text-[#666]">
              <el-icon :size="64" class="mb-4 opacity-50">
                <Box />
              </el-icon>
              <p class="text-sm">暂无相关素材</p>
            </div>

            <!-- Grid -->
            <div v-else class="resource-grid">
              <div v-for="(item, idx) in filteredList" :key="idx" class="resource-card group"
                :class="{ 'selected': isItemSelected(item) }" @click="selectItem(item)" @dblclick="handleDbClick(item)">
                <!-- Thumbnail -->
                <div class="resource-thumb-container">
                  <img :src="item.cover || item.source" class="resource-img" loading="lazy" @error="handleImgError" />
                  <!-- Overlay -->
                  <div class="resource-overlay"></div>

                  <!-- AI Badge -->
                  <div v-if="item.isAI" class="absolute top-1.5 left-1.5">
                    <el-tag size="small" effect="dark"
                      class="bg-purple-600/80 border-none text-white text-[10px] h-5 px-1">AI</el-tag>
                  </div>

                  <!-- Duration Badge (Video Only, Bottom-Left) -->
                  <span v-if="item.time"
                    class="absolute bottom-1.5 left-1.5 text-[10px] font-mono text-white bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded">
                    {{ formatTimeStr(item.time) }}
                  </span>

                  <!-- Hover Info (for non-upload items) -->
                  <div v-if="!item._isUpload"
                    class="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end">
                    <p class="text-xs text-white truncate drop-shadow-md">{{ item.name }}</p>
                    <p class="text-[10px] text-[#ccc] truncate scale-90 origin-left mt-0.5">{{ item.width }}x{{
                      item.height
                      }}</p>
                  </div>

                  <!-- Selected Check -->
                  <div v-if="isItemSelected(item)"
                    class="absolute top-1.5 right-1.5 bg-[#00b894] text-white rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-in zoom-in duration-200">
                    <el-icon :size="12">
                      <Check />
                    </el-icon>
                  </div>
                </div>

                <!-- Filename Footer (Upload Items Only) -->
                <div v-if="item._isUpload" class="resource-filename">
                  <p class="text-[12px] truncate">{{ item.name }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="h-16 border-t border-[#2a2a2a] flex items-center justify-between px-6 bg-[#1f1f1f]">
            <div class="flex items-center text-xs text-[#888] gap-2">
              <el-tag v-if="selectedItem" size="small" type="info" effect="dark"
                class="bg-[#333] border-none text-[#ccc] max-w-[200px] truncate">
                {{ selectedItem.name }}
              </el-tag>
              <span v-else>请选择一个素材进行替换</span>
            </div>
            <div class="flex gap-1">
              <el-button size="default" @click="handleClose" class="cc-btn-secondary">取消</el-button>
              <el-button type="primary" size="default" @click="confirmSelect" :disabled="!selectedItem"
                class="cc-btn-primary">
                确认替换
              </el-button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Search, Box, Check, VideoPlay, Picture, Headset, Folder, MagicStick } from '@element-plus/icons-vue';
import { getData } from '@/api/mock';
import { getUploadResources } from '@/utils/uploadStore';
import { formatTime } from '@/utils/common';
import AIGenerator from './AIGenerator.vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  resourceType: { type: String, default: 'video' }
});
const emit = defineEmits(['update:modelValue', 'select']);

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const loading = ref(false);
const categories = ref<any[]>([]);
const activeCategoryIndex = ref(0);
const isAIActive = ref(false);
const searchQuery = ref('');
const selectedItem = ref<any>(null);

const dialogTitle = computed(() => {
  const map: Record<string, string> = { video: '视频', image: '图片', audio: '音频' };
  return `替换${map[props.resourceType] || '素材'}`;
});

const currentCategory = computed(() => categories.value[activeCategoryIndex.value]);

const filteredList = computed(() => {
  if (!currentCategory.value?.items) return [];
  const list = currentCategory.value.items;
  if (!searchQuery.value) return list;

  const q = searchQuery.value.toLowerCase();
  return list.filter((item: any) =>
    (item.name || '').toLowerCase().includes(q)
  );
});

async function loadData() {
  loading.value = true;
  categories.value = [];
  // Don't reset selectedItem if it's already valid, to allow persistent selection? 
  // Actually, reset is safer for new open.
  if (!visible.value) selectedItem.value = null;

  searchQuery.value = '';
  // If we are opening, default to first category unless we want to remember state.
  // activeCategoryIndex.value = 0; 
  // isAIActive.value = false;

  try {
    const [sysRes, uploads] = await Promise.all([
      getData(props.resourceType),
      getUploadResources(props.resourceType)
    ]);

    let groups: any[] = [];
    const rawData = (sysRes as any).data || sysRes;
    if (Array.isArray(rawData)) {
      groups = JSON.parse(JSON.stringify(rawData));
    } else if (rawData?.items) {
      groups = JSON.parse(JSON.stringify(rawData.items));
    }

    uploads.forEach(record => {
      const target = groups.find((g: any) => g.type === record.groupType && g.title === record.groupTitle);
      if (target) {
        if (!target.items) target.items = [];
        if (target.items.some((i: any) => i.uploadId === record.id)) return;

        const source = URL.createObjectURL(record.file);
        const isImageGroup = record.groupType === 'image';
        const recordCover = record.cover || '';
        const cover = isImageGroup
          ? (recordCover.startsWith('blob:') ? source : recordCover || source)
          : recordCover;

        target.items.unshift({
          name: record.name,
          format: record.format,
          cover,
          source,
          width: record.width,
          height: record.height,
          fps: record.fps,
          frameCount: record.frameCount,
          time: record.time,
          sourceFrame: record.sourceFrame,
          uploadId: record.id,
          _isUpload: true,
          isAI: record.isAI // <--- Map this
        });
      }
    });

    categories.value = groups;
  } catch (e) {
    console.error('Failed to load resources:', e);
  } finally {
    loading.value = false;
  }
}

function handleCategoryClick(index: number) {
  isAIActive.value = false;
  activeCategoryIndex.value = index;
  selectedItem.value = null;
}

function handleAIActive() {
  isAIActive.value = true;
  selectedItem.value = null;
}

function handleAISelect(item: any) {
  // AI Generator emits a selected item (already saved to IDB)
  // We need to refresh the list to show it in "My Uploads" if we were to switch back,
  // but here we just want to confirm selection immediately.
  selectedItem.value = item;
  confirmSelect();
}

function selectItem(item: any) {
  selectedItem.value = item;
}

function isItemSelected(item: any) {
  return selectedItem.value === item || (selectedItem.value?.id && selectedItem.value.id === item.id);
}

function handleDbClick(item: any) {
  selectedItem.value = item;
  confirmSelect();
}

function confirmSelect() {
  if (selectedItem.value) {
    emit('select', JSON.parse(JSON.stringify(selectedItem.value)));
    handleClose();
  }
}

function handleClose() {
  visible.value = false;
  isAIActive.value = false; // Reset view on close
}

function handleSearch() { }

function formatTimeStr(time: number) {
  if (!time) return '00:00';
  const { str } = formatTime(time);
  return str;
}

function getCategoryIcon(type: string) {
  if (type === 'video') return VideoPlay;
  if (type === 'image') return Picture;
  if (type === 'audio') return Headset;
  return Folder;
}

function handleImgError(e: Event) {
  const target = e.target as HTMLImageElement;
  target.style.opacity = '0.3';
}

watch(() => props.modelValue, (val) => {
  if (val) {
    loadData();
  }
});
</script>

<style scoped>
.resource-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
}

.resource-card {
  position: relative;
  background-color: #252525;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
  display: inline-flex;
  flex-direction: column;
}

.resource-card:hover {
  border-color: #444;
}

.resource-card.selected {
  border-color: #00b894;
  box-shadow: 0 0 0 2px #00b894;
}

.resource-thumb-container {
  position: relative;
  height: 160px;
  overflow: hidden;
  line-height: 0;
}

.resource-img {
  height: 160px;
  width: auto;
  max-width: 280px;
  object-fit: contain;
  display: block;
  transition: transform 0.5s;
}

.resource-card:hover .resource-img {
  transform: scale(1.05);
}

.resource-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0);
  transition: background-color 0.2s;
}

.resource-card:hover .resource-overlay {
  background-color: rgba(0, 0, 0, 0.1);
}

.resource-filename {
  position: absolute;
  bottom: 0;
  width: 100%;
  width: 100%;
  padding: 2px 8px;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(1px);
  box-sizing: border-box;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #444;
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #555;
}

.cc-dark-dialog :deep(.el-dialog__header) {
  display: none;
}

.cc-dark-dialog :deep(.el-dialog__body) {
  padding: 0;
  background: transparent;
}

.cc-dark-dialog :deep(.el-dialog) {
  background: transparent;
  box-shadow: none;
}

:deep(.cc-search-input .el-input__wrapper) {
  background-color: #252525;
  box-shadow: none;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 4px 12px;
}

:deep(.cc-search-input .el-input__wrapper.is-focus) {
  border-color: #00b894;
}

:deep(.cc-search-input .el-input__inner) {
  color: #eee;
  height: 28px;
}

.cc-btn-secondary {
  background: transparent;
  border: 1px solid #444;
  color: #ccc;
}

.cc-btn-secondary:hover {
  border-color: #666;
  color: white;
  background: rgba(255, 255, 255, 0.05);
}

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
</style>

<template>
  <el-dialog v-model="visible" :title="dialogTitle" width="960px" top="8vh"
    class="resource-select-dialog cc-dark-dialog" destroy-on-close :close-on-click-modal="false" append-to-body
    @close="handleClose">
    <div class="dialog-layout">
      <!-- Left Sidebar -->
      <div class="sidebar">
        <!-- AI Tool Entry -->
        <div v-if="['video', 'image'].includes(resourceType)" class="sidebar-section">
          <div class="sidebar-item ai-item" :class="{ 'is-active': isAIActive }" @click="handleAIActive">
            <el-icon :size="18">
              <MagicStick />
            </el-icon>
            <span>AI 生成</span>
            <el-tag size="small" type="success" effect="dark" class="new-tag">NEW</el-tag>
          </div>
        </div>

        <div class="sidebar-header">
          <span>分类</span>
        </div>
        <div class="category-list custom-scrollbar">
          <div v-for="(cat, index) in categories" :key="index" class="sidebar-item"
            :class="{ 'is-active': !isAIActive && activeCategoryIndex === index }" @click="handleCategoryClick(index)">
            <el-icon :size="16" class="item-icon">
              <component :is="getCategoryIcon(cat.type)" />
            </el-icon>
            <span class="item-text">{{ cat.title }}</span>
            <span class="item-count" v-if="cat.items?.length">{{ cat.items.length }}</span>
          </div>
        </div>
      </div>

      <!-- Right Content -->
      <div class="main-content">
        <!-- AI Generator View -->
        <div v-if="isAIActive" class="ai-view-container">
          <AIGenerator :type="resourceType" @select="handleAISelect" />
        </div>

        <!-- Standard Grid View -->
        <template v-else>
          <!-- Top Bar -->
          <div class="top-bar">
            <div class="category-title">{{ currentCategory?.title || '全部素材' }}</div>
            <div class="actions">
              <div class="search-wrapper">
                <el-input v-model="searchQuery" placeholder="搜索素材名称..." prefix-icon="Search" class="cc-search-input"
                  clearable @input="handleSearch" />
              </div>
            </div>
          </div>

          <!-- Grid Area -->
          <div class="grid-container custom-scrollbar" v-loading="loading"
            element-loading-background="rgba(24, 24, 24, 0.8)">

            <!-- Empty State -->
            <div v-if="!filteredList.length && !loading" class="empty-state">
              <el-icon :size="64" class="empty-icon">
                <Box />
              </el-icon>
              <p>暂无相关素材</p>
            </div>

            <!-- Grid -->
            <div v-else class="resource-grid">
              <div v-for="(item, idx) in filteredList" :key="idx" class="resource-card group"
                :class="{ 'is-selected': isItemSelected(item) }" @click="selectItem(item)"
                @dblclick="handleDbClick(item)">
                <!-- Thumbnail -->
                <div class="resource-thumb">
                  <img :src="item.cover || item.source" class="thumb-img" loading="lazy" @error="handleImgError" />
                  <div class="thumb-overlay"></div>

                  <!-- AI Badge -->
                  <div v-if="item.isAI" class="badge-ai">
                    <el-tag size="small" effect="dark" class="ai-tag">AI</el-tag>
                  </div>

                  <!-- Duration Badge -->
                  <span v-if="item.time" class="badge-duration">
                    {{ formatTimeStr(item.time) }}
                  </span>

                  <!-- Hover Info -->
                  <div v-if="!item._isUpload" class="hover-info">
                    <p class="info-name">{{ item.name }}</p>
                    <p class="info-res">{{ item.width }}x{{ item.height }}</p>
                  </div>

                  <!-- Selected Check -->
                  <div v-if="isItemSelected(item)" class="selected-check">
                    <el-icon :size="12">
                      <Check />
                    </el-icon>
                  </div>
                </div>

                <!-- Filename Footer -->
                <div v-if="item._isUpload" class="card-footer">
                  <p class="footer-name">{{ item.name }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="dialog-footer">
            <div class="selection-info">
              <el-tag v-if="selectedItem" size="small" type="info" effect="dark" class="selected-tag">
                {{ selectedItem.name }}
              </el-tag>
              <span v-else>请选择一个素材进行替换</span>
            </div>
            <div class="footer-actions">
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

<style lang="scss" scoped>
.dialog-layout {
  display: flex;
  height: 600px;
  background-color: #181818;
  color: #e0e0e0;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid #333;
}

.sidebar {
  width: 200px;
  flex-shrink: 0;
  background-color: #1f1f1f;
  border-right: 1px solid #2a2a2a;
  display: flex;
  flex-direction: column;
  padding: 16px 0;

  .sidebar-section {
    padding: 0 8px;
    margin-bottom: 16px;
  }

  .sidebar-header {
    padding: 0 16px;
    margin-bottom: 8px;

    span {
      font-size: 12px;
      font-weight: bold;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  }

  .category-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .sidebar-item {
    cursor: pointer;
    padding: 10px 12px;
    border-radius: 6px;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    transition: all 0.2s;
    user-select: none;
    color: #999;

    &:hover {
      background-color: #2a2a2a;
      color: #ccc;
    }

    &.is-active {
      background-color: #333;
      color: white;
      font-weight: 500;

      .item-icon {
        color: #00b894;
      }
    }

    &.ai-item {
      &.is-active {
        background: linear-gradient(to right, rgba(0, 184, 148, 0.2), transparent);
        color: #00b894;
        border: 1px solid rgba(0, 184, 148, 0.3);
      }
    }

    .new-tag {
      margin-left: auto;
      transform: scale(0.75);
      transform-origin: right center;
      background-color: #00b894;
      border: none;
      color: white;
    }

    .item-count {
      margin-left: auto;
      font-size: 12px;
    }
  }
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #181818;
  min-width: 0;
  position: relative;

  .ai-view-container {
    position: absolute;
    inset: 0;
    z-index: 10;
  }
}

.top-bar {
  height: 64px;
  border-bottom: 1px solid #2a2a2a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background-color: #181818;

  .category-title {
    font-size: 18px;
    font-weight: 500;
    color: white;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 12px;

    .search-wrapper {
      position: relative;
      width: 256px;
    }
  }
}

.grid-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  position: relative;
}

.empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;

  .empty-icon {
    margin-bottom: 16px;
    opacity: 0.5;
  }

  p {
    font-size: 14px;
  }
}

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

  &:hover {
    border-color: #444;

    .resource-thumb .thumb-img {
      transform: scale(1.05);
    }

    .resource-thumb .thumb-overlay {
      background-color: rgba(0, 0, 0, 0.1);
    }

    .hover-info {
      opacity: 1;
    }
  }

  &.is-selected {
    border-color: #00b894;
    box-shadow: 0 0 0 2px #00b894;

    .selected-check {
      transform: scale(1);
    }
  }
}

.resource-thumb {
  position: relative;
  height: 160px;
  overflow: hidden;
  line-height: 0;

  .thumb-img {
    height: 160px;
    width: auto;
    max-width: 280px;
    object-fit: contain;
    display: block;
    transition: transform 0.5s;
  }

  .thumb-overlay {
    position: absolute;
    inset: 0;
    background-color: rgba(0, 0, 0, 0);
    transition: background-color 0.2s;
  }

  .badge-ai {
    position: absolute;
    top: 6px;
    left: 6px;

    .ai-tag {
      background-color: rgba(147, 51, 234, 0.8); // purple-600/80
      border: none;
      color: white;
      font-size: 10px;
      height: 20px;
      padding: 0 4px;
    }
  }

  .badge-duration {
    position: absolute;
    bottom: 6px;
    left: 6px;
    font-size: 10px;
    font-family: monospace;
    color: white;
    background-color: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .hover-info {
    position: absolute;
    inset: 0;
    top: auto;
    padding: 8px;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.5), transparent);
    opacity: 0;
    transition: opacity 0.2s;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;

    .info-name {
      font-size: 12px;
      color: white;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    }

    .info-res {
      font-size: 10px;
      color: #ccc;
      margin-top: 2px;
      transform: scale(0.9);
      transform-origin: left bottom;
    }
  }

  .selected-check {
    position: absolute;
    top: 6px;
    right: 6px;
    background-color: #00b894;
    color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
}

.card-footer {
  position: absolute;
  bottom: 0;
  width: 100%;
  padding: 2px 8px;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(1px);
  box-sizing: border-box;

  .footer-name {
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.dialog-footer {
  height: 64px;
  border-top: 1px solid #2a2a2a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background-color: #1f1f1f;

  .selection-info {
    font-size: 12px;
    color: #888;
    display: flex;
    align-items: center;
    gap: 8px;

    .selected-tag {
      background-color: #333;
      border: none;
      color: #ccc;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .footer-actions {
    display: flex;
    gap: 4px;
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
    background-color: #444;
    border-radius: 4px;

    &:hover {
      background-color: #555;
    }
  }
}

.cc-dark-dialog {
  :deep(.el-dialog__header) {
    display: none;
  }

  :deep(.el-dialog__body) {
    padding: 0;
    background: transparent;
  }

  :deep(.el-dialog) {
    background: transparent;
    box-shadow: none;
  }
}

:deep(.cc-search-input .el-input__wrapper) {
  background-color: #252525;
  box-shadow: none;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 4px 12px;

  &.is-focus {
    border-color: #00b894;
  }
}

:deep(.cc-search-input .el-input__inner) {
  color: #eee;
  height: 28px;
}

.cc-btn-secondary {
  background: transparent;
  border: 1px solid #444;
  color: #ccc;

  &:hover {
    border-color: #666;
    color: white;
    background: rgba(255, 255, 255, 0.05);
  }
}

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
</style>

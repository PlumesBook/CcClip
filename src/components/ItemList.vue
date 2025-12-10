<template>
  <div class="resize-bar-container">
    <div class="cc-panel" :class="{ 'is-collapsed': collapse }"
      :style="{ width: collapse ? '0px' : panelWidth + 'px' }">
      <div class="cc-panel-inner">
        <!-- Search Bar -->
        <div class="cc-search-bar">
          <div class="cc-search-input">
            <Search class="cc-search-icon" />
            <input type="text" placeholder="搜索" />
          </div>
          <button class="cc-filter-btn">
            <Filter />
          </button>
        </div>

        <!-- Scrollable Content -->
        <div class="cc-panel-scroll">
          <!-- Section Title with Change -->
          <!-- <div class="cc-section-head">
            <span class="cc-section-title">{{ title }}</span>
            <span class="cc-change-btn">
              <Refresh class="cc-change-icon" />
              <span>Change</span>
            </span>
          </div> -->

          <!-- Groups -->
          <template v-for="(subData, index) of listData" :key="`${index}-${subData.type}`">
            <SubList :type="subData.type" :listData="subData" @upload="handleUpload($event, index)"
              @delete="handleDelete($event, index)" />
          </template>
        </div>
      </div>
    </div>

    <!-- Resize Handle -->
    <div class="resize-trigger-content" @mousedown="startResize">
      <div class="resize-high-light-bar"></div>
    </div>

    <!-- Collapse Handle -->
    <span class="resize-handler-btn" @click="switchCollapse">
      <ArrowLeft v-if="!collapse" />
      <ArrowRight v-else />
    </span>
  </div>
</template>

<script setup lang="ts">
import { Search, Filter, Refresh, ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
import { computed, ref, watch } from 'vue';
import SubList from '@/components/SubList.vue';
import { getData } from '@/api/mock';
import { useRequest } from 'vue-hooks-plus';
import { saveUploadResource, getUploadResources, deleteUploadResource, type UploadStoreRecord } from '@/utils/uploadStore';
import { useTrackState } from '@/stores/trackState';

// ... (Keep existing logic for data fetching and uploads) ...
const props = defineProps({
  activeKey: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: ''
  },
  defaultCollapse: {
    type: Boolean,
    default: false
  }
});
const emit = defineEmits({
  collapseChange(newCollapse: boolean) {
    return newCollapse !== null;
  }
});
const { data: listData, refresh } = useRequest(() => getData(props.activeKey));
const trackStore = useTrackState();
watch(() => props.activeKey, () => {
  refresh();
});

// ... (Keep existing logic for rebindTrackSources, mergeLocalUploads, etc.) ...
function rebindTrackSources(uploads: UploadStoreRecord[], urlMap: Map<string, string>) {
  const uploadMap = new Map<string, UploadStoreRecord>();
  uploads.forEach(record => {
    uploadMap.set(record.id, record);
  });
  trackStore.trackList.forEach(line => {
    line.list.forEach((item: any) => {
      if (!['video', 'audio', 'image'].includes(item.type)) return;
      const uploadId = item.uploadId as string | undefined;
      if (!uploadId) return;
      const record = uploadMap.get(uploadId);
      if (!record) return;
      let source = urlMap.get(record.id);
      if (!source) {
        source = URL.createObjectURL(record.file);
        urlMap.set(record.id, source);
      }
      item.source = source;
      item.format = record.format;
      item.time = record.time;
      if (item.type === 'video') {
        item.frameCount = record.frameCount;
        item.width = record.width;
        item.height = record.height;
        item.cover = record.cover;
      } else if (item.type === 'image') {
        item.width = record.width;
        item.height = record.height;
        const recordCover = record.cover || '';
        item.cover = recordCover.startsWith('blob:') ? source : recordCover || source;
        item.sourceFrame = item.sourceFrame || record.sourceFrame || 1;
      }
    });
  });
}

async function mergeLocalUploads() {
  const activeKey = props.activeKey;
  if (!activeKey) return;
  const uploads = await getUploadResources(activeKey);
  const list = (listData as any).value || [];
  const urlMap = new Map<string, string>();
  uploads.forEach(record => {
    const target = list.find((sub: any) => sub.type === record.groupType && sub.title === record.groupTitle);
    if (!target) return;
    if (!Array.isArray(target.items)) {
      target.items = [];
    }

    // 避免重复添加：先检查是否已存在该 uploadId
    const exists = target.items.some((item: any) => item.uploadId === record.id);
    if (exists) return;

    let source = urlMap.get(record.id);
    if (!source) {
      source = URL.createObjectURL(record.file);
      urlMap.set(record.id, source);
    }
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
      uploadId: record.id
    });
  });
  rebindTrackSources(uploads, urlMap);
}

watch(listData, () => {
  mergeLocalUploads();
});

// 监听全局上传事件，自动刷新列表
function handleGlobalUpload() {
  mergeLocalUploads();
}
// 在组件挂载时添加监听
const onGlobalUpload = () => handleGlobalUpload();
import { onMounted, onUnmounted } from 'vue';
onMounted(() => {
  window.addEventListener('cc-upload-success', onGlobalUpload);
});
onUnmounted(() => {
  window.removeEventListener('cc-upload-success', onGlobalUpload);
});

const panelWidth = ref(320);
const minWidth = 200;
const maxWidth = 600;

function startResize(e: MouseEvent) {
  e.preventDefault();
  const startX = e.clientX;
  const startWidth = panelWidth.value;

  const onMouseMove = (moveEvent: MouseEvent) => {
    const deltaX = moveEvent.clientX - startX;
    let newWidth = startWidth + deltaX;
    if (newWidth < minWidth) newWidth = minWidth;
    if (newWidth > maxWidth) newWidth = maxWidth;
    panelWidth.value = newWidth;
  };

  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
}

const title = computed(() => props.title);
const collapse = ref(props.defaultCollapse);
function switchCollapse() {
  collapse.value = !collapse.value;
}
watch(collapse, newValue => {
  emit('collapseChange', newValue);
});
watch(() => props.defaultCollapse, newValue => {
  collapse.value = newValue;
});
async function handleUpload(item: Record<string, any>, subIndex: number) {
  if (!item) return;
  const list = (listData as any).value || [];
  const target = list[subIndex];
  if (!target || !Array.isArray(target.items)) return;
  const { file, groupType, groupTitle, ...rest } = item as any;
  const insertItem: any = {
    ...rest
  };
  target.items.unshift(insertItem);
  if (file) {
    try {
      const { id } = await saveUploadResource({
        activeKey: props.activeKey,
        groupType: groupType || target.type,
        groupTitle: groupTitle || target.title,
        name: rest.name,
        format: rest.format,
        cover: rest.cover,
        width: rest.width,
        height: rest.height,
        fps: rest.fps,
        frameCount: rest.frameCount,
        time: rest.time,
        file,
        sourceFrame: rest.sourceFrame
      });
      insertItem.uploadId = id;
    } catch (e) {
      // ignore
    }
  }
}
async function handleDelete(item: Record<string, any>, subIndex: number) {
  const list = (listData as any).value || [];
  const target = list[subIndex];
  if (!target || !Array.isArray(target.items)) return;
  if (item.uploadId) {
    try {
      await deleteUploadResource(item.uploadId);
      const itemIndex = target.items.indexOf(item);
      if (itemIndex > -1) {
        target.items.splice(itemIndex, 1);
      }
    } catch (e) {
      // ignore
    }
  }
}
</script>

<style lang="scss" scoped>
.resize-bar-container {
  position: relative;
  display: flex;
  height: 100%;
  flex-direction: row;
}

.cc-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #1a1a1c;
  transition: width 0.05s linear;
  /* Faster transition for resize, maybe remove for drag? */
  overflow: visible;
  overflow-x: hidden;
  flex-shrink: 0;

  &.is-collapsed {
    width: 0;
    padding: 0;
    overflow: hidden;
  }
}

.cc-panel-inner {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.resize-trigger-content {
  position: relative;
  width: 10px;
  height: 100%;
  cursor: col-resize;
  display: flex;
  justify-content: center;
  z-index: 10;
  margin-left: -5px;
  /* Overlap slightly */

  &:hover .resize-high-light-bar {
    background-color: #00bebd;
  }
}

.resize-high-light-bar {
  width: 2px;
  height: 100%;
  background-color: transparent;
  transition: background-color 0.2s;
}

.resize-handler-btn {
  position: absolute;
  top: 50%;
  left: 100%;
  /* Position relative to container */
  transform: translate(-50%, -50%);
  width: 16px;
  height: 32px;
  background-color: #1a1a1c;
  border: 1px solid #2a2b2d;
  border-left: none;
  border-radius: 0 4px 4px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 20;
  color: #6a6a6a;
  transition: all 0.15s ease;
  margin-left: -5px;
  /* Adjust for overlap */

  svg {
    width: 10px;
    height: 10px;
  }

  &:hover {
    background-color: #252628;
    color: #ffffff;
  }
}

.cc-search-bar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 10px;
  flex-shrink: 0;
}

.cc-search-input {
  flex: 1;
  display: flex;
  align-items: center;
  height: 36px;
  background-color: #2d2d30;
  border-radius: 6px;
  padding: 0 12px;
  transition: background-color 0.15s ease;

  &:focus-within {
    background-color: #38383b;
  }

  .cc-search-icon {
    width: 16px;
    height: 16px;
    color: #6a6a6a;
    margin-right: 8px;
    flex-shrink: 0;
  }

  input {
    flex: 1;
    background: transparent;
    border: none;
    color: #ffffff;
    font-size: 14px;
    outline: none;
    padding: 0;

    &::placeholder {
      color: #6a6a6a;
    }
  }
}

.cc-filter-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #2d2d30;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: #8a8a8a;
  transition: all 0.15s ease;
  flex-shrink: 0;

  svg {
    width: 18px;
    height: 18px;
  }

  &:hover {
    background-color: #38383b;
    color: #ffffff;
  }
}

.cc-panel-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 20px;

  &::-webkit-scrollbar {
    width: 0;
  }
}

.cc-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px 16px 16px;
}

.cc-section-title {
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
}

.cc-change-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #8a8a8a;
  cursor: pointer;
  transition: color 0.15s ease;

  .cc-change-icon {
    width: 14px;
    height: 14px;
  }

  &:hover {
    color: #ffffff;
  }
}
</style>
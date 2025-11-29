<template>
  <div class="item-list-container" :class="{ 'collapsed': collapse }">
    <div class="panel-content">
      <!-- Search Area -->
      <div class="search-area">
        <div class="search-input-wrapper">
          <ElIcon :size="14" class="search-icon">
            <Search />
          </ElIcon>
          <input type="text" placeholder="搜索范本" class="search-input" />
        </div>
        <div class="filter-btn">
          <ElIcon :size="16">
            <Filter />
          </ElIcon>
        </div>
      </div>

      <!-- Main Content Scrollable -->
      <div class="scroll-content custom-scrollbar">
        <!-- Header with Title and Change -->
        <div class="section-header">
          <span class="section-title">{{ title }}</span>
          <div class="header-actions">
            <span class="change-btn" v-if="title === '视频'">
              <ElIcon :size="12">
                <Refresh />
              </ElIcon> Change
            </span>
          </div>
        </div>

        <!-- List Content -->
        <div class="list-wrapper">
          <template v-for="(subData, index) of listData" :key="`${index}-${subData.type}`">
            <SubList :type="subData.type" :listData="subData" @upload="handleUpload($event, index)"
              @delete="handleDelete($event, index)" />
          </template>
        </div>
      </div>
    </div>

    <!-- Right Center Collapse Button -->
    <div class="collapse-trigger" @click="switchCollapse" v-show="!collapse">
      <ElIcon :size="12" color="#8e8e8e">
        <ArrowLeft />
      </ElIcon>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Search, Filter, Refresh, ArrowLeft } from '@element-plus/icons-vue';
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
.item-list-container {
  display: flex;
  flex-direction: column;
  width: 320px; // Standard panel width
  height: 100%;
  background-color: #121212; // Panel Dark Gray
  color: #e0e0e0;
  border-right: 1px solid #1a1a1a;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative; // For absolute positioning of collapse button
  // overflow: hidden; // Remove overflow hidden to allow button to stick out if needed, but here we keep it inside
  overflow: visible; // Allow button to be seen if positioned on edge

  &.collapsed {
    width: 0;
    border-right: none;

    .collapse-trigger {
      display: none; // Hide button when collapsed
    }
  }
}

.panel-content {
  display: flex;
  flex-direction: column;
  width: 320px; // Keep content width fixed to avoid squishing during transition
  height: 100%;
  overflow: hidden; // Ensure content doesn't spill out
}

.collapse-trigger {
  position: absolute;
  top: 50%;
  right: -12px; // Position outside the container
  transform: translateY(-50%);
  width: 12px;
  height: 24px;
  background-color: #121212;
  border: 1px solid #1a1a1a;
  border-left: none;
  border-radius: 0 4px 4px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;

  &:hover {
    background-color: #252627;

    :deep(.el-icon) {
      color: #ffffff !important;
    }
  }
}

.search-area {
  display: flex;
  align-items: center;
  padding: 16px 12px;
  gap: 8px;

  .search-input-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    height: 32px;
    background-color: #252627;
    border-radius: 4px;
    padding: 0 8px;
    border: 1px solid transparent;
    transition: border-color 0.2s;

    &:focus-within {
      border-color: #4a4a4a;
    }

    .search-icon {
      color: #8e8e8e;
      margin-right: 6px;
    }

    .search-input {
      flex: 1;
      background: transparent;
      border: none;
      color: #e0e0e0;
      font-size: 12px;
      outline: none;

      &::placeholder {
        color: #666;
      }
    }
  }

  .filter-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #252627;
    border-radius: 4px;
    cursor: pointer;
    color: #e0e0e0;
    transition: background-color 0.2s;

    &:hover {
      background-color: #333;
    }
  }
}

.scroll-content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 12px 16px;

  .section-title {
    font-size: 14px;
    font-weight: 600;
    color: #ffffff;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;

    .change-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #8e8e8e;
      cursor: pointer;

      &:hover {
        color: #ffffff;
      }
    }
  }
}

.list-wrapper {
  padding: 0 8px;
}
</style>
<template>
  <div class="cc-group">
    <!-- Group Header -->
    <div class="cc-group-header">
      <span class="cc-group-title">{{ listData.title }}</span>
      <span class="cc-group-more" v-if="!isUserUpload">查看全部</span>
    </div>

    <!-- Upload Area (only for user upload) -->
    <div v-if="showUploadArea" class="cc-upload-area">
      <div class="cc-upload-dropzone" @click="triggerSelect" @dragover.prevent @drop.prevent="handleDrop">
        <component :is="uploadIcon" class="cc-upload-icon" />
        <span>{{ uploadHint }}</span>
      </div>
      <input ref="fileInput" class="cc-hidden-input" type="file" multiple :accept="acceptTypes" @change="handleFileChange">
    </div>

    <!-- Horizontal Scroll Container -->
    <div class="cc-scroll-container" :class="{ 'is-audio': isAudio }">
      <div class="cc-scroll-track">
        <!-- Uploading Items -->
        <div 
          class="cc-card" 
          :class="{ 'is-audio': isAudio }"
          v-for="(item, index) in uploadingItems" 
          :key="`uploading-${index}`"
        >
          <div class="cc-card-uploading">
            <component :is="uploadIcon" class="cc-uploading-icon" />
            <span class="cc-uploading-name">{{ item.name }}</span>
            <div class="cc-progress">
              <div class="cc-progress-bar" :style="{ width: (item.progress || 0) + '%' }"></div>
            </div>
          </div>
        </div>

        <!-- Resource Items -->
        <div 
          class="cc-card" 
          :class="{ 'is-audio': isAudio }" 
          v-for="(item, idx) of listData.items"
          :key="`${item.name}${item.cover}${idx}`"
        >
          <template v-if="isAudio">
            <AudioResourceItem :data="item" :type="type" :closable="isUserUpload" @delete="onDelete" />
          </template>
          <template v-else>
            <OtherResource :data="item" :type="type" :closable="isUserUpload" @delete="onDelete" />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, reactive } from 'vue';
import type FFManager from '@/utils/ffmpegManager';
import { createVideoResourceFromFile, createAudioResourceFromFile, createImageResourceFromFile, type ResourceSource } from '@/utils/fileResourceUtils';
import AudioResourceItem from '@/components/item/resourcesItem/AudioResourceItem.vue';
import OtherResource from '@/components/item/resourcesItem/OtherResource.vue';
import VideoIcon from '@/components/icons/VideoIcon.vue';
import AudioIcon from '@/components/icons/AudioIcon.vue';
import ImageIcon from '@/components/icons/ImageIcon.vue';

const ffmpeg = inject('ffmpeg') as FFManager;
const props = defineProps({
  listData: {
    type: Object,
    default() {
      return {
        title: '',
        items: []
      };
    }
  },
  type: {
    type: String,
    default: ''
  }
});
const emit = defineEmits({
  upload(item: Record<string, any>) {
    return Boolean(item);
  },
  delete(item: Record<string, any>) {
    return Boolean(item);
  }
});
const listData = ref(props.listData);
const uploadingItems = reactive<any[]>([]);
const isAudio = computed(() => props.type === 'audio');
const showUploadArea = computed(() => ['video', 'audio', 'image'].includes(props.type) && (props.listData as any)?.title === '用户上传');
const isUserUpload = computed(() => (props.listData as any)?.title === '用户上传');
const fileInput = ref<HTMLInputElement | null>(null);
const acceptTypes = computed(() => {
  if (props.type === 'audio') {
    return 'audio/*';
  }
  if (props.type === 'image') {
    return 'image/gif';
  }
  return 'video/*';
});
const uploadHint = computed(() => {
  if (props.type === 'audio') {
    return '点击或拖拽音频到此处，添加到「用户上传」';
  }
  if (props.type === 'image') {
    return '点击或拖拽图片到此处，添加到「用户上传」';
  }
  return '点击或拖拽视频到此处，添加到「用户上传」';
});
const uploadIcon = computed(() => {
  if (props.type === 'audio') {
    return AudioIcon;
  }
  if (props.type === 'image') {
    return ImageIcon;
  }
  return VideoIcon;
});

function onDelete(item: any) {
  emit('delete', item);
}

function triggerSelect() {
  if (fileInput.value) {
    fileInput.value.click();
  }
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement | null;
  if (!target) return;
  const { files } = target;
  if (files && files.length > 0) {
    handleFiles(files);
  }
  target.value = '';
}

function handleDrop(event: DragEvent) {
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    handleFiles(files);
  }
}

function handleFiles(files: FileList) {
  Array.from(files).forEach(file => {
    if (props.type === 'video') {
      if (!file.type.startsWith('video/')) return;
      processFileWithProgress(file, 'video', createVideoResourceFromFile);
    } else if (props.type === 'audio') {
      if (!file.type.startsWith('audio/')) return;
      processFileWithProgress(file, 'audio', createAudioResourceFromFile);
    } else if (props.type === 'image') {
      if (file.type !== 'image/gif' && !file.type.startsWith('image/')) return;
      processFileWithProgress(file, 'image', (f) => createImageResourceFromFile(f, ffmpeg));
    }
  });
}

function processFileWithProgress(
  file: File,
  type: string,
  processor: (f: File) => Promise<ResourceSource>
) {
  const placeholder = { type, name: file.name, progress: 0 };
  uploadingItems.push(placeholder);
  const timer = startProgress(placeholder);

  processor(file).then(data => {
    placeholder.progress = 100;
    setTimeout(() => {
      emit('upload', {
        ...data,
        groupTitle: (props.listData as any)?.title
      });
      clearInterval(timer);
      const index = uploadingItems.indexOf(placeholder);
      if (index > -1) uploadingItems.splice(index, 1);
    }, 200);
  }).catch(() => {
    clearInterval(timer);
    const index = uploadingItems.indexOf(placeholder);
    if (index > -1) uploadingItems.splice(index, 1);
  });
}

function startProgress(item: any) {
  item.progress = 0;
  const interval = setInterval(() => {
    if (item.progress < 90) {
      item.progress += 5;
    }
  }, 100);
  return interval;
}

</script>

<style lang="scss" scoped>
.cc-group {
  margin-bottom: 20px;
}

.cc-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 12px 16px;
}

.cc-group-title {
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
}

.cc-group-more {
  font-size: 12px;
  color: #6a6a6a;
  cursor: pointer;
  transition: color 0.15s ease;

  &:hover {
    color: #ffffff;
  }
}

.cc-upload-area {
  padding: 0 16px 12px 16px;
}

.cc-upload-dropzone {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  border: 1px dashed #3a3b3d;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  color: #6a6a6a;
  user-select: none;
  transition: all 0.15s ease;
  background-color: rgba(45, 45, 48, 0.5);

  &:hover {
    border-color: #00B5FF;
    color: #00B5FF;
    background-color: rgba(0, 181, 255, 0.08);
  }

  .cc-upload-icon {
    width: 16px;
    height: 16px;
    margin-right: 8px;
  }
}

.cc-hidden-input {
  display: none;
}

.cc-scroll-container {
  position: relative;
  width: 100%;
  overflow: hidden;

  &.is-audio {
    .cc-scroll-track {
      flex-direction: column;
      padding: 0 16px;
    }

    .cc-card {
      width: 100%;
      flex-shrink: 0;
      margin-right: 0;
      margin-bottom: 8px;
    }
  }
}

.cc-scroll-track {
  display: flex;
  flex-direction: row;
  overflow-x: auto;
  padding: 0 16px 8px 16px;
  gap: 8px;

  &::-webkit-scrollbar {
    height: 0;
  }
}

.cc-card {
  flex-shrink: 0;

  &.is-audio {
    width: 100%;
  }
}

.cc-card-uploading {
  position: relative;
  width: 136px;
  height: 100px;
  border-radius: 8px;
  background-color: #2d2d30;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  .cc-uploading-icon {
    width: 28px;
    height: 28px;
    color: #5a5a5a;
    margin-bottom: 8px;
  }

  .cc-uploading-name {
    font-size: 11px;
    color: #8a8a8a;
    padding: 0 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
}

.cc-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background-color: #1a1a1c;
}

.cc-progress-bar {
  height: 100%;
  background-color: #00B5FF;
  transition: width 0.3s ease;
}
</style>
<template>
    <div class="w-full flex flex-col pt-2 pl-2 pr-1 mt-2">
        <div class="flex items-center justify-between pr-2">
            <span class="mr-2 pl-2 mb-2 h-6 text-sm border-b dark:border-gray-600 border-gray-300 select-none"> {{
                listData.title }} </span>
        </div>
        <div v-if="showUploadArea" class="mb-2 px-2">
            <div
class="flex items-center justify-center h-16 border-2 border-dashed rounded-md cursor-pointer dark:border-gray-600 border-gray-300 hover:dark:border-blue-400 hover:border-blue-400 text-xs text-gray-500 dark:text-gray-300 select-none"
                @click="triggerSelect" @dragover.prevent @drop.prevent="handleDrop"
>
                <VideoIcon class="text-base mr-2" />
                <span>点击或拖拽视频到此处，添加到「用户上传」</span>
            </div>
            <input
ref="fileInput" class="hidden" type="file" multiple accept="video/*"
@change="handleFileChange"
>
        </div>
        <ul class="flex flex-row flex-wrap">
            <li
class="flex flex-col mb-2 p-1.5" :class="{ 'w-full': isAudio }" v-for="(item, idnex) of listData.items"
                :key="`${item.name}${item.cover}${idnex}`"
>
                <template v-if="isAudio">
                    <AudioResourceItem :data="item" :type="type" />
                </template>
                <template v-else>
                    <OtherResource :data="item" :type="type" />
                </template>
            </li>
        </ul>
    </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue';
  import AudioResourceItem from '@/components/item/resourcesItem/AudioResourceItem.vue';
  import OtherResource from '@/components/item/resourcesItem/OtherResource.vue';
  import VideoIcon from '@/components/icons/VideoIcon.vue';
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
    }
  });
  const listData = ref(props.listData);
  const isAudio = computed(() => props.type === 'audio');
  const showUploadArea = computed(() => props.type === 'video' && (props.listData as any)?.title === '用户上传');
  const fileInput = ref<HTMLInputElement | null>(null);

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
      if (!file.type.startsWith('video/')) return;
      createVideoResourceFromFile(file);
    });
  }

  function createVideoResourceFromFile(file: File) {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = url;
    video.onloadedmetadata = () => {
      const duration = video.duration || 0;
      const width = video.videoWidth || 320;
      const height = video.videoHeight || 180;
      const fps = 30;
      const frameCount = Math.max(1, Math.round(duration * fps));
      const time = Math.max(1, Math.round(duration * 1000));
      const baseName = getBaseName(file.name);
      const format = getFormat(file.name);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      const emitItem = (cover: string) => {
        emit('upload', {
          name: baseName,
          format,
          cover,
          source: url,
          width,
          height,
          fps,
          frameCount,
          time
        });
      };
      if (ctx) {
        const capture = () => {
          try {
            ctx.drawImage(video, 0, 0, width, height);
            const cover = canvas.toDataURL('image/png');
            emitItem(cover);
          } catch (e) {
            emitItem('');
          }
        };
        if (duration > 0) {
          video.currentTime = Math.min(0.1, duration - 0.1);
          video.onseeked = () => capture();
        } else {
          capture();
        }
      } else {
        emitItem('');
      }
    };
  }

  function getBaseName(fileName: string) {
    const dotIndex = fileName.lastIndexOf('.');
    if (dotIndex === -1) return fileName;
    return fileName.slice(0, dotIndex);
  }

  function getFormat(fileName: string) {
    const dotIndex = fileName.lastIndexOf('.');
    if (dotIndex === -1) return 'mp4';
    return fileName.slice(dotIndex + 1);
  }
</script>
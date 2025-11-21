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
                <component :is="uploadIcon" class="text-base mr-2" />
                <span>{{ uploadHint }}</span>
            </div>
            <input
            ref="fileInput" class="hidden" type="file" multiple :accept="acceptTypes"
            @change="handleFileChange"
            >
        </div>
        <ul class="flex flex-row flex-wrap">
            <!-- 上传占位 -->
            <li
                class="flex flex-col mb-2 p-1.5 relative"
                :class="{ 'w-full': isAudio, 'w-22': !isAudio, 'h-24': !isAudio }"
                v-for="(item, index) in uploadingItems"
                :key="`uploading-${index}`"
            >
               <div 
                 class="relative w-full h-full border border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center overflow-hidden"
                 :class="{ 'h-20': isAudio, 'h-full': !isAudio }"
               >
                  <component :is="uploadIcon" class="text-2xl text-gray-400 mb-1" />
                  <span class="text-xs text-gray-500 px-2 truncate max-w-full">{{ item.name }}</span>
                  <!-- 底部进度条 -->
                  <div class="absolute bottom-0 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700">
                    <div class="h-full bg-blue-500 transition-all duration-300" :style="{ width: (item.progress || 0) + '%' }"></div>
                  </div>
               </div>
            </li>
            <li
            class="flex flex-col mb-2 p-1.5" :class="{ 'w-full': isAudio }" v-for="(item, idnex) of listData.items"
                :key="`${item.name}${item.cover}${idnex}`"
            >
                <template v-if="isAudio">
                    <AudioResourceItem :data="item" :type="type" :closable="isUserUpload" @delete="onDelete" />
                </template>
                <template v-else>
                    <OtherResource :data="item" :type="type" :closable="isUserUpload" @delete="onDelete" />
                </template>
            </li>
        </ul>
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
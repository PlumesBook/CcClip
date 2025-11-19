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
  import { ref, computed, inject } from 'vue';
  import type FFManager from '@/utils/ffmpegManager';
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
        createVideoResourceFromFile(file);
      } else if (props.type === 'audio') {
        if (!file.type.startsWith('audio/')) return;
        createAudioResourceFromFile(file);
      } else if (props.type === 'image') {
        if (file.type !== 'image/gif') return;
        createImageResourceFromFile(file);
      }
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
          time,
          file,
          groupType: props.type,
          groupTitle: (props.listData as any)?.title
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

  function createAudioResourceFromFile(file: File) {
    const url = URL.createObjectURL(file);
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.src = url;
    audio.onloadedmetadata = () => {
      const duration = audio.duration || 0;
      const time = Math.max(1, Math.round(duration * 1000));
      const baseName = getBaseName(file.name);
      const format = getFormat(file.name);
      const emitItem = () => {
        emit('upload', {
          name: baseName,
          format,
          cover: '',
          source: url,
          width: 0,
          height: 0,
          fps: 0,
          frameCount: 0,
          time,
          file,
          groupType: props.type,
          groupTitle: (props.listData as any)?.title
        });
      };
      emitItem();
    };
  }

  function createImageResourceFromFile(file: File) {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = async () => {
      const width = image.width || 320;
      const height = image.height || 180;
      // 图片轨道时长与接口图片保持一致，由 formatTrackItemData 统一按 time 计算 frameCount
      let time = 2000;
      let fps = 0;
      let frameCount = 0;
      const baseName = getBaseName(file.name);
      const format = getFormat(file.name);
      let sourceFrame = 1;

      // 处理 GIF 动图
      if (format.toLowerCase() === 'gif' && ffmpeg && ffmpeg.isLoaded.value) {
        try {
          const fileName = `${baseName}.${format}`;
          await ffmpeg.writeFile(ffmpeg.pathConfig.resourcePath, fileName, url);
          await ffmpeg.genFrame(baseName, format, { w: width, h: height });
          // 读取帧目录
          const frameDir = `${ffmpeg.pathConfig.framePath}${baseName}`;
          const files = ffmpeg.readDir(frameDir);
          // 过滤出 gif-x 格式的文件
          const frames = files.filter((f: string) => f.startsWith('gif-'));
          if (frames.length > 1) {
            frameCount = frames.length;
            sourceFrame = frames.length;
            fps = 10; // GIF 默认 10fps
            time = frameCount * 100; // 时长 = 帧数 * 100ms
          }
        } catch (e) {
          console.error('GIF 解析失败', e);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      let cover = url;
      if (ctx) {
        try {
          ctx.drawImage(image, 0, 0, width, height);
          cover = canvas.toDataURL('image/png');
        } catch (e) {
          // ignore, fallback to gif url
        }
      }
      emit('upload', {
        name: baseName,
        format,
        cover,
        source: url,
        width,
        height,
        fps,
        frameCount,
        time,
        sourceFrame,
        file,
        groupType: props.type,
        groupTitle: (props.listData as any)?.title
      });
    };
    image.src = url;
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
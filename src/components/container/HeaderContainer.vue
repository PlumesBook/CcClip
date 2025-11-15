<template>
    <header
        class="h-12 w-full flex flex-nowrap flex-row items-center justify-center border-b dark:border-gray-600 border-gray-300"
>
        <div class="flex w-1/3 pl-2 items-center">
            <div class="w20">
                <img class="h-8" :src="logoImage" alt="">
            </div>
            <span class="text-xs select-none ml-4">自动保存：2023-02-10 00:51</span>
        </div>
        <h2 class="align-middle w-1/5 text-center flex-1 select-none text-sm">
            {{ store.pageTitle }}
        </h2>
        <div class="flex w-1/3 flex-row-reverse pr-10 items-center">
            <ElButton color="#626aef" :disabled="!canExport" @click="handleExport">
                <ElIcon :size="size" :color="color" class="mr-1">
                    <Download />
                </ElIcon>
                导出
            </ElButton>
            <el-switch
class="mr-10" size="large" :active-icon="Moon" :inactive-icon="Sunny" :inline-prompt="inner"
                v-model="store.isDark" :style="switchClass"
/>
        </div>
    </header>
</template>

<script setup lang="ts">
  import logoImage from '@/assets/ccLogo.png';
  import { ref, computed, inject, toRaw } from 'vue';
  import { Download, Sunny, Moon } from '@element-plus/icons-vue';
  import { usePageState } from '@/stores/pageState';
  import { usePlayerState } from '@/stores/playerState';
  import { useTrackAttrState } from '@/stores/trackAttribute';
  import type FFManager from '@/utils/ffmpegManager';
  const store = usePageState();
  const playerStore = usePlayerState();
  const attrStore = useTrackAttrState();
  const ffmpeg = inject('ffmpeg') as FFManager;
  const size = ref(14);
  const color = '#fff';
  const inner = ref(true);
  const switchClass = computed(() => ({
    '--el-switch-border-color': store.isDark ? '#4B5563' : '#D1D5DB',
    '--el-color-white': store.isDark ? '#F3F4F6' : '#374151'
  }));
  const exporting = ref(false);
  const canExport = computed(() => {
    const hasAudio = playerStore.audioPlayData && playerStore.audioPlayData.length > 0;
    const ffReady = ffmpeg && ffmpeg.isLoaded && ffmpeg.isLoaded.value;
    return hasAudio && ffReady && !exporting.value;
  });

  async function handleExport() {
    if (!canExport.value || !ffmpeg) {
      return;
    }
    try {
      exporting.value = true;
      const { audioUrl } = await ffmpeg.getAudio(playerStore.audioPlayData, toRaw(attrStore.trackAttrMap));
      if (!audioUrl) {
        return;
      }
      const link = document.createElement('a');
      link.href = audioUrl;
      const time = new Date();
      const name = `ccclip_export_${time.getFullYear()}${format2(time.getMonth() + 1)}${format2(time.getDate())}_${format2(time.getHours())}${format2(time.getMinutes())}${format2(time.getSeconds())}.mp3`;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      exporting.value = false;
    }
  }

  function format2(value: number) {
    return (value < 10 ? '0' : '') + value;
  }
</script>

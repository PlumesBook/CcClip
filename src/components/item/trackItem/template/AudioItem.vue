<template>
  <div class="flex flex-col rounded overflow-hidden h-full relative bg-blue-500/20 border border-blue-500/30">
    <!-- Info Overlay -->
    <div class="absolute top-0.5 left-1 z-10 flex items-center max-w-full overflow-hidden pointer-events-none">
      <span class="text-[10px] text-blue-100/90 drop-shadow-md truncate font-medium">{{ trackItem.name }}</span>
    </div>

    <div class="overflow-hidden flex-1 relative mt-1">
      <img :src="waveFileUrl" v-show="waveFileUrl" class="absolute left-0 right-0 top-0 bottom-0 h-full min-w-full opacity-90 mix-blend-overlay filter brightness-125" :style="waveStyle" alt="">
    </div>
    <Loading v-show="loading" class="pl-12 bg-opacity-70" />
  </div>
</template>

<script setup lang="ts">
  import Loading from '@/components/Loading.vue';
  import type FFManager from '@/utils/ffmpegManager';
  import { computed, inject, ref, watch, PropType } from 'vue';
  import { usePlayerState } from '@/stores/playerState';
  import trackCheckPlaying from './trackCheckPlaying';
  import { AudioTractItem } from '@/stores/trackState';
  const props = defineProps({
    trackItem: {
      type: Object as PropType<AudioTractItem>,
      default() {
        return {
          showWidth: '0px',
          showLeft: '0px'
        };
      }
    }
  });
  const store = usePlayerState();
  store.ingLoadingCount++;
  const waveStyle = computed(() => {
    const { start, end, offsetL, offsetR, frameCount } = props.trackItem;
    const showFrameCount = end - start;
    return {
      transform: `scaleX(${(frameCount / showFrameCount).toFixed(2)})`,
      transformOrigin: 'left top',
      left: `-${offsetL / showFrameCount * 100}%`,
      right: `-${offsetR / showFrameCount * 100}%`
    };
  });
  const ffmpeg = inject('ffmpeg') as FFManager;
  const loading = ref(true);
  const waveFileUrl = ref('');
  async function initAudio() {
    const { name, source, format, frameCount } = props.trackItem;
    if (name && source && ffmpeg.isLoaded.value) {
      const audioName = `${name}.${format}`;
      // 写文件
      await ffmpeg.writeFile(ffmpeg.pathConfig.resourcePath, audioName, source);
      await ffmpeg.genWave(name, frameCount, format);
      waveFileUrl.value = ffmpeg.getWavePng(name);
      loading.value = false;
      store.ingLoadingCount--;
    }
  }
  watch(() => {
    return props.trackItem.source && ffmpeg.isLoaded.value;
  }, initAudio, {
    immediate: true
  });
  trackCheckPlaying(props);
</script>
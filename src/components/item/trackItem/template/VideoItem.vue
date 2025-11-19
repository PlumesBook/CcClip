<template>
    <div class="flex flex-col rounded overflow-hidden h-full relative group">
        <div ref="container" class="overflow-hidden bg-cc-surface-light/50 flex-1 relative">
          <VideoFrame
              type="video"
              :trackItem="trackItem"
              :drawState="!loading"
          />
          <!-- Text Overlay -->
          <div class="absolute top-0.5 left-1 right-1 z-10 flex items-center justify-between pointer-events-none">
             <span class="text-[10px] text-white/90 drop-shadow-md truncate max-w-[80%] font-medium">{{ `${trackItem.name}.${trackItem.format}` }}</span>
          </div>
        </div>
        
        <!-- Audio Waveform Strip (if audio exists in video) -->
        <div class="h-1/3 bg-blue-900/30 relative overflow-hidden border-t border-white/10">
          <img :src="waveFileUrl" v-show="waveFileUrl" class="absolute left-0 right-0 top-0 bottom-0 h-full min-w-full opacity-80" :style="waveStyle" alt="">
        </div>
        
        <Loading v-show="loading" class="pl-12 bg-opacity-70" />
    </div>
</template>

<script setup lang="ts">
  import VideoFrame from '@/components/item/trackItem/VideoFrame.vue';
  import Loading from '@/components/Loading.vue';
  import type { PropType } from 'vue';
  import type { VideoTractItem } from '@/stores/trackState';
  import type FFManager from '@/utils/ffmpegManager';
  import { usePlayerState } from '@/stores/playerState';
  import trackCheckPlaying from './trackCheckPlaying';
  import { computed, inject, ref, watch } from 'vue';
  const props = defineProps({
    trackItem: {
      type: Object as PropType<VideoTractItem>,
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
  const container = ref();
  const ffmpeg = inject('ffmpeg') as FFManager;
  const loading = ref(true);
  const waveFileUrl = ref('');
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
  async function initVideo() {
    const { name, source, format, frameCount, width, height } = props.trackItem;
    if (name && source && ffmpeg.isLoaded.value) {
      const videoName = `${name}.${format}`;
      // 写文件
      await ffmpeg.writeFile(ffmpeg.pathConfig.resourcePath, videoName, source);
      // 分离音频
      await ffmpeg.splitAudio(name, format);
      // 视频抽帧
      await ffmpeg.genFrame(name, format, {
        w: width,
        h: height
      });
      await ffmpeg.genWave(name, frameCount);
      waveFileUrl.value = ffmpeg.getWavePng(name);
      loading.value = false;
      store.ingLoadingCount--;
    }
  }
  watch(() => {
    return props.trackItem.source && ffmpeg.isLoaded.value;
  }, initVideo, {
    immediate: true,
    flush: 'post'
  });
  trackCheckPlaying(props);
</script>
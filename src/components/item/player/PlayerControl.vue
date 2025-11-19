<template>
  <div class="flex items-center justify-between absolute bottom-0 left-0 right-0 px-4 h-10 bg-cc-surface border-t border-cc-border select-none z-30">
    <div class="flex items-center gap-2 w-24">
      <span class="text-xs font-mono text-cc-primary">{{ playTime }}</span>
      <span class="text-xs text-cc-text-sub">/</span>
      <span class="text-xs font-mono text-cc-text-sub">{{ allTime }}</span>
    </div>
    
    <div class="flex items-center gap-4 absolute left-1/2 -translate-x-1/2">
      <div 
         class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 cursor-pointer transition-colors"
         :class="[disable ? 'cursor-not-allowed opacity-50' : '']"
         @click="togglePlay"
      >
         <ElIcon :size="20" color="#fff">
            <VideoPause v-show="!store.isPause" />
            <VideoPlay v-show="store.isPause" class="ml-0.5" />
         </ElIcon>
      </div>
    </div>

    <div class="flex items-center gap-3 w-24 justify-end">
       <!-- Placeholder for Fullscreen/Volume -->
       <ElIcon :size="16" class="text-cc-text-sub hover:text-white cursor-pointer"><FullScreen /></ElIcon>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { VideoPlay, VideoPause, FullScreen } from '@element-plus/icons-vue';
  import { ref, computed, watch } from 'vue';
  import { formatPlayerTime } from '@/utils/common';
  import { usePlayerState } from '@/stores/playerState';
  const props = defineProps({
    disable: {
      type: Boolean,
      default: false
    }
  });
  const store = usePlayerState();
  const playTime = computed(() => {
    return formatPlayerTime(store.playStartFrame);
  });
  const allTime = computed(() => {
    return formatPlayerTime(store.frameCount);
  });
  let playTimer = ref();
  const timeStamp = 1000 / 30;
  
  const togglePlay = () => {
    if (store.isPause) {
        startPlay();
    } else {
        pauseVideo();
    }
  }

  // 视频暂停
  const pauseVideo = () => {
    if (props.disable) return;
    store.isPause = true;
    clearInterval(playTimer.value);
  };
  function startPlay() {
    if (props.disable) return;
    if (store.playStartFrame >= store.frameCount) {
      store.playStartFrame = 0;
    }
    store.isPause = false;
    clearInterval(playTimer.value);
    playTimer.value = setInterval(() => {
      store.playStartFrame++;
      if (store.playStartFrame === store.frameCount) {
        pauseVideo();
      }
    }, timeStamp);
  }
  watch(() => store.isPause, () => {
    if (store.isPause) {
      pauseVideo();
    } else {
      startPlay();
    }
  });
</script>

<style scoped>

</style>
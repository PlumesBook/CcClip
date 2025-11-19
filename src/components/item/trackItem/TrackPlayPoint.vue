<template>
  <div
      class="z-30 w-px absolute -top-5 bottom-0 bg-cc-primary transition-transform duration-75 pointer-events-none"
      :style="trackStyle"
  >
    <div class="playPoint block absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-cc-primary rotate-45 rounded-tl-[50%] rounded-tr-[50%] rounded-bl-[50%] z-40 shadow-[0_0_4px_rgba(0,229,255,0.6)]"></div>
  </div>
</template>

<script setup lang="ts">
  import { getGridPixel } from '@/utils/canvasUtil';
  import { computed } from 'vue';
  import { useTrackState } from '@/stores/trackState';
  import { usePlayerState } from '@/stores/playerState';
  const offsetLine = {
    left: 10
  };
  const trackStore = useTrackState();
  const playStore = usePlayerState();
  const trackStyle = computed(() => {
    return {
      left: `${offsetLine.left}px`,
      transform: `translate(${getGridPixel(trackStore.trackScale, playStore.playStartFrame)}px, 0px)`
    };
  });
</script>

<style scoped>
  /* Shape is handled by tailwind classes now */
</style>
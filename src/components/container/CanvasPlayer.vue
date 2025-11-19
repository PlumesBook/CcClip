<template>
  <div class="flex-1 overflow-hidden relative bg-black flex flex-col border-l border-r border-cc-border" ref="playerContent" @click="cancelSelect">
    <!-- Simple Player Header -->
    <div class="h-10 shrink-0 flex items-center justify-center select-none pointer-events-none bg-cc-surface border-b border-cc-border">
       <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-cc-text-sub">Player</span>
          <span class="text-[10px] text-cc-text-sub/50">{{ containerSize.width }}x{{ containerSize.height }}</span>
       </div>
    </div>
    
    <!-- Player Area -->
    <div class="flex-1 relative bg-[#000000] flex items-center justify-center overflow-hidden">
       <Player :containerSize="containerSize" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import Player from '@/components/item/player/Player.vue';
  import { usePlayerState } from '@/stores/playerState';
  import { usePageState } from '@/stores/pageState';
  import { watch, ref, onMounted, reactive } from 'vue';
  import { useTrackState } from '@/stores/trackState';
  const pageStore = usePageState();
  const store = usePlayerState();
  const trackStore = useTrackState();
  const playerContent = ref();
  const containerSize = reactive({
    width: 0,
    height: 0
  });
  function cancelSelect(event: MouseEvent) {
    event.stopPropagation();
    trackStore.selectTrackItem.line = -1;
    trackStore.selectTrackItem.index = -1;
  }
  // 更新画布尺寸
  function updateContainerSize() {
    let { width: maxW, height: maxH } = playerContent.value.getBoundingClientRect();
    containerSize.width = maxW;
    containerSize.height = maxH;
  }
  onMounted(() => {
    updateContainerSize();
  });
  window.addEventListener('resize', updateContainerSize, false);
  watch(() => pageStore.trackHeight, () => {
    updateContainerSize();
  }, {
    flush: 'post'
  });
  watch([() => store.playerHeight, () => store.playerWidth], () => {
    updateContainerSize();
  }, {
    flush: 'post'
  });
</script>

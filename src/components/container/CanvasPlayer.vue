<template>
  <div class="flex-1 overflow-hidden relative bg-cc-bg flex flex-col" ref="playerContent" @click="cancelSelect">
    <div class="h-10 flex items-center justify-center select-none pointer-events-none opacity-50">
       <!-- Optional: Player Controls or Info could go here, keeping it empty for now or subtle title -->
       <span class="text-xs text-cc-text-sub">视频预览</span>
    </div>
    <Player :containerSize="containerSize" class="flex-1" />
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

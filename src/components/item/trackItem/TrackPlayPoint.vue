<template>
  <div class="z-30 w-px absolute -top-5 bottom-0 bg-gray-700 dark:bg-gray-100 cursor-ew-resize"
    :class="{ 'transition-transform duration-75': !isDragging }" :style="trackStyle" @mousedown="handleMouseDown">
    <span
      class="playPoint block border-1 border-gray-600 bg-gray-600 h-3 w-2.5 dark:border-gray-100 dark:bg-gray-100 sticky top-0 right-0 left-0" />
  </div>
</template>

<script setup lang="ts">
import { getGridPixel, getSelectFrame } from '@/utils/canvasUtil';
import { computed, ref } from 'vue';
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

const isDragging = ref(false);

function handleMouseDown(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
  isDragging.value = true;

  const startX = event.clientX;
  const startFrame = playStore.playStartFrame;
  const scale = trackStore.trackScale;
  const step = 30; // Default FPS

  let animationFrameId: number | null = null;

  const onMouseMove = (e: MouseEvent) => {
    if (animationFrameId) return;

    animationFrameId = requestAnimationFrame(() => {
      const deltaX = e.clientX - startX;
      const startPixel = getGridPixel(scale, startFrame);
      const newPixel = startPixel + deltaX;

      // Ensure non-negative
      const targetPixel = Math.max(0, newPixel);

      // Convert back to frame
      let newFrame = getSelectFrame(targetPixel, scale, step);

      // Limit to max frame
      const maxFrame = playStore.frameCount;
      newFrame = Math.min(newFrame, maxFrame);

      playStore.playStartFrame = newFrame;
      playStore.playAudioFrame = newFrame;

      animationFrameId = null;
    });
  };

  const onMouseUp = () => {
    isDragging.value = false;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}
</script>

<style scoped>
.playPoint {
  transform: translateX(-50%);
}

.playPoint::after {
  content: '';
  display: block;
  width: 10px;
  height: 10px;
  border: 5px solid;
  position: absolute;
  top: 100%;
  border-right-color: transparent;
  border-left-color: transparent;
  border-bottom-color: transparent;
}
</style>
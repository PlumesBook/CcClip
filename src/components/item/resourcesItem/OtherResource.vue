<template>
  <div
    class="inline-block relative w-[calc(50%-4px)] group mb-2 cursor-grab active:cursor-grabbing"
    draggable="true"
    @dragstart="dragStart"
  >
    <div class="relative w-full aspect-video rounded overflow-hidden bg-cc-surface border border-cc-border group-hover:border-cc-primary transition-colors">
      <img
        referrerpolicy="no-referrer"
        class="w-full h-full object-cover block select-none"
        :src="formatData.cover"
        @mousemove="showGif($event, formatData.source)"
        @mouseout="showGif($event, formatData.cover)"
      >
      <!-- Time Badge -->
      <div v-show="showData.showTime" class="absolute bottom-1 right-1 bg-black/60 px-1 rounded text-[10px] text-white font-mono tabular-nums backdrop-blur-sm">
        {{ formatTime(formatData.time).str }}
      </div>
      
      <!-- Hover Actions -->
      <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
         <div
            class="w-8 h-8 rounded-full bg-cc-primary flex items-center justify-center text-white hover:scale-110 transition-transform cursor-pointer shadow-lg"
            @click="addTrack"
        >
          <ElIcon :size="18"><Plus /></ElIcon>
        </div>
        <div
            v-if="closable"
            class="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white hover:scale-110 transition-transform cursor-pointer shadow-lg"
            @click.stop="handleDelete"
        >
          <ElIcon :size="16"><Delete /></ElIcon>
        </div>
      </div>
    </div>
    
    <div class="mt-1.5 px-0.5">
      <p class="text-xs text-cc-text-main truncate" :title="formatData.name">{{ formatData.name }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { Plus, Delete } from '@element-plus/icons-vue';
  import type { ImageTractItem } from '@/stores/trackState';
  import { formatTime } from '@/utils/common';
  import { computed } from 'vue';
  import { formatTrackItemData } from '@/utils/storeUtil';
  import { useTrackState } from '@/stores/trackState';
  import { usePlayerState } from '@/stores/playerState';
  import { ElMessageBox } from 'element-plus';

  const props = defineProps({
    data: {
      type: Object,
      default() {
        return {};
      }
    },
    type: {
      type: String,
      default: ''
    },
    closable: {
      type: Boolean,
      default: false
    }
  });
  const emit = defineEmits(['delete']);
  const formatData = computed(() => {
    let { time, frameCount } = props.data;
    if (props.type === 'video' && !time) {
      time = parseInt(`${frameCount / 30 * 1000}`);
    }
    return {
      ...props.data,
      time
    };
  });
  const showData = computed(() => {
    return {
      showName: true, // Always show name in CapCut style
      showTime: ['video'].includes(props.type)
    };
  });
  const store = useTrackState();
  const playStore = usePlayerState();
  function dragStart(event: DragEvent) {
    event.stopPropagation();
    const dragInfo = {
      type: props.type,
      ...formatData.value
    };
    store.dragData.dataInfo = JSON.stringify(dragInfo);
    store.dragData.dragType = props.type;
    store.dragData.dragPoint.x = event.offsetX;
    store.dragData.dragPoint.y = event.offsetY;
    store.selectTrackItem.line = -1;
    store.selectTrackItem.index = -1;
  }
  function addTrack(event: MouseEvent) {
    event.stopPropagation();
    const dragInfo = {
      type: props.type,
      ...formatData.value
    };
    store.addTrack(formatTrackItemData(dragInfo, playStore.playStartFrame));
  }
  function showGif(event: MouseEvent, imageSource: ImageTractItem['type']) {
    if (['image'].includes(props.type) && event.target) {
      (event.target as HTMLImageElement).src = imageSource;
    }
  }
  function handleDelete() {
    ElMessageBox.confirm(
      '确认删除该文件吗？删除后无法恢复。',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        customClass: 'cc-message-box'
      }
    )
      .then(() => {
        emit('delete', props.data);
      })
      .catch(() => {
        // catch cancel
      });
  }
</script>
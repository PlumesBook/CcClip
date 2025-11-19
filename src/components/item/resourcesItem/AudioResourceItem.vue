<template>
  <div
      class="relative w-full flex flex-row p-2 rounded border border-transparent hover:bg-cc-surface-light group transition-colors cursor-grab active:cursor-grabbing"
      :class="{'bg-cc-surface-light': false}"
      draggable="true"
      @dragstart="dragStart"
  >
    <div class="w-10 h-10 rounded bg-cc-surface flex items-center justify-center shrink-0 overflow-hidden border border-cc-border">
       <img v-if="data.cover" class="w-full h-full object-cover" :src="data.cover">
       <ElIcon v-else :size="20" class="text-cc-primary-blue">
         <Headset />
       </ElIcon>
    </div>
    <div class="flex-1 flex flex-col justify-center ml-3 overflow-hidden">
      <p class="text-xs text-cc-text-main truncate font-medium">{{ data.name }}</p>
      <span class="text-[10px] text-cc-text-sub mt-0.5"> {{ formatTime(data.time).str }} </span>
    </div>
    
    <!-- Hover Actions -->
    <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
       <div
          v-if="closable"
          class="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/20 hover:text-red-500 text-cc-text-sub transition-colors cursor-pointer"
          @click.stop="handleDelete"
      >
        <ElIcon :size="14"><Delete /></ElIcon>
      </div>
      <div
          class="w-6 h-6 flex items-center justify-center rounded hover:bg-cc-primary/20 hover:text-cc-primary text-cc-text-sub transition-colors cursor-pointer"
          @click="addTrack"
      >
        <ElIcon :size="16"><Plus /></ElIcon>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { Plus, Delete, Headset } from '@element-plus/icons-vue';
  import type { AudioTractItem } from '@/stores/trackState';
  import { formatTime } from '@/utils/common';
  import { formatTrackItemData } from '@/utils/storeUtil';
  import { useTrackState } from '@/stores/trackState';
  import { usePlayerState } from '@/stores/playerState';
  import { ElMessageBox } from 'element-plus';

  const props = defineProps({
    data: {
      type: Object,
      default() {
        return {} as AudioTractItem;
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
  const store = useTrackState();
  const playerStore = usePlayerState();
  function dragStart(event: DragEvent) {
    event.stopPropagation();
    const dragInfo = {
      type: props.type,
      ...props.data
    };
    playerStore.isPause = true;
    store.dragData.dataInfo = JSON.stringify(dragInfo);
    store.dragData.dragType = props.type;
    store.dragData.dragPoint.x = event.offsetX;
    store.dragData.dragPoint.y = event.offsetY;
    store.selectTrackItem.line = -1;
    store.selectTrackItem.index = -1;
  }
  function addTrack(event: MouseEvent) {
    playerStore.isPause = true;
    event.stopPropagation();
    const dragInfo = {
      type: props.type,
      ...props.data
    };
    store.addTrack(formatTrackItemData(dragInfo, playerStore.playStartFrame));
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
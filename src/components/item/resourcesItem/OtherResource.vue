<template>
  <div
    class="inline-block relative w-22 group"
    draggable="true"
    @dragstart="dragStart"
  >
    <img
      referrerpolicy="no-referrer"
      class=" cursor-pointer w-full h-24 block select-none dark:hover:border-cyan-800 hover:border-cyan-200 box-border"
      :class="type === 'video' ? 'w-34 border-2 dark:border-gray-800 border-gray-50' : 'w-22 border dark:border-gray-700 border-gray-200'"
      :src="formatData.cover"
      @mousemove="showGif($event, formatData.source)"
      @mouseout="showGif($event, formatData.cover)"
    >
    <label class="mt-1 mb-3 text-xs w-full text-center select-none dark:text-gray-400 text-gray-600" v-show="showData.showName">{{ formatData.name }}</label>
    <span class="h-5 absolute bottom-1 right-2 text-xs text-gray-400" v-show="showData.showTime">{{ formatTime(formatData.time).str }}</span>
    <div
        v-if="closable"
        class="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10"
    >
      <el-button type="danger" :icon="Close" circle size="small" @click.stop="handleDelete" />
    </div>
    <div
        class="absolute top-16 right-1 bg-blue-500 rounded-full w-6 h-6 opacity-0 hover:opacity-100 transition-opacity duration-150"
        @click="addTrack"
    >
      <ElIcon :size="16" color="#fff" class="cursor-pointer p-1 box-content">
        <Plus />
      </ElIcon>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { Plus, Close } from '@element-plus/icons-vue';
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
      showName: ['effect', 'transition', 'filter'].includes(props.type),
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
<template>
  <div class="cc-resource-card" draggable="true" @dragstart="dragStart">
    <div class="cc-thumb-wrapper">
      <img 
        referrerpolicy="no-referrer"
        class="cc-resource-thumb"
        :src="formatData.cover"
        @mousemove="showGif($event, formatData.source)" 
        @mouseout="showGif($event, formatData.cover)"
      >
      <span class="cc-resource-time" v-if="showData.showTime">{{ formatTime(formatData.time).str }}</span>
      <div v-if="closable" class="cc-delete-btn">
        <el-button type="danger" :icon="Close" circle size="small" @click.stop="handleDelete" />
      </div>
      <div class="cc-add-btn" @click.stop="addTrack">
        <Plus />
      </div>
    </div>
    <label class="cc-resource-name" v-if="showData.showName">{{ formatData.name }}</label>
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
  let { time, frameCount } = props.data as any;
  if (props.type === 'video' && !time) {
    time = parseInt(`${frameCount / 30 * 1000}`);
  }
  return {
    ...(props.data as any),
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

<style lang="scss" scoped>
.cc-resource-card {
  display: block;
  cursor: pointer;

  &:hover {
    .cc-delete-btn {
      opacity: 1;
    }

    .cc-add-btn {
      opacity: 1;
    }

    .cc-resource-thumb {
      opacity: 0.85;
    }
  }
}

.cc-thumb-wrapper {
  position: relative;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cc-resource-thumb {
  width: auto;
  height: 100%;
  max-width: 200px;
  display: block;
  user-select: none;
  object-fit: contain;
  background-color: #2d2d30;
  transition: opacity 0.15s ease;
}

.cc-resource-name {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  max-width: 200px;
  text-align: left;
  user-select: none;
  color: #a0a0a0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cc-resource-time {
  position: absolute;
  bottom: 8px;
  left: 8px;
  font-size: 11px;
  color: #ffffff;
  background-color: rgba(0, 0, 0, 0.65);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.cc-delete-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 10;
}

.cc-add-btn {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  background-color: #00B5FF;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    background-color: #00a3e6;
    transform: scale(1.05);
  }
}
</style>
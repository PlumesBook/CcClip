<template>
  <div class="cc-audio-card" draggable="true" @dragstart="dragStart">
    <img class="cc-audio-cover" :src="data.cover">
    <div class="cc-audio-info">
      <p class="cc-audio-name">{{ data.name }}</p>
      <span class="cc-audio-time">{{ formatTime(data.time).str }}</span>
    </div>
    <div class="cc-audio-overlay">
      <div class="cc-play-area">
        <VideoPlay class="cc-play-icon" />
      </div>
      <div v-if="closable" class="cc-delete-btn">
        <el-button type="danger" :icon="Close" circle size="small" @click.stop="handleDelete" />
      </div>
      <div class="cc-add-btn" @click="addTrack">
        <Plus />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, VideoPlay, Close } from '@element-plus/icons-vue';
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
.cc-audio-card {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: row;
  padding-right: 4px;
  border: 1px solid #2a2b2d;
  background-color: #1e1f21;
  border-radius: 6px;
  transition: border-color 0.15s ease;

  &:hover {
    border-color: #00B5FF;

    .cc-audio-overlay {
      opacity: 1;
    }
  }
}

.cc-audio-cover {
  width: 72px;
  height: 72px;
  border-radius: 6px 0 0 6px;
  object-fit: cover;
}

.cc-audio-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  overflow: hidden;
}

.cc-audio-name {
  max-height: 36px;
  overflow: hidden;
  font-size: 13px;
  flex: 1;
  color: #e0e0e0;
  margin: 0;
  line-height: 1.4;
}

.cc-audio-time {
  font-size: 12px;
  height: 20px;
  color: #6a6a6a;
  margin-top: 4px;
}

.cc-audio-overlay {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  opacity: 0;
  transition: opacity 0.2s ease;
  border-radius: 6px;
}

.cc-play-area {
  cursor: pointer;
  border-radius: 6px 0 0 6px;
  width: 72px;
  height: 72px;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;

  .cc-play-icon {
    width: 32px;
    height: 32px;
    color: #ffffff;
  }
}

.cc-delete-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 10;
}

.cc-add-btn {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  background-color: #00B5FF;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #ffffff;

  svg {
    width: 14px;
    height: 14px;
  }

  &:hover {
    background-color: #00a3e6;
  }
}
</style>
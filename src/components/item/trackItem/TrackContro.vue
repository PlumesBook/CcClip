<template>
  <div class="h-full flex items-center justify-between bg-transparent w-full">
    <div
      class="flex items-center gap-1"
    >
      <div v-for="item of icons" :key="item.title" @click="handlerIcon(item)">
        <el-tooltip
          :disabled="item.disable"
          effect="dark"
          :content="item.title"
          placement="top"
          :show-after="500"
        >
          <div 
            class="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 transition-colors cursor-pointer"
            :class="item.disable ? 'opacity-30 cursor-not-allowed' : 'opacity-80 hover:opacity-100 hover:text-cc-primary'"
          >
            <component
              :is="item.icon"
              class="focus:outline-0 w-4 h-4 text-current"
            />
          </div>
        </el-tooltip>
      </div>
    </div>
    <div class="flex items-center w-40 gap-2 ml-auto">
      <div class="w-5 h-5 flex items-center justify-center cursor-pointer text-cc-text-sub hover:text-white transition-colors" @click="changeScale(-10)">
         <ElIcon :size="12"><Minus /></ElIcon>
      </div>
      <el-slider 
        v-model="modelValue" 
        v-bind="sliderProps" 
        class="flex-1 cc-slider-mini"
        :show-tooltip="false"
      />
      <div class="w-5 h-5 flex items-center justify-center cursor-pointer text-cc-text-sub hover:text-white transition-colors" @click="changeScale(10)">
        <ElIcon :size="12"><Plus /></ElIcon>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { usePageState } from '@/stores/pageState';
  import { useTrackState } from '@/stores/trackState';
  import { usePlayerState } from '@/stores/playerState';
  import { getId } from '@/utils/common';
  import { ref, reactive, computed } from 'vue';
  import { Minus, Plus } from '@element-plus/icons-vue';

  const props = defineProps({
    modelValue: {
      type: Number,
      default: 30
    }
  });
  const emit = defineEmits({
    'update:modelValue': val => {
      return val !== null;
    }
  });
  const modelValue = computed({
    get() {
      return props.modelValue;
    },
    set(value) {
      emit('update:modelValue', value);
    }
  });
  const store = usePageState();
  const trackStore = useTrackState();
  const playerStore = usePlayerState();
  const statePoint = computed(() => store._stepInfo.statePoint);
  const stateLength = computed(() => store._stepInfo.stateLength);

  const sliderProps = reactive({
    size: 'small' as 'small' | 'default' | 'large',
    step: 10,
    max: 100,
    min: 0
  });
  function changeScale(val: number) {
    let newVal = modelValue.value + val;
    if (newVal > sliderProps.max) newVal = sliderProps.max;
    if (newVal < sliderProps.min) newVal = sliderProps.min;
    modelValue.value = newVal;
  }
  const icons = computed(() => [
    {
      title: '撤销',
      disable: stateLength.value === 0 || statePoint.value === 0,
      icon: 'UndoIcon'
    },
    {
      title: '前进',
      disable: statePoint.value === stateLength.value,
      icon: 'RedoIcon'
    },
    {
      title: '分割',
      disable: trackStore.selectTrackItem.line === -1 && trackStore.selectTrackItem.index === -1,
      icon: 'SplitIcon'
    },
    {
      title: '删除',
      disable: trackStore.selectTrackItem.line === -1 && trackStore.selectTrackItem.index === -1,
      icon: 'DeleteIcon'
    }
  ]);

  function handlerIcon(item: Record<string, any>) {
    const { icon: type, disable } = item;
    if (disable) {
      return;
    }
    if (type === 'DeleteIcon') {
      if (trackStore.selectTrackItem.line !== -1 && trackStore.selectTrackItem.index !== -1) {
        trackStore.removeTrack(trackStore.selectTrackItem.line, trackStore.selectTrackItem.index);
        trackStore.selectTrackItem.line = -1;
        trackStore.selectTrackItem.index = -1;
      }
    } else if (type === 'UndoIcon') {
      store._undo();
    } else if (type === 'RedoIcon') {
      store._redo();
    } else if (type === 'SplitIcon') {
      // 判断分割时间是否在视频内
      let splitTime = playerStore.playStartFrame;
      let active = trackStore.trackList[trackStore.selectTrackItem.line].list[trackStore.selectTrackItem.index];

      if (splitTime > active.start && splitTime < active.end && active.type === 'video') {
        let copy = JSON.parse(JSON.stringify(active));

        active.end = splitTime;
        active.offsetR = active.frameCount - active.end;

        copy.start = splitTime;
        copy.offsetL = splitTime - 1;

        copy.id = getId();
        trackStore.addTrack(copy, trackStore.selectTrackItem.line, false, 0);
      }
    }
  }
</script>

<style scoped>
  :deep(.cc-slider-mini .el-slider__runway) {
    height: 2px;
    background-color: #4B5563;
  }
  :deep(.cc-slider-mini .el-slider__bar) {
    height: 2px;
    background-color: #9CA3AF;
  }
  :deep(.cc-slider-mini .el-slider__button) {
    width: 8px;
    height: 8px;
    border: none;
    background-color: #E5E7EB;
  }
  :deep(.cc-slider-mini:hover .el-slider__button) {
    transform: scale(1.2);
  }
</style>
<template>
  <div
      class="text-left text-sm top-0 absolute rounded overflow-hidden ring-2 ring-transparent transition-all"
      :class="[
        TrackHeightMap.get(props.trackItem.type), 
        isDragState ? 'opacity-50' : '',
        isActive ? 'ring-cc-primary z-10' : 'hover:ring-cc-primary/50'
      ]"
      :style="itemClass"
      @click="setSelectTract"
  >
    <!-- 操作手柄 -->
    <TrackHandler :isActive="isActive" :lineIndex="lineIndex" :itemIndex="itemIndex" />
    <!-- 容器 -->
    <component
        :is="componentMap.get(trackItem.type)"
        :trackItem="trackItem"
    />
  </div>
</template>

<script setup lang="ts">
  import TrackHandler from '@/components/item/trackItem/TrackHandler.vue';
  import VideoItem from '@/components/item/trackItem/template/VideoItem.vue';
  import AudioItem from '@/components/item/trackItem/template/AudioItem.vue';
  import TextItem from '@/components/item/trackItem/template/TextItem.vue';
  import ImageItem from '@/components/item/trackItem/template/ImageItem.vue';
  import EffectItem from '@/components/item/trackItem/template/EffectItem.vue';
  import TransitionItem from '@/components/item/trackItem/template/TransitionItem.vue';
  import FilterItem from '@/components/item/trackItem/template/FilterItem.vue';
  import { TrackHeightMap } from '@/data/trackConfig';
  import { useTrackState } from '@/stores/trackState';
  import { computed, shallowRef } from 'vue';
  const props = defineProps({
    trackType: {
      type: String,
      default: ''
    },
    lineIndex: {
      type: Number,
      default: 0
    },
    itemIndex: {
      type: Number,
      default: 0
    },
    trackItem: {
      type: Object,
      default() {
        return {
          width: '0px',
          left: '0px'
        };
      }
    }
  });
  const store = useTrackState();
  const itemClass = computed(() => {
    return {
      width: props.trackItem.showWidth,
      left: props.trackItem.showLeft
    };
  });
  const isActive = computed(() => {
    return store.selectTrackItem.line === props.lineIndex && store.selectTrackItem.index === props.itemIndex;
  });
  
  // Use shallowRef and any for the map to avoid strict prop typing issues with dynamic components
  const componentMap = new Map<string, any>([
    ['video', VideoItem],
    ['audio', AudioItem],
    ['text', TextItem],
    ['image', ImageItem],
    ['effect', EffectItem],
    ['transition', TransitionItem],
    ['filter', FilterItem]
  ]);
  const isDragState = computed(() => {
    return store.moveTrackData.lineIndex === props.lineIndex && store.moveTrackData.itemIndex === props.itemIndex;
  });
  function setSelectTract(event:Event) {
    event.preventDefault();
    event.stopPropagation();
    store.selectTrackItem.line = props.lineIndex;
    store.selectTrackItem.index = props.itemIndex;
  }
</script>
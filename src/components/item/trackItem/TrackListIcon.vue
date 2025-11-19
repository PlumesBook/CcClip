<template>
  <div ref="iconList" class="relative w-10 flex h-full flex-col items-center justify-start overflow-hidden border-r border-cc-border bg-cc-bg pt-0">
    <div class="absolute top-5 min-w-full flex flex-col items-center w-full">
      <template v-for="(lineData, lineIndex) of listData" :key="lineIndex">
        <div
            class="z-10 flex justify-center items-center w-full text-center mb-1 mt-1 relative group"
            :class="[TrackHeightMap.get(lineData.type)]"
        >
           <!-- Track Type Icon -->
           <div 
             class="w-6 h-6 rounded flex items-center justify-center transition-colors"
             :class="[lineData.main ? 'text-cc-primary bg-cc-primary/10' : 'text-cc-text-sub bg-cc-surface-light group-hover:text-white']"
           >
             <component :is="componentMap.get(lineData.type)" class="w-4 h-4" />
           </div>
           
           <!-- Main Track Indicator Dot -->
           <div v-if="lineData.main" class="absolute right-0.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-cc-primary"></div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, watch } from 'vue';
  import VideoIcon from '@/components/icons/VideoIcon.vue';
  import AudioIcon from '@/components/icons/AudioIcon.vue';
  import TextIcon from '@/components/icons/TextIcon.vue';
  import ImageIcon from '@/components/icons/ImageIcon.vue';
  import EffectsIcon from '@/components/icons/EffectsIcon.vue';
  import TransitionIcon from '@/components/icons/TransitionIcon.vue';
  import FilterIcon from '@/components/icons/FilterIcon.vue';
  import { TrackHeightMap } from '@/data/trackConfig';
  const props = defineProps({
    listData: {
      type: Array,
      default() {
        return [];
      }
    },
    offsetTop: {
      type: Number,
      default: 0
    }
  });
  const componentMap = new Map([
    ['video', VideoIcon],
    ['audio', AudioIcon],
    ['text', TextIcon],
    ['image', ImageIcon],
    ['effect', EffectsIcon],
    ['transition', TransitionIcon],
    ['filter', FilterIcon]
  ]);
  const iconList = ref();
  watch(() => props.offsetTop, () => {
    if (iconList.value) {
        iconList.value.scrollTop = props.offsetTop;
    }
  });
</script>
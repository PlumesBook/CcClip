<template>
  <div
    class="overflow-hidden select-none relative flex flex-col bg-cc-bg border-t border-cc-border"
    :style="trackHeight"
  >
    <SplitLine
      class="top-0 left-0 right-0 z-20 opacity-0 hover:opacity-100 transition-opacity"
      direction="horizontal"
      :limitSize="limitSize"
      v-model:newHeight="page.trackHeight"
    />
    <div class="h-10 border-b border-cc-border bg-cc-surface flex items-center px-4 justify-between shrink-0">
       <div class="flex items-center gap-2">
         <!-- Toolbar placeholders can go here -->
       </div>
       <TrackContro
          v-model="store.trackScale"
        />
    </div>
    
    <TrackList class="flex-1 bg-cc-bg" />
  </div>
</template>

<script setup lang="ts">
  import SplitLine from '@/components/SplitLine.vue';
  import TrackContro from '@/components/item/trackItem/TrackContro.vue';
  import TrackList from '@/components/TrackList.vue';
  import { useTrackState } from '@/stores/trackState';
  import { usePageState } from '@/stores/pageState';
  import { computed, reactive } from 'vue';
  const page = usePageState();
  const store = useTrackState();
  const trackHeight = computed(() => ({
    height: `${page.trackHeight}px`
  }));
  const limitSize = reactive({
    minHeight: 200,
    maxHeight: document.body.getBoundingClientRect().height - 200
  });
</script>
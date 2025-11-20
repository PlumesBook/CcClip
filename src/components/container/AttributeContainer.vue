<template>
  <div
    class="select-none relative pl-0 bg-cc-surface border-l border-cc-border flex flex-col"
    :style="attrWidth"
  >
    <SplitLine
      class="top-0 left-0 bottom-0 opacity-0 hover:opacity-100 transition-opacity z-20"
      direction="vertical"
      :limitSize="limitSize"
      disabled
      v-model:newWidth="pageStore.attrWidth"
    />
    
    <!-- Panel Header -->
    <div class="h-10 flex items-center px-4 border-b border-cc-border shrink-0 bg-cc-surface">
       <span class="text-sm font-semibold text-white">属性</span>
    </div>

    <div v-show="selectTrackOptionsConfig.length === 0" class="flex-1 flex flex-col justify-center items-center text-cc-text-sub opacity-50">
      <div class="w-16 h-16 mb-4 rounded-full bg-cc-surface-light flex items-center justify-center">
          <ElIcon :size="32"><Edit /></ElIcon>
      </div>
      <span class="text-xs">选中轨道以编辑属性</span>
    </div>
    
    <div v-if="selectTrackOptionsConfig.length > 0" class="flex-1 overflow-y-auto custom-scrollbar px-3 py-4">
      <AttrContainer :attrData="selectTrackOptionsConfig" :trackId="trackStore.selectResource?.id" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import AttrContainer from '@/components/item/formItem/AttrContainer.vue';
  import { useTrackState } from '@/stores/trackState';
  import SplitLine from '@/components/SplitLine.vue';
  import { usePageState } from '@/stores/pageState';
  import { computed, reactive } from 'vue';
  import { Edit } from '@element-plus/icons-vue';
  
  const pageStore = usePageState();
  const trackStore = useTrackState();

  const TrackOptionsConfig: Record<string, any> = {};
  // 将data下的配置导入
  const attributeFiles = import.meta.glob('@/data/options/*.ts', { eager: true });
  for (const path in attributeFiles) {
    // 匹配末尾的文件名： /xxx/Video.ts -> Video
    const match = path.match(/\/(\w+)\.ts$/);
    if (!match) continue;
    const name = match[1];
    TrackOptionsConfig[name] = (attributeFiles[path] as { Options: Record<string, any> }).Options;
  }

  const selectTrackOptionsConfig = computed(() => {
    const resource = trackStore.selectResource;
    if (!resource || !resource.type) return [];
    const optionsConfig = TrackOptionsConfig[resource.type];
    return optionsConfig ? optionsConfig.attributes : [];
  });
  const attrWidth = computed(() => ({
    width: `${pageStore.attrWidth}px`
  }));
  const limitSize = reactive({
    minWidth: 300,
    maxWidth: 600
  });
</script>

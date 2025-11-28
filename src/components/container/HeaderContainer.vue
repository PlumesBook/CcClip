<template>
  <header
    class="h-12 w-full flex flex-nowrap flex-row items-center justify-between border-b dark:border-gray-600 border-gray-300 px-4">
    <!-- Center: Project Title (Now Left aligned in this section or Center relative to available space) -->
    <!-- Since we want it centered in the header area, we can use flex-1 and text-center, but we removed the left block.
             To keep it centered, we might need a dummy left block or just let it be.
             User said "Title (Center)". Let's try to center it. -->
    <div class="flex-1 flex justify-center">
      <h2 class="text-sm font-medium select-none">
        {{ store.pageTitle }}
      </h2>
    </div>

    <div class="flex items-center gap-4">
      <ElButton color="#626aef" :disabled="!canExport" @click="handleExport" size="small">
        <ElIcon :size="14" class="mr-1">
          <Download />
        </ElIcon>
        导出
      </ElButton>
      <el-switch size="default" :active-icon="Moon" :inactive-icon="Sunny" :inline-prompt="inner" v-model="store.isDark"
        :style="switchClass" />
    </div>
  </header>
  <ElDialog v-model="showExportDialog" width="320px" :show-close="false" :close-on-click-modal="false"
    :close-on-press-escape="false">
    <div class="flex flex-col items-center py-4">
      <ElProgress :percentage="exportProgress" type="circle" :width="80" />
      <div class="mt-4 text-sm font-medium">
        正在导出视频
      </div>
      <div class="mt-1 text-xs text-gray-600">
        {{ phaseLabel }}
      </div>
      <div class="mt-2 text-xs text-gray-500 text-center px-4">
        导出过程中请保持当前页面打开，避免中断任务。
      </div>
    </div>
    <template #footer>
      <div class="w-full flex justify-end">
        <ElButton @click="handleCancelExport" :disabled="!exportAbortController || exportPhase === 'done'">
          取消导出
        </ElButton>
      </div>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
import logoImage from '@/assets/ccLogo.png';
import { ref, computed } from 'vue';
import { Download, Sunny, Moon } from '@element-plus/icons-vue';
import { usePageState } from '@/stores/pageState';
import { useVideoExport } from '@/services/useVideoExport';
const store = usePageState();
const size = ref(14);
const color = '#fff';
const inner = ref(true);
const switchClass = computed(() => ({
  '--el-switch-border-color': store.isDark ? '#4B5563' : '#D1D5DB',
  '--el-color-white': store.isDark ? '#F3F4F6' : '#374151'
}));
const {
  canExport,
  showExportDialog,
  exportProgress,
  phaseLabel,
  startExport,
  cancelExport,
  exportAbortController,
  exportPhase
} = useVideoExport();

const handleExport = () => startExport();
const handleCancelExport = () => cancelExport();
</script>

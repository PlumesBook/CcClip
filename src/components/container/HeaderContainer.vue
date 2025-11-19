<template>
    <header
        class="h-12 w-full flex flex-nowrap flex-row items-center justify-between px-4 bg-cc-surface border-b border-cc-border"
    >
        <div class="flex items-center">
            <div class="w-8 h-8 flex items-center justify-center mr-3">
                <img class="h-6 w-6" :src="logoImage" alt="logo">
            </div>
            <h2 class="text-sm font-medium text-cc-text-main select-none">
                {{ store.pageTitle }}
            </h2>
        </div>

        <div class="flex items-center gap-4">
            <div class="flex items-center gap-3 mr-4">
                <!-- Placeholder for other tools or user info -->
                <div class="w-8 h-8 rounded-full bg-cc-surface-light border border-cc-border flex items-center justify-center">
                   <ElIcon :size="16" color="#8E8E8E"><User /></ElIcon>
                </div>
            </div>
            <ElButton 
                color="#3A7AF0" 
                class="!border-none !text-white hover:!bg-blue-600 !h-8 !px-4 !rounded-md"
                :disabled="!canExport" 
                @click="handleExport"
            >
                <span class="text-xs font-medium">导出</span>
            </ElButton>
        </div>
    </header>
    <ElDialog
        v-model="showExportDialog"
        width="320px"
        :show-close="false"
        :close-on-click-modal="false"
        :close-on-press-escape="false"
    >
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
    import { ref } from 'vue';
    import { User } from '@element-plus/icons-vue';
    import { usePageState } from '@/stores/pageState';
    import { useVideoExport } from '@/services/useVideoExport';
    const store = usePageState();
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

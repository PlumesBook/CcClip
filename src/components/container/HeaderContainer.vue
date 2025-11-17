<template>
    <header
        class="h-12 w-full flex flex-nowrap flex-row items-center justify-center border-b dark:border-gray-600 border-gray-300"
    >
        <div class="flex w-1/3 pl-2 items-center">
            <div class="w20">
                <img class="h-8" :src="logoImage" alt="">
            </div>
            <span class="text-xs select-none ml-4">自动保存：2023-02-10 00:51</span>
        </div>
        <h2 class="align-middle w-1/5 text-center flex-1 select-none text-sm">
            {{ store.pageTitle }}
        </h2>
        <div class="flex w-1/3 flex-row-reverse pr-10 items-center">
            <ElButton color="#626aef" :disabled="!canExport" @click="handleExport">
                <ElIcon :size="size" :color="color" class="mr-1">
                    <Download />
                </ElIcon>
                导出
            </ElButton>
            <el-switch
                class="mr-10" size="large" :active-icon="Moon" :inactive-icon="Sunny" :inline-prompt="inner"
                v-model="store.isDark" :style="switchClass"
            />
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
    import { ref, computed, inject } from 'vue';
    import { Download, Sunny, Moon } from '@element-plus/icons-vue';
    import { usePageState } from '@/stores/pageState';
    import { usePlayerState } from '@/stores/playerState';
    import type FFManager from '@/utils/ffmpegManager';
    import { exportProjectToVideo } from '@/services/exportVideo';
    const store = usePageState();
    const playerStore = usePlayerState();
    const ffmpeg = inject('ffmpeg') as FFManager;
    const size = ref(14);
    const color = '#fff';
    const inner = ref(true);
    const switchClass = computed(() => ({
        '--el-switch-border-color': store.isDark ? '#4B5563' : '#D1D5DB',
        '--el-color-white': store.isDark ? '#F3F4F6' : '#374151'
    }));
    const exporting = ref(false);
    const showExportDialog = ref(false);
    const exportProgress = ref(0);
    const exportPhase = ref<'prepare' | 'merge-audio' | 'render-frames' | 'merge-video' | 'done'>('prepare');
    const exportAbortController = ref<AbortController | null>(null);
    const phaseLabel = computed(() => {
        if (exportPhase.value === 'prepare') return '准备导出';
        if (exportPhase.value === 'merge-audio') return '正在合成音频';
        if (exportPhase.value === 'render-frames') return '正在渲染画面';
        if (exportPhase.value === 'merge-video') return '正在合成视频';
        if (exportPhase.value === 'done') return '导出完成';
        return '';
    });
    const canExport = computed(() => {
        const hasVideo = playerStore.existVideo && playerStore.frameCount > 0;
        const ffReady = ffmpeg && ffmpeg.isLoaded && ffmpeg.isLoaded.value;
        return hasVideo && ffReady && !exporting.value;
    });

    async function handleExport() {
        if (!canExport.value || !ffmpeg) {
            return;
        }
        try {
            exporting.value = true;
            const controller = new AbortController();
            exportAbortController.value = controller;
            showExportDialog.value = true;
            exportProgress.value = 0;
            exportPhase.value = 'prepare';
            const { fileName, blob } = await exportProjectToVideo(ffmpeg, {
                projectName: store.pageTitle,
                signal: controller.signal,
                onProgress(info: { phase: 'prepare' | 'merge-audio' | 'render-frames' | 'merge-video' | 'done'; progress: number; currentFrame?: number; totalFrames?: number }) {
                    exportPhase.value = info.phase;
                    let percent = 0;
                    if (info.phase === 'prepare') {
                        percent = 3;
                    } else if (info.phase === 'merge-audio') {
                        percent = 3 + Math.round(12 * (info.progress || 0));
                    } else if (info.phase === 'render-frames') {
                        percent = 15 + Math.round(80 * (info.progress || 0));
                    } else if (info.phase === 'merge-video') {
                        percent = 95 + Math.round(4 * (info.progress || 0));
                    } else if (info.phase === 'done') {
                        percent = 100;
                    }
                    exportProgress.value = Math.max(0, Math.min(100, percent));
                }
            });
            const href = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = href;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(href);
        } catch (e: any) {
            if (!e || e.message !== 'Export aborted') {
                console.error(e);
            }
        } finally {
            exporting.value = false;
            showExportDialog.value = false;
            exportAbortController.value = null;
        }
    }

    function handleCancelExport() {
        if (exportAbortController.value && !exportAbortController.value.signal.aborted) {
            exportAbortController.value.abort();
        }
    }

    function format2(value: number) {
        return (value < 10 ? '0' : '') + value;
    }
</script>

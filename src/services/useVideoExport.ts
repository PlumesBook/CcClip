import { ref, computed, inject } from 'vue';
import { usePageState } from '@/stores/pageState';
import { usePlayerState } from '@/stores/playerState';
import type FFManager from '@/utils/ffmpegManager';
import { exportProjectToVideo } from '@/services/exportVideo';

export type ExportPhase = 'prepare' | 'merge-audio' | 'render-frames' | 'merge-video' | 'done';

export function useVideoExport() {
    const store = usePageState();
    const playerStore = usePlayerState();
    const ffmpeg = inject('ffmpeg') as FFManager;

    const exporting = ref(false);
    const showExportDialog = ref(false);
    const exportProgress = ref(0);
    const exportPhase = ref<ExportPhase>('prepare');
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

    async function startExport() {
        if (!canExport.value || !ffmpeg) return;
        const frameThreshold = 1800; // 约 60 秒（30fps）
        if (playerStore.frameCount > frameThreshold) {
            const seconds = Math.round(playerStore.frameCount / 30);
            const confirmExport = window.confirm(`当前工程约 ${seconds} 秒，导出可能需要较长时间，确认继续导出吗？`);
            if (!confirmExport) return;
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
                onProgress(info: { phase: ExportPhase; progress: number; currentFrame?: number; totalFrames?: number }) {
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

    function cancelExport() {
        if (exportAbortController.value && !exportAbortController.value.signal.aborted) {
            exportAbortController.value.abort();
        }
    }

    return {
        exporting,
        showExportDialog,
        exportProgress,
        exportPhase,
        exportAbortController,
        phaseLabel,
        canExport,
        startExport,
        cancelExport
    };
}

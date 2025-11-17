import { usePlayerState } from '@/stores/playerState';
import { useTrackState, type TrackItem, type TrackLineItem } from '@/stores/trackState';
import { useTrackAttrState } from '@/stores/trackAttribute';
import { computedItemShowArea, isVideo } from '@/utils/common';
import type FFManager from '@/utils/ffmpegManager';
import { toRaw } from 'vue';

export interface ExportVideoOptions {
    projectName?: string;
    onProgress?: (info: {
        phase: 'prepare' | 'merge-audio' | 'render-frames' | 'merge-video' | 'done';
        progress: number;
        currentFrame?: number;
        totalFrames?: number;
    }) => void;
    signal?: AbortSignal;
}

export interface ExportVideoResult {
    fileName: string;
    blob: Blob;
}

function formatExportFileName(projectName?: string) {
    const base = projectName && projectName.trim().length > 0 ? projectName : 'ccclip_export';
    const time = new Date();
    const pad = (v: number) => (v < 10 ? `0${v}` : `${v}`);
    return `${base}_${time.getFullYear()}${pad(time.getMonth() + 1)}${pad(time.getDate())}_${pad(time.getHours())}${pad(time.getMinutes())}${pad(time.getSeconds())}.mp4`;
}

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error('Canvas toBlob failed'));
            }
        }, 'image/png');
    });
}

function collectActiveTracks(frameIndex: number, trackLines: TrackLineItem[]): TrackItem[] {
    const result: TrackItem[] = [];
    trackLines.forEach((line: TrackLineItem) => {
        line.list.forEach((trackItem: TrackItem) => {
            if (frameIndex >= trackItem.start && frameIndex <= trackItem.end) {
                result.push(trackItem);
            }
        });
    });
    return result;
}

async function drawTrackItem(
    ctx: CanvasRenderingContext2D,
    canvasSize: { width: number; height: number },
    trackItem: TrackItem,
    trackAttrMap: Record<string, any>,
    ffmpeg: FFManager,
    frameIndex: number
) {
    const id = trackItem.id;
    const attr = trackAttrMap[id];
    if (!attr) return;
    const { drawL, drawT, drawW, drawH, sourceWidth, sourceHeight } = computedItemShowArea(
        trackItem as any,
        canvasSize,
        attr
    );
    const { type, start, offsetL, name, sourceFrame } = trackItem as any;
    if (frameIndex > trackItem.end) {
        return;
    }
    if (isVideo(type)) {
        const frame = Math.max(frameIndex - start + offsetL, 1);
        const blobFrame = ffmpeg.getFrame(name, frame) as Blob;
        const imageBitmap = await createImageBitmap(blobFrame);
        ctx.drawImage(
            imageBitmap,
            0,
            0,
            sourceWidth,
            sourceHeight,
            drawL,
            drawT,
            drawW,
            drawH
        );
        return;
    }
    if (type === 'image') {
        const frame = Math.max(frameIndex - start, 1);
        const showFrame = frame % sourceFrame;
        const blobFrame = ffmpeg.getGifFrame(name, showFrame === 0 ? sourceFrame : showFrame) as Blob;
        const imageBitmap = await createImageBitmap(blobFrame);
        ctx.drawImage(
            imageBitmap,
            0,
            0,
            sourceWidth,
            sourceHeight,
            drawL,
            drawT,
            drawW,
            drawH
        );
        return;
    }
    if (type === 'text') {
        const { text, color, fontSize } = attr;
        ctx.font = `${fontSize}px -apple-system, ".SFNSText-Regular", "SF UI Text", "PingFang SC", "Hiragino Sans GB", "Helvetica Neue", "WenQuanYi Zen Hei", "Microsoft YaHei", Arial, sans-serif`;
        ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},${color.a})`;
        ctx.fillText(text, drawL, drawT + fontSize);
        return;
    }
}

async function renderFramesRange(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    bgColor: string,
    trackLines: TrackLineItem[],
    trackAttrMap: Record<string, any>,
    ffmpeg: FFManager,
    frameDir: string,
    options: {
        startFrame: number;
        endFrame: number;
        signal?: AbortSignal;
        onProgress?: ExportVideoOptions['onProgress'];
        totalFrames: number;
        yieldInterval: number;
        lastYieldTimeRef: { value: number };
    }
) {
    const { startFrame, endFrame, signal, onProgress, totalFrames, yieldInterval, lastYieldTimeRef } = options;
    for (let frameIndex = startFrame; frameIndex < endFrame; frameIndex++) {
        if (signal?.aborted) {
            throw new Error('Export aborted');
        }
        const now = performance.now();
        if (now - lastYieldTimeRef.value > yieldInterval) {
            await new Promise(resolve => setTimeout(resolve, 0));
            lastYieldTimeRef.value = performance.now();
        }

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const activeTracks = collectActiveTracks(frameIndex, trackLines);
        const videoTracks = activeTracks.filter(item => isVideo(item.type));
        const otherTracks = activeTracks.filter(item => !isVideo(item.type));

        for (const trackItem of videoTracks) {
            await drawTrackItem(ctx, { width: canvas.width, height: canvas.height }, trackItem, trackAttrMap, ffmpeg, frameIndex);
        }
        for (const trackItem of otherTracks) {
            await drawTrackItem(ctx, { width: canvas.width, height: canvas.height }, trackItem, trackAttrMap, ffmpeg, frameIndex);
        }

        const blob = await canvasToPngBlob(canvas);
        const fileIndex = frameIndex + 1;
        const fileName = `frame-${String(fileIndex).padStart(6, '0')}.png`;
        await ffmpeg.writeFrameImage(frameDir, fileName, blob);

        onProgress && onProgress({
            phase: 'render-frames',
            progress: fileIndex / totalFrames,
            currentFrame: fileIndex,
            totalFrames
        });
    }
}

export async function exportProjectToVideo(ffmpeg: FFManager, options: ExportVideoOptions): Promise<ExportVideoResult> {
    const { projectName, onProgress, signal } = options;
    const playerStore = usePlayerState();
    const trackStore = useTrackState();
    const attrStore = useTrackAttrState();

    if (!ffmpeg || !ffmpeg.isLoaded || !ffmpeg.isLoaded.value) {
        throw new Error('FFmpeg is not ready');
    }

    const frameCount = playerStore.frameCount;
    const playerWidth = playerStore.playerWidth;
    const playerHeight = playerStore.playerHeight;

    if (!frameCount || frameCount <= 0) {
        throw new Error('No frames to export');
    }
    if (!playerStore.existVideo) {
        throw new Error('No video track to export');
    }

    const fps = 30;
    const totalFrames = frameCount;

    onProgress && onProgress({ phase: 'prepare', progress: 0, totalFrames, currentFrame: 0 });

    try {
        // 阶段 2：音频合成（如果存在可用音轨）
        const hasAudio = playerStore.audioPlayData && playerStore.audioPlayData.length > 0;
        let audioFsPath: string | null = null;
        if (hasAudio) {
            onProgress && onProgress({ phase: 'merge-audio', progress: 0, totalFrames, currentFrame: 0 });
            await ffmpeg.getAudio(playerStore.audioPlayData, toRaw(attrStore.trackAttrMap));
            // getAudio 内部总是输出到 /audio/audio.mp3
            audioFsPath = `${ffmpeg.pathConfig.audioPath}audio.mp3`;
            onProgress && onProgress({ phase: 'merge-audio', progress: 1, totalFrames, currentFrame: 0 });
        }

        const canvas = document.createElement('canvas');
        canvas.width = playerWidth;
        canvas.height = playerHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Canvas 2D context is not available');
        }
        const bgColor = '#111827';

        const frameDir = ffmpeg.pathConfig.exportPath;

        const yieldInterval = 16; // ms，约等于一帧
        const lastYieldTimeRef = { value: performance.now() };

        await renderFramesRange(
            ctx,
            canvas,
            bgColor,
            trackStore.trackList as unknown as TrackLineItem[],
            attrStore.trackAttrMap,
            ffmpeg,
            frameDir,
            {
                startFrame: 0,
                endFrame: totalFrames,
                signal,
                onProgress,
                totalFrames,
                yieldInterval,
                lastYieldTimeRef
            }
        );

        onProgress && onProgress({ phase: 'merge-video', progress: 0, totalFrames, currentFrame: totalFrames });

        const { videoPath } = await ffmpeg.mergeVideoFromFrames(frameDir, fps, 'video.mp4');

        // 如存在音频轨，则进一步进行音视频合成
        let finalVideoPath = videoPath;
        if (audioFsPath) {
            const outputPath = `${ffmpeg.pathConfig.exportPath}output.mp4`;
            await ffmpeg.muxAudioVideo(videoPath, audioFsPath, outputPath);
            finalVideoPath = outputPath;
        }

        const blob = ffmpeg.getFileBlobByPath(finalVideoPath, 'video/mp4');

        onProgress && onProgress({ phase: 'done', progress: 1, totalFrames, currentFrame: totalFrames });

        const fileName = formatExportFileName(projectName);
        return {
            fileName,
            blob
        };
    } finally {
        // 清理导出过程中生成的临时帧文件
        if (typeof (ffmpeg as any).clearExportFrames === 'function') {
            (ffmpeg as any).clearExportFrames();
        }
    }
}

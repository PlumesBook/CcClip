import { usePlayerState } from '@/stores/playerState';
import { useTrackState, type TrackItem, type TrackLineItem } from '@/stores/trackState';
import { useTrackAttrState } from '@/stores/trackAttribute';
import { computedItemShowArea, isVideo } from '@/utils/common';
import type FFManager from '@/utils/ffmpegManager';

export interface ExportVideoOptions {
    projectName?: string;
    onProgress?: (info: {
        phase: 'prepare' | 'render-frames' | 'merge-video' | 'done';
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

    const canvas = document.createElement('canvas');
    canvas.width = playerWidth;
    canvas.height = playerHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Canvas 2D context is not available');
    }
    const bgColor = '#111827';

    const frameDir = ffmpeg.pathConfig.exportPath;

    for (let i = 0; i < totalFrames; i++) {
        if (signal?.aborted) {
            throw new Error('Export aborted');
        }
        const frameIndex = i;
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const activeTracks = collectActiveTracks(frameIndex, trackStore.trackList as unknown as TrackLineItem[]);
        const videoTracks = activeTracks.filter(item => isVideo(item.type));
        const otherTracks = activeTracks.filter(item => !isVideo(item.type));

        for (const trackItem of videoTracks) {
            await drawTrackItem(ctx, { width: canvas.width, height: canvas.height }, trackItem, attrStore.trackAttrMap, ffmpeg, frameIndex);
        }
        for (const trackItem of otherTracks) {
            await drawTrackItem(ctx, { width: canvas.width, height: canvas.height }, trackItem, attrStore.trackAttrMap, ffmpeg, frameIndex);
        }

        const blob = await canvasToPngBlob(canvas);
        const fileIndex = i + 1;
        const fileName = `frame-${String(fileIndex).padStart(6, '0')}.png`;
        await ffmpeg.writeFrameImage(frameDir, fileName, blob);

        onProgress && onProgress({
            phase: 'render-frames',
            progress: (i + 1) / totalFrames,
            currentFrame: i + 1,
            totalFrames
        });
    }

    onProgress && onProgress({ phase: 'merge-video', progress: 0, totalFrames, currentFrame: totalFrames });

    const { videoPath } = await ffmpeg.mergeVideoFromFrames(frameDir, fps, 'video.mp4');
    const blob = ffmpeg.getFileBlobByPath(videoPath, 'video/mp4');

    onProgress && onProgress({ phase: 'done', progress: 1, totalFrames, currentFrame: totalFrames });

    const fileName = formatExportFileName(projectName);
    return {
        fileName,
        blob
    };
}

import type FFManager from '@/utils/ffmpegManager';

export interface ResourceSource {
    name: string;
    format: string;
    cover: string;
    source: string;
    width: number;
    height: number;
    fps: number;
    frameCount: number;
    time: number;
    file: File;
    groupType: string;
    sourceFrame?: number;
}

function getBaseName(fileName: string) {
    const dotIndex = fileName.lastIndexOf('.');
    if (dotIndex === -1) return fileName;
    return fileName.slice(0, dotIndex);
}

function getFormat(fileName: string) {
    const dotIndex = fileName.lastIndexOf('.');
    if (dotIndex === -1) return 'mp4';
    return fileName.slice(dotIndex + 1);
}

export function createVideoResourceFromFile(file: File, groupType: string = 'video'): Promise<ResourceSource> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = url;
        video.onloadedmetadata = () => {
            const duration = video.duration || 0;
            const width = video.videoWidth || 320;
            const height = video.videoHeight || 180;
            const fps = 30;
            const frameCount = Math.max(1, Math.round(duration * fps));
            const time = Math.max(1, Math.round(duration * 1000));
            const baseName = getBaseName(file.name);
            const format = getFormat(file.name);
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            const finish = (cover: string) => {
                resolve({
                    name: baseName,
                    format,
                    cover,
                    source: url,
                    width,
                    height,
                    fps,
                    frameCount,
                    time,
                    file,
                    groupType
                });
            };

            if (ctx) {
                const capture = () => {
                    try {
                        ctx.drawImage(video, 0, 0, width, height);
                        const cover = canvas.toDataURL('image/png');
                        finish(cover);
                    } catch (e) {
                        finish('');
                    }
                };
                if (duration > 0) {
                    video.currentTime = Math.min(0.1, duration - 0.1);
                    video.onseeked = () => capture();
                } else {
                    capture();
                }
            } else {
                finish('');
            }
        };
        video.onerror = (e) => {
            reject(e);
        };
    });
}

export function createAudioResourceFromFile(file: File, groupType: string = 'audio'): Promise<ResourceSource> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const audio = document.createElement('audio');
        audio.preload = 'metadata';
        audio.src = url;
        audio.onloadedmetadata = () => {
            const duration = audio.duration || 0;
            const time = Math.max(1, Math.round(duration * 1000));
            const baseName = getBaseName(file.name);
            const format = getFormat(file.name);
            resolve({
                name: baseName,
                format,
                cover: '',
                source: url,
                width: 0,
                height: 0,
                fps: 0,
                frameCount: 0,
                time,
                file,
                groupType
            });
        };
        audio.onerror = (e) => {
            reject(e);
        };
    });
}

export function createImageResourceFromFile(file: File, ffmpeg?: FFManager, groupType: string = 'image'): Promise<ResourceSource> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = async () => {
            const width = image.width || 320;
            const height = image.height || 180;
            let time = 3000; // 默认图片时长 3s
            let fps = 0;
            let frameCount = 0;
            const baseName = getBaseName(file.name);
            const format = getFormat(file.name);
            let sourceFrame = 1;

            if (format.toLowerCase() === 'gif' && ffmpeg && ffmpeg.isLoaded.value) {
                try {
                    const fileName = `${baseName}.${format}`;
                    await ffmpeg.writeFile(ffmpeg.pathConfig.resourcePath, fileName, url);
                    await ffmpeg.genFrame(baseName, format, { w: width, h: height });
                    const frameDir = `${ffmpeg.pathConfig.framePath}${baseName}`;
                    const files = ffmpeg.readDir(frameDir);
                    const frames = files.filter((f: string) => f.startsWith('gif-'));
                    if (frames.length > 1) {
                        frameCount = frames.length;
                        sourceFrame = frames.length;
                        fps = 10;
                        time = frameCount * 100;
                    }
                } catch (e) {
                    console.error('GIF parse failed', e);
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            let cover = url;
            if (ctx) {
                try {
                    ctx.drawImage(image, 0, 0, width, height);
                    cover = canvas.toDataURL('image/png');
                } catch (e) {
                    // ignore
                }
            }
            resolve({
                name: baseName,
                format,
                cover,
                source: url,
                width,
                height,
                fps,
                frameCount,
                time,
                sourceFrame,
                file,
                groupType
            });
        };
        image.onerror = (e) => {
            reject(e);
        };
        image.src = url;
    });
}

import { createGIF } from 'gifshot';
import { GIF_DEFAULTS } from '$lib/config/gif';
import { getGifDimensions } from './gif-options.js';
export { getGifDimensions } from './gif-options.js';

export function captureCanvasFrames(p5, options = {}) {
    if (!p5?.saveFrames) {
        return Promise.reject(new Error('Canvas renderer is not ready'));
    }

    const seconds = Number(options.seconds) || GIF_DEFAULTS.seconds;
    const fps = Number(options.fps) || GIF_DEFAULTS.fps;

    return new Promise((resolve, reject) => {
        try {
            p5.saveFrames('out', 'png', seconds, fps, (frames) => {
                if (!Array.isArray(frames) || frames.length < 1) {
                    reject(new Error('No frames were captured'));
                    return;
                }

                resolve(frames.map((frame) => frame.imageData).filter(Boolean));
            });
        } catch (error) {
            reject(error);
        }
    });
}

export function encodeGif(images, options = {}) {
    if (!Array.isArray(images) || images.length < 1) {
        return Promise.reject(new Error('No frames available to encode'));
    }

    return new Promise((resolve, reject) => {
        createGIF({
            images,
            gifWidth: options.width,
            gifHeight: options.height
        }, (gif) => {
            if (gif?.error) {
                reject(new Error(gif.errorMsg || 'GIF encoding failed'));
                return;
            }

            if (!gif?.image) {
                reject(new Error('GIF encoder returned no image'));
                return;
            }

            resolve(gif.image);
        });
    });
}

export async function createGifPreview({ p5, canvas, width, seconds, fps }) {
    const dimensions = getGifDimensions(canvas, width);
    const frames = await captureCanvasFrames(p5, { seconds, fps });
    const dataUrl = await encodeGif(frames, dimensions);

    return {
        dataUrl,
        ...dimensions
    };
}

import { GIF_DEFAULTS } from '../config/gif.js';

export function getGifDimensions(canvas, width = GIF_DEFAULTS.width) {
    if (!canvas?.width || !canvas?.height) {
        throw new Error('Canvas is not ready');
    }

    const gifWidth = Number(width) || GIF_DEFAULTS.width;
    const ratio = canvas.width / canvas.height;
    return {
        width: gifWidth,
        height: Math.round(gifWidth / ratio)
    };
}

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { v4 as uuidv4 } from 'uuid'
import { mkdirp } from 'mkdirp'

const DATA_URL_REGEX = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/

export function parseGifDataUrl(rawData, maxBytes) {
    if (typeof rawData !== 'string' || !rawData.trim()) {
        const error = new Error('missing_image')
        error.statusCode = 400
        throw error
    }

    if (maxBytes && Buffer.byteLength(rawData, 'utf8') > maxBytes) {
        const error = new Error('image_too_large')
        error.statusCode = 413
        throw error
    }

    const matches = rawData.match(DATA_URL_REGEX)
    if (!matches) {
        const error = new Error('invalid_data_url')
        error.statusCode = 400
        throw error
    }

    const mimeType = matches[1].toLowerCase()
    if (mimeType !== 'image/gif') {
        const error = new Error('invalid_image_type')
        error.statusCode = 415
        throw error
    }

    const buffer = Buffer.from(matches[2].replace(/\s/g, ''), 'base64')
    if (buffer.length < 1) {
        const error = new Error('empty_image')
        error.statusCode = 400
        throw error
    }

    return { buffer, mimeType, ext: 'gif' }
}

export async function saveGifDataUrl(rawData, options) {
    const parsed = parseGifDataUrl(rawData, options.maxBytes)
    const filename = `${uuidv4()}.${parsed.ext}`
    const absolutePath = path.join(options.directory, filename)

    await mkdirp(options.directory)
    await fs.writeFile(absolutePath, parsed.buffer)

    return {
        filename,
        path: absolutePath,
        urlPath: `${options.urlPrefix.replace(/\/$/, '')}/${filename}`,
        bytes: parsed.buffer.length
    }
}

export async function cleanupOldGifFiles(directory, ttlMs, now = Date.now()) {
    if (!ttlMs || ttlMs < 1) return 0

    let entries
    try {
        entries = await fs.readdir(directory, { withFileTypes: true })
    } catch (error) {
        if (error.code === 'ENOENT') return 0
        throw error
    }

    let deleted = 0
    for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.gif')) continue

        const filePath = path.join(directory, entry.name)
        const stat = await fs.stat(filePath)
        if (now - stat.mtimeMs <= ttlMs) continue

        await fs.unlink(filePath)
        deleted++
    }

    return deleted
}

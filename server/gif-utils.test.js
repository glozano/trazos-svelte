import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { cleanupOldGifFiles, parseGifDataUrl, saveGifDataUrl } from './gif-utils.js'

const tinyGifDataUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='

test('parseGifDataUrl accepts valid GIF data URLs', () => {
    const parsed = parseGifDataUrl(tinyGifDataUrl, 1024)

    assert.equal(parsed.mimeType, 'image/gif')
    assert.equal(parsed.ext, 'gif')
    assert.ok(parsed.buffer.length > 0)
})

test('parseGifDataUrl rejects non-GIF data URLs', () => {
    assert.throws(
        () => parseGifDataUrl('data:image/png;base64,AAAA', 1024),
        /invalid_image_type/
    )
})

test('parseGifDataUrl rejects malformed data URLs', () => {
    assert.throws(
        () => parseGifDataUrl('not-a-data-url', 1024),
        /invalid_data_url/
    )
})

test('parseGifDataUrl rejects oversized payloads', () => {
    assert.throws(
        () => parseGifDataUrl(tinyGifDataUrl, 10),
        /image_too_large/
    )
})

test('saveGifDataUrl writes a validated GIF file', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'trazos-gif-'))

    try {
        const saved = await saveGifDataUrl(tinyGifDataUrl, {
            directory,
            urlPrefix: '/user-img',
            maxBytes: 1024
        })

        assert.match(saved.filename, /\.gif$/)
        assert.equal(saved.urlPath, `/user-img/${saved.filename}`)
        assert.deepEqual(await readFile(saved.path), parseGifDataUrl(tinyGifDataUrl, 1024).buffer)
    } finally {
        await rm(directory, { recursive: true, force: true })
    }
})

test('cleanupOldGifFiles deletes only stale GIF files', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'trazos-gif-clean-'))

    try {
        const oldGif = path.join(directory, 'old.gif')
        const keepGif = path.join(directory, 'keep.gif')
        const oldTxt = path.join(directory, 'old.txt')

        await writeFile(oldGif, 'gif')
        await writeFile(keepGif, 'gif')
        await writeFile(oldTxt, 'txt')

        const now = Date.now()
        const oldTime = new Date(now - 120000)
        await Promise.all([
            import('node:fs/promises').then(({ utimes }) => utimes(oldGif, oldTime, oldTime)),
            import('node:fs/promises').then(({ utimes }) => utimes(oldTxt, oldTime, oldTime))
        ])

        const deleted = await cleanupOldGifFiles(directory, 60000, now)

        assert.equal(deleted, 1)
        await assert.rejects(() => readFile(oldGif), /ENOENT/)
        assert.equal(await readFile(keepGif, 'utf8'), 'gif')
        assert.equal(await readFile(oldTxt, 'utf8'), 'txt')
    } finally {
        await rm(directory, { recursive: true, force: true })
    }
})

import './load-env.js'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { handler } from '../build/handler.js'
import console from 'console'
import uap from 'ua-parser-js'
import path from 'node:path'
import { MongoClient } from 'mongodb'
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { cleanupOldGifFiles, saveGifDataUrl } from './gif-utils.js'

const scrypt = promisify(scryptCallback)

const memoryEnabled = parseBoolean(process.env.TRAZOS_MEMORY_ENABLED, true)
const port = Number(process.env.PORT || 3000)
const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017'
const dbName = process.env.MONGO_DB_NAME || 'mongo_trazos'
const linesCollectionName = process.env.MONGO_LINES_COLLECTION || 'lines'
const memoryTtlSeconds = Math.max(1, parseNumber(process.env.TRAZOS_MEMORY_TTL_SECONDS, 3 * 60 * 60))
const replayLimit = Math.max(0, parseNumber(process.env.TRAZOS_MEMORY_REPLAY_LIMIT, 0))
const adminSessionTtlSeconds = Number(process.env.ADMIN_SESSION_TTL_SECONDS || 86400)
const adminCookieName = 'trazos_admin_session'
const autoEraseDefaultMaxTrazos = 500
const autoEraseMaxTrazosLimit = 10000
const boardLayerCount = 4
const gifUrlPrefix = '/user-img'
const gifTempDir = path.resolve(process.env.GIF_TEMP_DIR || 'static/user-img')
const gifMaxBytes = Math.max(1, parseNumber(process.env.GIF_MAX_BYTES, 12 * 1024 * 1024))
const gifTempTtlMs = Math.max(1, parseNumber(process.env.GIF_TEMP_TTL_SECONDS, 30 * 60)) * 1000
const gifCleanupIntervalMs = Math.max(1, parseNumber(process.env.GIF_CLEANUP_INTERVAL_SECONDS, 5 * 60)) * 1000
const giphyApiKey = process.env.GIPHY_API_KEY || ''
const giphyUsername = process.env.GIPHY_USERNAME || 'trazosclub'
const giphyTags = process.env.GIPHY_TAGS || 'trazos,trazosclub,processing,collaborative,drawing,draw'
const debugTrazosSocket = parseBoolean(process.env.DEBUG_TRAZOS_SOCKET, false)

const app = express()
const server = createServer(app)
const io = new Server(server, {
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true,
    }
})

let db = null
let mongoClient = null
const boards = new Map()
const adminSockets = new Set()
let adminStateTimer = null

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(gifUrlPrefix, express.static(gifTempDir, {
    fallthrough: false,
    immutable: true,
    maxAge: '30m'
}))

app.post('/files', express.text({ type: '*/*', limit: gifMaxBytes }), async function(req, res) {
    try {
        const saved = await saveTemporaryGif(req.body)
        res.json({ filename: saved.urlPath.replace(/^\//, ''), url: saved.urlPath })
        console.log('Saved GIF: ' + saved.urlPath)
    } catch (error) {
        sendGifError(res, error)
    }
})

app.post('/api/gifs/giphy', express.text({ type: '*/*', limit: gifMaxBytes }), async function(req, res) {
    if (!giphyApiKey) {
        res.status(503).json({ error: 'giphy_not_configured' })
        return
    }

    try {
        const saved = await saveTemporaryGif(req.body)
        const sourceImageUrl = `${getRequestBaseUrl(req)}${saved.urlPath}`
        const formData = new FormData()
        formData.append('api_key', giphyApiKey)
        formData.append('username', giphyUsername)
        formData.append('source_image_url', sourceImageUrl)
        formData.append('tags', giphyTags)

        const response = await fetch('https://upload.giphy.com/v1/gifs', {
            method: 'POST',
            body: formData
        })

        const payload = await response.json().catch(() => null)
        if (!response.ok || !payload?.data?.id) {
            console.error('GIPHY upload failed:', payload)
            res.status(502).json({ error: 'giphy_upload_failed' })
            return
        }

        const id = payload.data.id
        res.json({
            id,
            gifUrl: `https://media.giphy.com/media/${id}/giphy.gif`,
            mp4Url: `https://media.giphy.com/media/${id}/giphy.mp4`
        })
    } catch (error) {
        sendGifError(res, error)
    }
})

app.get('/api/boards/active', function(req, res) {
    res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify({
        boards: getActiveBoards(),
        updatedAt: new Date().toISOString()
    }))
})

app.get('/admin/api/session', async function(req, res) {
    const admin = await getAdminFromRequest(req)
    res.json({ authenticated: Boolean(admin), username: admin?.username || null })
})

app.post('/admin/api/login', async function(req, res) {
    if (!db) {
        res.status(503).json({ error: 'mongo_unavailable' })
        return
    }

    const username = String(req.body?.username || '').trim()
    const password = String(req.body?.password || '')
    if (!username || !password) {
        res.status(400).json({ error: 'missing_credentials' })
        return
    }

    const admin = await db.collection('admin_users').findOne({ username })
    if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
        res.status(401).json({ error: 'invalid_credentials' })
        return
    }

    const token = randomBytes(32).toString('hex')
    const now = new Date()
    const expiresAt = new Date(now.getTime() + adminSessionTtlSeconds * 1000)
    await db.collection('admin_sessions').insertOne({
        token,
        username,
        createdAt: now,
        expiresAt
    })

    setAdminCookie(res, token, expiresAt)
    res.json({ authenticated: true, username })
})

app.post('/admin/api/logout', async function(req, res) {
    const token = getCookie(req.headers.cookie, adminCookieName)
    if (token && db) {
        await db.collection('admin_sessions').deleteOne({ token })
    }
    clearAdminCookie(res)
    res.json({ authenticated: false })
})

app.use(handler)

io.on('connection', async function(socket) {
    if (socket.handshake.query?.admin === '1') {
        await handleAdminConnection(socket)
        return
    }

    handleBoardConnection(socket)
})

async function handleAdminConnection(socket) {
    const admin = await getAdminFromCookieHeader(socket.handshake.headers.cookie)
    if (!admin) {
        socket.emit('admin:error', { error: 'unauthorized' })
        socket.disconnect(true)
        return
    }

    socket.data.admin = admin
    adminSockets.add(socket)
    emitAdminStateTo(socket)

    socket.on('admin:erase-board', async function(data, callback) {
        const board = String(data?.board || '').trim()
        if (!board) {
            callback?.({ ok: false, error: 'missing_board' })
            return
        }

        try {
            const deleted = await eraseBoard(board)
            callback?.({ ok: true, deleted })
        } catch (err) {
            console.error(err)
            callback?.({ ok: false, error: 'erase_failed' })
        }
    })

    socket.on('admin:erase-user', async function(data, callback) {
        const board = String(data?.board || '').trim()
        const trazosId = String(data?.trazosId || '').trim()
        if (!board || !trazosId) {
            callback?.({ ok: false, error: 'missing_user' })
            return
        }

        try {
            const deleted = await eraseUser(board, trazosId)
            callback?.({ ok: true, deleted })
        } catch (err) {
            console.error(err)
            callback?.({ ok: false, error: 'erase_failed' })
        }
    })

    socket.on('admin:update-board-features', async function(data, callback) {
        const boardId = String(data?.board || '').trim()
        const board = boards.get(boardId)
        if (!board) {
            callback?.({ ok: false, error: 'board_not_found' })
            return
        }

        const normalized = normalizeAutoEraseFeature(data?.features?.autoEraseOldTrazos)
        if (!normalized) {
            callback?.({ ok: false, error: 'invalid_auto_erase' })
            return
        }

        board.features.autoEraseOldTrazos = normalized

        try {
            const pruned = await pruneBoardIfNeeded(board)
            scheduleAdminState()
            callback?.({ ok: true, pruned, features: cloneBoardFeatures(board.features) })
        } catch (err) {
            console.error(err)
            callback?.({ ok: false, error: 'feature_update_failed' })
        }
    })

    socket.on('disconnect', function() {
        adminSockets.delete(socket)
    })
}

function handleBoardConnection(socket) {
    let chatUser = false
    const roomId = String(socket.handshake.query?.room_id || 'default')
    const requestedPrivateBoard = parseBoolean(socket.handshake.query?.private, false)
    const clientId = socket.id
    const boardExisted = boards.has(roomId)
    const board = ensureBoard(roomId, requestedPrivateBoard)
    const parsedUa = uap(socket.request.headers['user-agent'])
    const user = {
        socketId: clientId,
        trazosId: null,
        board: roomId,
        username: null,
        rawEvents: 0,
        ua: parsedUa.os?.name ? `${parsedUa.os.name} ${parsedUa.os.version || ''}`.trim() : 'Unknown',
        connected: true,
        createdAt: new Date(),
        lastEventAt: null,
        time: new Date().toTimeString().split(' ')[0]
    }

    socket.join(roomId)
    board.sockets.set(clientId, user)
    board.lastActiveAt = new Date()
    socket.joinAnnouncementSent = false
    emitBoardSessionInfo(socket, board, boardExisted)
    emitBoardPresence(board)
    scheduleAdminState()

    io.emit('connections', {
        connections: getOnlineUserCount()
    })

    function setCanvasUsername(rawUsername) {
        const normalizedUsername = normalizeUsername(rawUsername)
        if (!normalizedUsername) return ''
        socket.canvasUsername = normalizedUsername
        user.username = normalizedUsername
        return normalizedUsername
    }

    function announceBoardJoinIfNeeded(username) {
        if (!username || socket.joinAnnouncementSent) return
        socket.joinAnnouncementSent = true
        socket.broadcast.to(roomId).emit('boardUserJoined', {
            username,
            onlineUsers: board.sockets.size
        })
    }

    socket.on('clientConnectionEvent', async function(data) {
        user.trazosId = data?.id == null ? null : String(data.id)
        const normalizedUsername = setCanvasUsername(data?.username)
        emitBoardPresence(board)
        announceBoardJoinIfNeeded(normalizedUsername)
        scheduleAdminState()

        if (memoryReady()) {
            let replayQuery = db.collection(linesCollectionName)
                .find({ board: roomId })
                .project({ _id: 0, data: 1, timestamp: 1 })
                .sort({ timestamp: 1 })

            if (replayLimit > 0) replayQuery = replayQuery.limit(replayLimit)
            const boardLines = await replayQuery.toArray()
            if (boardLines.length) {
                socket.emit('previousLines', boardLines)
            }
        }
    })

    socket.on('setCanvasUsername', function(data) {
        const normalizedUsername = setCanvasUsername(data?.username)
        emitBoardPresence(board)
        announceBoardJoinIfNeeded(normalizedUsername)
        scheduleAdminState()
    })

    socket.on('new message', function (data) {
        socket.broadcast.to(roomId).emit('new message', {
            username: socket.username,
            text: data
        })
    })

    socket.on('add user', function (username) {
        if (chatUser) return
        socket.username = normalizeUsername(username)
        if (!socket.username) return
        const normalizedUsername = setCanvasUsername(socket.username)
        chatUser = true
        board.chatUsernames.push(socket.username)
        emitBoardPresence(board)
        announceBoardJoinIfNeeded(normalizedUsername)

        socket.emit('chat login', {
            username: socket.username,
            numUsers: board.chatUsernames.length,
            usernames: board.chatUsernames
        })
        socket.broadcast.to(roomId).emit('user joined', {
            username: socket.username,
            numUsers: board.chatUsernames.length,
            usernames: board.chatUsernames
        })
        scheduleAdminState()
    })

    socket.on('typing', function () {
        socket.broadcast.to(roomId).emit('typing', {
            username: socket.username
        })
    })

    socket.on('stop typing', function () {
        socket.broadcast.to(roomId).emit('stop typing', {
            username: socket.username
        })
    })

    socket.on('externalMouseEvent', async function(data) {
        const now = new Date()
        const event = data?.e
        const layer = Number(data?.layer || 0)
        const trazosId = data?.id == null ? user.trazosId : String(data.id)
        if (trazosId && !user.trazosId) user.trazosId = trazosId
        debugSocketEvent('receive', roomId, clientId, data)

        trackActiveStroke(board, event, trazosId, layer, clientId)
        board.lastActiveAt = now
        board.lastEventAt = now
        user.lastEventAt = now

        socket.broadcast.to(roomId).emit('externalMouseEvent', data)
        debugSocketEvent('broadcast', roomId, clientId, data)

        if (memoryReady()) {
            try {
                await db.collection(linesCollectionName).insertOne({
                    board: roomId,
                    id: data?.gesture_id,
                    data,
                    event,
                    layer,
                    trazosId,
                    socketId: clientId,
                    user: trazosId || clientId,
                    timestamp: now
                })
                if (event === 'RELEASED') await pruneBoardIfNeeded(board)
            } catch (err) {
                console.error('Failed to persist board event:', err)
            }
        }

        user.rawEvents++
        scheduleAdminState()
    })

    socket.on('deleteEvent', async function(data) {
        socket.broadcast.to(roomId).emit('deleteEvent', data)

        if (memoryReady()) {
            const strokeOwnerId = data?.id == null ? user.trazosId : String(data.id)
            await db.collection(linesCollectionName).deleteMany({
                board: roomId,
                layer: Number(data?.layer || 0),
                $or: [
                    { trazosId: strokeOwnerId },
                    { user: strokeOwnerId },
                    { 'data.id': strokeOwnerId }
                ]
            })
        }
        scheduleAdminState()
    })

    socket.on('disconnect', function() {
        if (chatUser) {
            board.chatUsernames = board.chatUsernames.filter((name) => name !== socket.username)
            socket.broadcast.to(roomId).emit('chat logout', {
                numUsers: board.chatUsernames.length,
                usernames: board.chatUsernames
            })
        }

        const disconnectedTrazosId = user.trazosId
        eraseDisconnectedUserTrazos(board, disconnectedTrazosId).catch((error) => {
            console.error('Failed to erase disconnected user trazos:', error)
        })
        clearSocketActiveStrokes(board, clientId)
        board.sockets.delete(clientId)
        board.lastActiveAt = new Date()
        emitBoardPresence(board)
        if (board.sockets.size < 1) {
            if (memoryReady()) {
                db.collection(linesCollectionName).deleteMany({ board: roomId })
            }
            boards.delete(roomId)
        }

        io.emit('user_disconnected', {
            connections: getOnlineUserCount()
        })
        scheduleAdminState()
    })
}

function ensureBoard(boardId, isPrivate = false) {
    if (!boards.has(boardId)) {
        const now = new Date()
        boards.set(boardId, {
            id: boardId,
            isPrivate,
            createdAt: now,
            lastActiveAt: now,
            lastEventAt: null,
            sockets: new Map(),
            activeStrokes: new Map(),
            chatUsernames: [],
            features: defaultBoardFeatures()
        })
    }
    return boards.get(boardId)
}

function defaultBoardFeatures() {
    return {
        autoEraseOldTrazos: {
            enabled: false,
            maxTrazos: autoEraseDefaultMaxTrazos
        }
    }
}

function cloneBoardFeatures(features) {
    return {
        autoEraseOldTrazos: {
            enabled: Boolean(features?.autoEraseOldTrazos?.enabled),
            maxTrazos: Number(features?.autoEraseOldTrazos?.maxTrazos || autoEraseDefaultMaxTrazos)
        }
    }
}

function normalizeAutoEraseFeature(feature) {
    if (!feature || typeof feature !== 'object') return null
    const maxTrazos = Number(feature.maxTrazos)
    if (!Number.isInteger(maxTrazos) || maxTrazos < 1 || maxTrazos > autoEraseMaxTrazosLimit) {
        return null
    }

    return {
        enabled: Boolean(feature.enabled),
        maxTrazos
    }
}

function getActiveBoards() {
    return Array.from(boards.values())
        .filter((board) => board && !board.isPrivate && board.sockets.size > 0)
        .sort((a, b) => {
            if (b.sockets.size !== a.sockets.size) return b.sockets.size - a.sockets.size
            return String(b.lastActiveAt || '').localeCompare(String(a.lastActiveAt || ''))
        })
        .map((board) => ({
            id: board.id,
            connections: board.sockets.size
        }))
}

function getOnlineUserCount() {
    let count = 0
    for (const board of boards.values()) {
        count += board.sockets.size
    }
    return count
}

function getBoardUsernames(board) {
    return Array.from(board.sockets.values())
        .map((user) => user.username)
        .filter(Boolean)
}

function emitBoardPresence(board) {
    io.to(board.id).emit('boardPresence', {
        roomId: board.id,
        onlineUsers: board.sockets.size,
        users: getBoardUsernames(board)
    })
}

function emitBoardSessionInfo(socket, board, boardExisted) {
    socket.emit('boardSessionInfo', {
        roomId: board.id,
        onlineUsers: board.sockets.size,
        joinedExistingBoard: boardExisted,
        isPrivate: board.isPrivate,
        users: getBoardUsernames(board)
    })
}

function trackActiveStroke(board, event, trazosId, layer, socketId) {
    if (!trazosId) return
    const key = `${socketId}:${trazosId}:${layer}`
    if (event === 'PRESS') {
        board.activeStrokes.set(key, { socketId, trazosId, layer })
    }
    if (event === 'RELEASED') {
        board.activeStrokes.delete(key)
    }
}

function clearSocketActiveStrokes(board, socketId) {
    for (const [key, stroke] of board.activeStrokes.entries()) {
        if (stroke.socketId === socketId) {
            board.activeStrokes.delete(key)
        }
    }
}

async function eraseDisconnectedUserTrazos(board, trazosId) {
    if (!board || !trazosId) return 0

    emitDeleteForUser(board.id, trazosId)

    for (const [key, stroke] of board.activeStrokes.entries()) {
        if (stroke.trazosId === trazosId) board.activeStrokes.delete(key)
    }

    if (!memoryReady()) return 0

    const result = await db.collection(linesCollectionName).deleteMany({
        board: board.id,
        $or: [
            { trazosId },
            { user: trazosId },
            { 'data.id': trazosId }
        ]
    })

    return result.deletedCount
}

async function buildAdminState() {
    const onlineBoards = Array.from(boards.values()).filter((board) => board.sockets.size > 0)
    const boardIds = onlineBoards.map((board) => board.id)
    const stats = await loadLineStats(boardIds)

    const boardStates = onlineBoards.map((board) => {
        const boardStats = stats.boards.get(board.id) || emptyStats()
        const users = Array.from(board.sockets.values()).map((user) => {
            const trazosId = user.trazosId || ''
            const userStats = stats.users.get(`${board.id}:${trazosId}`) || emptyStats()
            const activeStroke = Array.from(board.activeStrokes.values())
                .some((stroke) => stroke.socketId === user.socketId)

            return {
                displayName: user.username || user.trazosId || user.socketId,
                trazosId: user.trazosId,
                socketId: user.socketId,
                ua: user.ua,
                connected: user.connected,
                activeStroke,
                createdAt: user.createdAt.toISOString(),
                lastEventAt: user.lastEventAt?.toISOString() || userStats.lastEventAt?.toISOString() || null,
                completedStrokes: userStats.completed,
                rawEvents: userStats.raw,
                layers: userStats.layers
            }
        })

        return {
            id: board.id,
            onlineUsers: users.length,
            activeStrokes: board.activeStrokes.size,
            createdAt: board.createdAt.toISOString(),
            lastEventAt: board.lastEventAt?.toISOString() || boardStats.lastEventAt?.toISOString() || null,
            completedStrokes: boardStats.completed,
            rawEvents: boardStats.raw,
            layers: boardStats.layers,
            features: cloneBoardFeatures(board.features),
            users
        }
    }).sort((a, b) => b.onlineUsers - a.onlineUsers || a.id.localeCompare(b.id))

    const totals = boardStates.reduce((acc, board) => {
        acc.onlineBoards++
        acc.onlineUsers += board.onlineUsers
        acc.activeStrokes += board.activeStrokes
        acc.completedStrokes += board.completedStrokes
        acc.rawEvents += board.rawEvents
        return acc
    }, {
        onlineBoards: 0,
        onlineUsers: 0,
        activeStrokes: 0,
        completedStrokes: 0,
        rawEvents: 0
    })

    return {
        generatedAt: new Date().toISOString(),
        totals,
        boards: boardStates
    }
}

async function loadLineStats(boardIds) {
    const result = {
        boards: new Map(),
        users: new Map()
    }
    if (!db || boardIds.length < 1) return result

    const rows = await db.collection(linesCollectionName).aggregate([
        { $match: { board: { $in: boardIds } } },
        {
            $project: {
                board: 1,
                event: { $ifNull: ['$event', '$data.e'] },
                layer: { $ifNull: ['$layer', '$data.layer'] },
                trazosId: { $ifNull: ['$trazosId', '$data.id'] },
                timestamp: 1
            }
        },
        {
            $facet: {
                boards: [
                    {
                        $group: {
                            _id: { board: '$board', layer: '$layer' },
                            raw: { $sum: 1 },
                            lastEventAt: { $max: '$timestamp' },
                            completed: {
                                $sum: { $cond: [{ $eq: ['$event', 'RELEASED'] }, 1, 0] }
                            }
                        }
                    }
                ],
                users: [
                    {
                        $group: {
                            _id: { board: '$board', trazosId: '$trazosId', layer: '$layer' },
                            raw: { $sum: 1 },
                            lastEventAt: { $max: '$timestamp' },
                            completed: {
                                $sum: { $cond: [{ $eq: ['$event', 'RELEASED'] }, 1, 0] }
                            }
                        }
                    }
                ]
            }
        }
    ]).toArray()

    const facets = rows[0] || { boards: [], users: [] }
    for (const row of facets.boards) {
        const stats = ensureStats(result.boards, row._id.board)
        addLayerStats(stats, row._id.layer, row.raw, row.completed, row.lastEventAt)
    }
    for (const row of facets.users) {
        if (!row._id.trazosId) continue
        const stats = ensureStats(result.users, `${row._id.board}:${row._id.trazosId}`)
        addLayerStats(stats, row._id.layer, row.raw, row.completed, row.lastEventAt)
    }

    return result
}

function emptyStats() {
    return {
        raw: 0,
        completed: 0,
        lastEventAt: null,
        layers: [0, 0, 0, 0]
    }
}

function ensureStats(map, key) {
    if (!map.has(key)) map.set(key, emptyStats())
    return map.get(key)
}

function addLayerStats(stats, layer, raw, completed, lastEventAt) {
    const layerIndex = Number(layer || 0)
    stats.raw += raw
    stats.completed += completed
    if (lastEventAt && (!stats.lastEventAt || lastEventAt > stats.lastEventAt)) {
        stats.lastEventAt = lastEventAt
    }
    if (layerIndex >= 0 && layerIndex < stats.layers.length) {
        stats.layers[layerIndex] += completed
    }
}

function scheduleAdminState() {
    if (adminStateTimer) return
    adminStateTimer = setTimeout(async () => {
        adminStateTimer = null
        await emitAdminState()
    }, 100)
}

async function emitAdminState() {
    if (adminSockets.size < 1) return
    const state = await buildAdminState()
    for (const socket of adminSockets) {
        socket.emit('admin:state', state)
    }
}

async function emitAdminStateTo(socket) {
    socket.emit('admin:state', await buildAdminState())
}

async function eraseBoard(board) {
    if (!db) throw new Error('mongo_unavailable')
    const pairs = await getAffectedPairs({ board })
    const result = await db.collection(linesCollectionName).deleteMany({ board })
    emitDeletePairs(board, pairs)
    const boardState = boards.get(board)
    if (boardState) boardState.activeStrokes.clear()
    scheduleAdminState()
    return result.deletedCount
}

async function eraseUser(board, trazosId) {
    if (!db) throw new Error('mongo_unavailable')
    const pairs = await getAffectedPairs({ board }, trazosId)
    const result = await db.collection(linesCollectionName).deleteMany({
        board,
        $or: [
            { trazosId },
            { user: trazosId },
            { 'data.id': trazosId }
        ]
    })
    emitDeletePairs(board, pairs)

    const boardState = boards.get(board)
    if (boardState) {
        for (const [key, stroke] of boardState.activeStrokes.entries()) {
            if (stroke.trazosId === trazosId) boardState.activeStrokes.delete(key)
        }
    }
    scheduleAdminState()
    return result.deletedCount
}

async function pruneBoardIfNeeded(board) {
    if (!memoryReady() || !board?.features?.autoEraseOldTrazos?.enabled) return 0

    const maxTrazos = Number(board.features.autoEraseOldTrazos.maxTrazos)
    if (!Number.isInteger(maxTrazos) || maxTrazos < 1) return 0

    const rows = await db.collection(linesCollectionName).aggregate([
        {
            $match: {
                board: board.id,
                event: 'RELEASED'
            }
        },
        {
            $project: {
                gestureId: { $ifNull: ['$id', '$data.gesture_id'] },
                layer: { $ifNull: ['$layer', '$data.layer'] },
                ownerId: { $ifNull: ['$trazosId', '$data.id'] },
                timestamp: 1
            }
        },
        {
            $match: {
                gestureId: { $nin: [null, ''] }
            }
        },
        { $sort: { timestamp: -1 } },
        { $skip: maxTrazos }
    ]).toArray()

    if (rows.length < 1) return 0

    const staleGestureIds = rows.map((row) => row.gestureId)
    const result = await db.collection(linesCollectionName).deleteMany({
        board: board.id,
        $or: [
            { id: { $in: staleGestureIds } },
            { 'data.gesture_id': { $in: staleGestureIds } }
        ]
    })

    for (const row of rows) {
        io.to(board.id).emit('deleteEvent', {
            layer: Number(row.layer || 0),
            id: String(row.ownerId || ''),
            gesture_id: String(row.gestureId)
        })
    }

    return result.deletedCount
}

async function getAffectedPairs(match, trazosId = null) {
    const pipeline = [
        { $match: match },
        {
            $project: {
                layer: { $ifNull: ['$layer', '$data.layer'] },
                trazosId: { $ifNull: ['$trazosId', '$data.id'] }
            }
        }
    ]
    if (trazosId) pipeline.push({ $match: { trazosId } })
    pipeline.push({
        $group: {
            _id: {
                layer: '$layer',
                trazosId: '$trazosId'
            }
        }
    })

    const rows = await db.collection(linesCollectionName).aggregate(pipeline).toArray()
    return rows
        .filter((row) => row._id.trazosId != null && row._id.layer != null)
        .map((row) => ({
            layer: Number(row._id.layer),
            id: String(row._id.trazosId)
        }))
}

function emitDeletePairs(board, pairs) {
    for (const pair of pairs) {
        io.to(board).emit('deleteEvent', pair)
    }
}

function emitDeleteForUser(board, trazosId) {
    for (let layer = 0; layer < boardLayerCount; layer++) {
        io.to(board).emit('deleteEvent', {
            layer,
            id: trazosId
        })
    }
}

function memoryReady() {
    return memoryEnabled && db !== null
}

function parseBoolean(value, defaultValue) {
    if (value == null) return defaultValue
    return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

function parseNumber(value, defaultValue) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : defaultValue
}

function normalizeUsername(value) {
    if (typeof value !== 'string') return ''
    return value.trim().slice(0, 40)
}

function debugSocketEvent(action, roomId, socketId, data) {
    if (!debugTrazosSocket) return
    console.log('[trazos-socket]', action, {
        roomId,
        socketId,
        event: data?.e,
        id: data?.id,
        gestureId: data?.gesture_id,
        layer: data?.layer,
        x: data?.x,
        y: data?.y
    })
}

function parseCookies(header = '') {
    return header.split(';').reduce((cookies, item) => {
        const index = item.indexOf('=')
        if (index < 0) return cookies
        const key = item.slice(0, index).trim()
        const value = item.slice(index + 1).trim()
        cookies[key] = decodeURIComponent(value)
        return cookies
    }, {})
}

function getCookie(header, name) {
    return parseCookies(header || '')[name]
}

async function getAdminFromRequest(req) {
    return getAdminFromCookieHeader(req.headers.cookie)
}

async function getAdminFromCookieHeader(cookieHeader) {
    if (!db) return null
    const token = getCookie(cookieHeader, adminCookieName)
    if (!token) return null

    const session = await db.collection('admin_sessions').findOne({
        token,
        expiresAt: { $gt: new Date() }
    })
    if (!session) return null
    return { username: session.username }
}

function setAdminCookie(res, token, expiresAt) {
    const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
    res.setHeader('Set-Cookie', `${adminCookieName}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`)
}

function clearAdminCookie(res) {
    res.setHeader('Set-Cookie', `${adminCookieName}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`)
}

async function verifyPassword(password, passwordHash) {
    const [salt, storedHash] = String(passwordHash || '').split(':')
    if (!salt || !storedHash) return false
    const derived = await scrypt(password, salt, 64)
    const stored = Buffer.from(storedHash, 'hex')
    if (stored.length !== derived.length) return false
    return timingSafeEqual(stored, derived)
}

async function saveTemporaryGif(rawData) {
    return saveGifDataUrl(rawData, {
        directory: gifTempDir,
        urlPrefix: gifUrlPrefix,
        maxBytes: gifMaxBytes
    })
}

function sendGifError(res, error) {
    const status = Number(error?.statusCode || error?.status || 500)
    const safeStatus = status >= 400 && status < 600 ? status : 500
    const message = safeStatus === 500 ? 'gif_processing_failed' : error.message
    if (safeStatus === 500) console.error(error)
    res.status(safeStatus).json({ error: message })
}

function getRequestBaseUrl(req) {
    const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim()
    const proto = forwardedProto || req.protocol
    return `${proto}://${req.get('host')}`
}

function scheduleGifCleanup() {
    const runCleanup = async () => {
        try {
            await cleanupOldGifFiles(gifTempDir, gifTempTtlMs)
        } catch (error) {
            console.error('Failed to clean up temporary GIF files:', error)
        }
    }

    runCleanup()
    setInterval(runCleanup, gifCleanupIntervalMs).unref()
}

async function initDB() {
    if (!memoryEnabled) return
    mongoClient = new MongoClient(mongoUrl)
    await mongoClient.connect()
    db = mongoClient.db(dbName)
    await ensureIndex(db.collection('admin_sessions'), { expiresAt: 1 }, {
        expireAfterSeconds: 0,
        name: 'admin_sessions_expires_at_idx'
    })
    await ensureIndex(db.collection('admin_users'), { username: 1 }, {
        unique: true,
        name: 'admin_users_username_idx'
    })
    await ensureIndex(db.collection(linesCollectionName), { board: 1, timestamp: 1 }, {
        name: 'board_timestamp_idx'
    })
    await ensureIndex(db.collection(linesCollectionName), { board: 1, user: 1, layer: 1 }, {
        name: 'board_user_layer_idx'
    })
    await ensureIndex(db.collection(linesCollectionName), { board: 1, trazosId: 1, layer: 1 }, {
        name: 'board_trazos_layer_idx'
    })
    await ensureIndex(db.collection(linesCollectionName), { timestamp: 1 }, {
        name: 'timestamp_ttl_idx',
        expireAfterSeconds: memoryTtlSeconds
    })
    console.log('Connected successfully to Mongo')
    console.log('Mongo running on: ' + mongoUrl)
}

async function ensureIndex(collection, keys, options) {
    try {
        await collection.createIndex(keys, options)
    } catch (err) {
        if (err?.code !== 85) throw err

        const existingIndexes = await collection.indexes()
        const matchingIndex = existingIndexes.find((index) => {
            return JSON.stringify(index.key) === JSON.stringify(keys)
        })
        if (!matchingIndex) throw err
    }
}

async function startServer() {
    scheduleGifCleanup()

    if (memoryEnabled) {
        try {
            await initDB()
        } catch (error) {
            console.error('Failed to initialize Mongo memory:', error)
            process.exit(1)
        }
    } else {
        console.log('Board memory disabled (TRAZOS_MEMORY_ENABLED=false)')
    }

    server.listen(port, () => {
        console.log('Running on *:' + port)
    })
}

startServer()

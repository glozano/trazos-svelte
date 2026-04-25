import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { handler } from '../build/handler.js'
import console from 'console'
import uap from 'ua-parser-js'
import textBody from 'body'
import { v4 as uuidv4 } from 'uuid'
import { mkdirp } from 'mkdirp'
import { writeFile } from 'node:fs'
import { MongoClient } from 'mongodb'
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)

const mongoActive = process.env.TRAZOS_MEMORY_ENABLED !== 'false'
const port = Number(process.env.PORT || 3000)
const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017'
const dbName = process.env.MONGO_DB_NAME || 'mongo_trazos'
const linesCollectionName = process.env.MONGO_LINES_COLLECTION || 'lines'
const memoryTtlSeconds = Number(process.env.TRAZOS_MEMORY_TTL_SECONDS || 10800)
const replayLimit = Number(process.env.TRAZOS_MEMORY_REPLAY_LIMIT || 0)
const adminSessionTtlSeconds = Number(process.env.ADMIN_SESSION_TTL_SECONDS || 86400)
const adminCookieName = 'trazos_admin_session'

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

app.post('/files', function(req, res) {
    const extract = function (err, data) {
        if (err) {
            res.status(400).json({ error: 'invalid_body' })
            return
        }
        if (!data) return
        res.setHeader('Content-Type', 'application/json')
        const filePath = saveImage(data)
        res.send(JSON.stringify({ filename: filePath }))
        console.log('Saved file: ' + filePath)
    }

    textBody(req, extract)
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

    socket.on('disconnect', function() {
        adminSockets.delete(socket)
    })
}

function handleBoardConnection(socket) {
    let chatUser = false
    const roomId = String(socket.handshake.query?.room_id || 'default')
    const clientId = socket.id
    const board = ensureBoard(roomId)
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
    scheduleAdminState()

    io.emit('connections', {
        connections: getOnlineUserCount()
    })

    socket.on('clientConnectionEvent', async function(data) {
        user.trazosId = data?.id == null ? null : String(data.id)
        scheduleAdminState()

        if (mongoActive && db) {
            const cursor = db.collection(linesCollectionName)
                .find({ board: roomId })
                .sort({ timestamp: 1 })

            if (replayLimit > 0) cursor.limit(replayLimit)
            const boardLines = await cursor.toArray()
            if (boardLines.length) {
                socket.emit('previousLines', boardLines)
            }
        }
    })

    socket.on('new message', function (data) {
        socket.broadcast.to(roomId).emit('new message', {
            username: socket.username,
            text: data
        })
    })

    socket.on('add user', function (username) {
        if (chatUser) return
        socket.username = username
        user.username = username
        chatUser = true

        const usernames = getBoardUsernames(board)
        socket.emit('chat login', {
            username: socket.username,
            numUsers: usernames.length,
            usernames
        })
        socket.broadcast.to(roomId).emit('user joined', {
            username: socket.username,
            numUsers: usernames.length,
            usernames
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

        trackActiveStroke(board, event, trazosId, layer, clientId)
        board.lastEventAt = now
        user.lastEventAt = now

        if (mongoActive && db) {
            await db.collection(linesCollectionName).insertOne({
                board: roomId,
                id: data?.gesture_id,
                data,
                event,
                layer,
                trazosId,
                socketId: clientId,
                user: clientId,
                timestamp: now
            })
        }

        socket.broadcast.to(roomId).emit('externalMouseEvent', data)
        user.rawEvents++
        scheduleAdminState()
    })

    socket.on('deleteEvent', async function(data) {
        socket.broadcast.to(roomId).emit('deleteEvent', data)

        if (mongoActive && db) {
            await db.collection(linesCollectionName).deleteMany({
                board: roomId,
                layer: Number(data?.layer || 0),
                $or: [
                    { socketId: clientId },
                    { user: clientId }
                ]
            })
        }
        scheduleAdminState()
    })

    socket.on('disconnect', function() {
        if (chatUser) {
            socket.broadcast.to(roomId).emit('chat logout', {
                numUsers: Math.max(0, getBoardUsernames(board).length - 1),
                usernames: getBoardUsernames(board).filter((name) => name !== socket.username)
            })
        }

        clearSocketActiveStrokes(board, clientId)
        board.sockets.delete(clientId)
        if (board.sockets.size < 1) {
            boards.delete(roomId)
            if (mongoActive && db) {
                db.collection(linesCollectionName).deleteMany({ board: roomId })
            }
        }

        io.emit('user_disconnected', {
            connections: getOnlineUserCount()
        })
        scheduleAdminState()
    })
}

function ensureBoard(boardId) {
    if (!boards.has(boardId)) {
        boards.set(boardId, {
            id: boardId,
            createdAt: new Date(),
            lastEventAt: null,
            sockets: new Map(),
            activeStrokes: new Map()
        })
    }
    return boards.get(boardId)
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

function saveImage(rawData) {
    const regex = /^data:.+\/(.+);base64,(.*)$/
    const matches = rawData.match(regex)
    const ext = matches[1]
    const data = matches[2]
    const buffer = Buffer.from(data, 'base64')
    const publicDir = 'public'
    const usrImgDir = 'user-img'
    const pubUserImgDir = publicDir + '/' + usrImgDir
    const filename = usrImgDir + '/' + uuidv4() + '.' + ext
    mkdirp.sync(pubUserImgDir)
    writeFile(publicDir + '/' + filename, buffer, function(err) {
        if (err) throw err
    })
    return filename
}

async function initDB() {
    if (!mongoActive) return
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
    await ensureIndex(db.collection(linesCollectionName), { board: 1, trazosId: 1, layer: 1 }, {
        name: 'board_trazos_layer_idx'
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

server.listen(port, async () => {
    console.log('Running on *:' + port)

    if (mongoActive) {
        await initDB()

        const ttlMs = memoryTtlSeconds * 1000
        await db.collection(linesCollectionName).deleteMany({ timestamp: { $lt: new Date(Date.now() - ttlMs) } })

        setInterval(function () {
            db.collection(linesCollectionName).deleteMany({ timestamp: { $lt: new Date(Date.now() - ttlMs) } })
        }, 60 * 60 * 1000)
    }
})

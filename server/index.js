import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { handler } from '../build/handler.js'
import console from 'console'
import uap from 'ua-parser-js'
import textBody from 'body'
import { v4 as uuidv4 } from 'uuid';
import { mkdirp } from 'mkdirp'
import { writeFile } from 'node:fs';


import { MongoClient }  from 'mongodb'


const MEMORY_ENABLED = parseBoolean(process.env.TRAZOS_MEMORY_ENABLED, true);
const port = Number(process.env.PORT || 3000);
const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';
const mongoDbName = process.env.MONGO_DB_NAME || 'mongo_trazos';
const mongoCollectionName = process.env.MONGO_LINES_COLLECTION || 'lines';
const memoryTtlSeconds = Math.max(1, parseNumber(process.env.TRAZOS_MEMORY_TTL_SECONDS, 3 * 60 * 60));
const replayLimit = Math.max(0, parseNumber(process.env.TRAZOS_MEMORY_REPLAY_LIMIT, 0));

// SvelteKit should handle everything else using Express middleware
// https://github.com/sveltejs/kit/tree/master/packages/adapter-node#custom-server


//////////////////////

// Dependencias

// var textBody = require("body");
const app = express();

app.post('/files', function(req, res) {
    const extract = function (err, data) {
        if (!data) return
        res.setHeader('Content-Type', 'application/json');
        const filePath = saveImage(data);
        res.send(JSON.stringify({ filename: filePath}));
        console.log('Saved file: ' + filePath);
    }

    textBody(req, extract);
});


const server = createServer(app);
const io = new Server(server,{
    connectionStateRecovery: {
      // the backup duration of the sessions and the packets
      maxDisconnectionDuration: 2 * 60 * 1000,
      // whether to skip middlewares upon successful recovery
      skipMiddlewares: true,
    }
  })
// var fs = require("fs");

// var Hashids = require("hashids"),
// hashids = new Hashids("this is my salt",0, "0123456789abcdef");
var connections = 0;
var chatConnections = [];
var log =[];


// MongoDB vars
var db = null;
var mongoClient = null;

// const Mailjet = require('node-mailjet');
// const mailjet = Mailjet.apiConnect(
//     '****************************1234', '****************************abcd'
// );
// const mailjet = require('node-mailjet');
// const mailjetConnection = mailjet.connect('****************************1234', '****************************abcd');
// console.log(mailjetConnection);

// Mapea los socket ids con el id generado por cada cliente
var clients = [];

// Lo uso para generar ids de boards
var boards = {};

function initDB(){
    // Use a single client connection for all Mongo operations.
    return (async function connectMongo() {
        mongoClient = new MongoClient(mongoUrl);
        await mongoClient.connect();
        db = mongoClient.db(mongoDbName);
        console.log("Connected successfully to Mongo");
        console.log('Mongo running on: '+mongoUrl);
    })();
}

function memoryReady() {
    return MEMORY_ENABLED && db !== null;
}

function parseBoolean(value, defaultValue) {
    if (value == null) return defaultValue;
    return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function parseNumber(value, defaultValue) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : defaultValue;
}

function normalizeUsername(value) {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, 40);
}

async function ensureMemoryIndexes() {
    if(!memoryReady()) return;
    await db.collection(mongoCollectionName).createIndex(
        { board: 1, timestamp: 1 },
        { name: 'board_timestamp_idx' }
    );
    await db.collection(mongoCollectionName).createIndex(
        { board: 1, user: 1, layer: 1 },
        { name: 'board_user_layer_idx' }
    );
    await db.collection(mongoCollectionName).createIndex(
        { timestamp: 1 },
        { name: 'timestamp_ttl_idx', expireAfterSeconds: memoryTtlSeconds }
    );
}

function getActiveBoards() {
    return Object.values(boards)
        .filter((board) => board && !board.isPrivate && board.connections > 0)
        .sort((a, b) => {
            if (b.connections !== a.connections) return b.connections - a.connections;
            return String(b.lastActiveAt || '').localeCompare(String(a.lastActiveAt || ''));
        })
        .map((board) => ({
            id: board.id,
            connections: board.connections
        }));
}

function getConnectedBoardClients(roomId) {
    return clients.filter((client) => client.board === roomId && client.connected);
}

function getBoardUsers(roomId) {
    return getConnectedBoardClients(roomId).map((client) => client.username || '');
}

function normalizeViewportDimension(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.round(parsed);
}

function getBoardCanvasSize(roomId) {
    const boardClients = getConnectedBoardClients(roomId);
    let width = 0;
    let height = 0;
    for (const client of boardClients) {
        const clientWidth = normalizeViewportDimension(client?.viewport?.width);
        const clientHeight = normalizeViewportDimension(client?.viewport?.height);
        if (clientWidth > width) width = clientWidth;
        if (clientHeight > height) height = clientHeight;
    }
    return { width, height };
}

app.get('/api/boards/active', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
        boards: getActiveBoards(),
        updatedAt: new Date().toISOString()
    }));
});

app.use(handler)

// Conexión
io.on('connection', function(socket) {
    var chatUser = false;
    
    // Recibo desde el cliente el room_id
    var room_id = socket.handshake.query.room_id;
    var requestedPrivateBoard = parseBoolean(socket.handshake.query.private, false);
    // var client_id = socket.client.conn.id;
    var client_id = socket.id;
    socket.join(room_id);

    if (!chatConnections[room_id]) chatConnections[room_id] = {qty:0,usernames:[]};

    // Suma una conexion
    connections++;
    var boardExisted = Boolean(boards[room_id]);
    if (boards[room_id]) {
        boards[room_id].connections++;
        boards[room_id].lastActiveAt = new Date().toISOString();
    } else {
        boards[room_id] = {
            id: room_id,
            connections: 1,
            isPrivate: requestedPrivateBoard,
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString()
        };
    }
    var boardMeta = boards[room_id];
    socket.joinAnnouncementSent = false;

    function emitBoardPresence() {
        io.to(room_id).emit('boardPresence', {
            roomId: room_id,
            onlineUsers: boardMeta.connections,
            users: getBoardUsers(room_id)
        });
    }

    function getClientRecord() {
        return clients.find((client) => client.socketId == socket.id);
    }

    function setClientViewport(rawViewport) {
        var client = getClientRecord();
        if (!client || !rawViewport) return;
        const width = normalizeViewportDimension(rawViewport.width);
        const height = normalizeViewportDimension(rawViewport.height);
        if (!width || !height) return;
        client.viewport = { width, height };
    }

    function emitBoardCanvasInfo() {
        const canvasSize = getBoardCanvasSize(room_id);
        io.to(room_id).emit('boardCanvasInfo', {
            roomId: room_id,
            width: canvasSize.width,
            height: canvasSize.height
        });
    }

    function setCanvasUsername(rawUsername) {
        var normalizedUsername = normalizeUsername(rawUsername);
        if (!normalizedUsername) return '';
        socket.canvasUsername = normalizedUsername;
        if (clients.find((el) => el.socketId == socket.id)) {
            clients.find((el) => el.socketId == socket.id).username = normalizedUsername;
        }
        return normalizedUsername;
    }

    function announceBoardJoinIfNeeded(username) {
        if (!username || socket.joinAnnouncementSent) return;
        socket.joinAnnouncementSent = true;
        socket.broadcast.to(room_id).emit('boardUserJoined', {
            username,
            onlineUsers: boardMeta.connections
        });
    }

    socket.emit('boardSessionInfo', {
        roomId: room_id,
        onlineUsers: boardMeta.connections,
        joinedExistingBoard: boardExisted,
        isPrivate: boardMeta.isPrivate,
        users: getBoardUsers(room_id)
    });
    emitBoardPresence();
    emitBoardCanvasInfo();
    if (socket.recovered) {
        // console.log("recuperado pa");
        log.push(
            "Usuario "+socket.id+" recuperado en board "+room_id+". Reconexión a las "+new Date().toTimeString().split(' ')[0]
        );
        if(clients.find((el) => el.socketId == socket.id)){
            clients.find((el) => el.socketId == socket.id).connected = true;
        }
    }else{
        log.push(
            "Usuario "+socket.id+" conectado en board "+room_id+" a las "+new Date().toTimeString().split(' ')[0]
        );
    }
    // console.log('Usuarios conectados: ', connections);

    // Usuario conectado
    socket.broadcast.emit('connections',{
        connections: connections
    });

    // Usuario conectado
    socket.emit('connections', {
        connections: connections
    });

    socket.on('clientConnectionEvent', async function(data) {
        var normalizedUsername = setCanvasUsername(data?.username);
        var existingClient = getClientRecord();
        if (existingClient) {
            existingClient.trazosId = data.id;
            existingClient.board = room_id;
            existingClient.connected = true;
            existingClient.time = new Date().toTimeString().split(' ')[0];
            existingClient.username = normalizedUsername;
        } else {
            clients.push({
                "socketId" : client_id,
                "trazosId"  : data.id,
                "board" : room_id,
                "lines" : 0,
                "ua" : uap(socket.request.headers['user-agent']).os,
                "connected" : true,
                "time" : new Date().toTimeString().split(' ')[0],
                "username" : normalizedUsername,
                "viewport" : null
            });
        }
        setClientViewport(data?.viewport);

        emitBoardPresence();
        emitBoardCanvasInfo();
        announceBoardJoinIfNeeded(normalizedUsername);
        // clients[client_id] = data.id;
        // console.log("Se conecto el usuario " + data.id);

        // Enviar las lineas pasadas cuando el usuario se conecta
        if(memoryReady()){
            var replayQuery = db.collection(mongoCollectionName)
                .find({"board":room_id})
                .project({ _id: 0, data: 1, timestamp: 1 })
                .sort({ timestamp: 1 });
            if (replayLimit > 0) replayQuery = replayQuery.limit(replayLimit);
            const boardLines = await replayQuery.toArray();
            if(boardLines.length){
                socket.emit("previousLines",boardLines);
            }
        }

    });

    socket.on('setCanvasUsername', function(data) {
        var normalizedUsername = setCanvasUsername(data?.username);
        emitBoardPresence();
        announceBoardJoinIfNeeded(normalizedUsername);
    });

    socket.on('boardViewport', function(data) {
        setClientViewport(data);
        emitBoardCanvasInfo();
    });

    // Mensaje del chat
    socket.on('new message', function (data) {
        socket.broadcast.to(room_id).emit('new message', {
            username: socket.username,
            text: data
        });
    });

    // Nuevo usuario al chat
    socket.on('add user', function (username) {
        if (chatUser) return;
        // we store the username in the socket session for this client
        socket.username = normalizeUsername(username);
        if (!socket.username) return;
        var normalizedUsername = setCanvasUsername(socket.username);
        emitBoardPresence();
        announceBoardJoinIfNeeded(normalizedUsername);
        ++chatConnections[room_id].qty;
        chatConnections[room_id].usernames.push(socket.username);
        console.log('Usuarios conectados al chat: ', chatConnections[room_id].qty);
        console.log("Se conecto al chat el usuario " + socket.username);
        chatUser = true;
        socket.emit('chat login', {
            username: socket.username,
            numUsers: chatConnections[room_id].qty,
            usernames: chatConnections[room_id].usernames
        });
        // echo globally (all clients) that a person has connected
        socket.broadcast.to(room_id).emit('user joined', {
            username: socket.username,
            numUsers: chatConnections[room_id].qty,
            usernames: chatConnections[room_id].usernames
        });
    });

    // when the client emits 'typing', we broadcast it to others
    socket.on('typing', function () {
        socket.broadcast.to(room_id).emit('typing', {
            username: socket.username
        });
    });

    // when the client emits 'stop typing', we broadcast it to others
    socket.on('stop typing', function () {
        socket.broadcast.to(room_id).emit('stop typing', {
            username: socket.username
        });
    });

    // Movimiento del puntero
    // socket.on('mousemove', function(data) {
    //     socket.broadcast.to(room_id).emit('move', data);
    // });

    // Movimiento de los trazos
    socket.on('externalMouseEvent',async function(data) {
        
        // Guardar lineas
        if(memoryReady()){
            const strokeOwnerId = data.id ?? client_id;
            db.collection(mongoCollectionName).insertOne({
                board:room_id,
                id: data.gesture_id,
                data:data,
                layer:data.layer,
                user:strokeOwnerId,
                timestamp:new Date()
            });
        }
        socket.broadcast.to(room_id).emit('externalMouseEvent',data);
        if(clients.find((el) => el.socketId == socket.id)){
            clients.find((el) => el.socketId == socket.id).lines++;
        }

        // Borrar lineas viejas cuando pasa los 500

        // // console.log( await db.collection("lines").count({board:room_id}));
        // while(await db.collection("lines").count({board:room_id}) > 500){
        //     var oldestLine = await db.collection("lines").findOne({ board : room_id },{sort:{ timestamp : 1 }});
        //     await db.collection("lines").deleteMany({
        //         board:room_id,
        //         id: oldestLine.id
        //     });
        //     var del = {
        //         'layer': oldestLine.layer,
        //         'user_id': oldestLine.data.id,
        //         'gesture_id': oldestLine.id
        //     }
        //     // console.log(del); SACAR EL BROADCAST para enviar tambien a quien dibuja
        //     socket.broadcast.to(room_id).emit('deleteEvent', del);
        //     // console.log("Borro "+oldestLine.id);
        // }
    });

    socket.on('deleteEvent', function(data) {
        socket.broadcast.to(room_id).emit('deleteEvent', data);
        
        // Borrar lineas 
        if(memoryReady()){
            const strokeOwnerId = data.id ?? client_id;
            db.collection(mongoCollectionName).deleteMany({
                board:room_id,
                user:strokeOwnerId,
                layer:data.layer
            });
        }
    });

    // Desconexion de un cliente
    socket.on('disconnect', function() {
        var disconnectedClient = getClientRecord();
        if (disconnectedClient) {
            disconnectedClient.connected = false;
            disconnectedClient.viewport = null;
        }
        if(chatUser){
            chatConnections[room_id].qty--;
            for (var i=chatConnections[room_id].usernames.length-1; i>=0; i--) {
                if (chatConnections[room_id].usernames[i] === socket.username) {
                    chatConnections[room_id].usernames.splice(i, 1);
                    // break;       //<-- Uncomment  if only the first term has to be removed
                }
            }
            socket.broadcast.to(room_id).emit('chat logout', {
                numUsers: chatConnections[room_id].qty,
                usernames: chatConnections[room_id].usernames
            });
        }
        connections--;
        
        // if(clients.length > 0) console.log("Se desconecto el usuario " + clients[client_id]);

        console.log('Usuarios conectados: ', connections);
        
        socket.broadcast.emit('user_disconnected', {
            connections: connections
        });
        // socket.broadcast.to(room_id).emit('deleteEvent', {
        //     username: socket.username,
        //     connections: connections
        // });
       
        // Delete all gestures from this client

        // var id = clients[client_id];
        // for (var i = 0; i < 4; i++) {
        //     var del = {
        //         'layer': i,
        //         'id': id
        //     }
        //     socket.broadcast.to(room_id).emit("deleteEvent", del);
        //     db.collection("lines").deleteMany({"user":client_id});
        // }
        if (boards[room_id]) {
            boards[room_id].connections = Math.max(0, boards[room_id].connections - 1);
            boards[room_id].lastActiveAt = new Date().toISOString();
        }

        // Si no quedan mas usuarios borrar todas las lineas
        if(boards[room_id] && boards[room_id].connections < 1){
            if(memoryReady()){
                db.collection(mongoCollectionName).deleteMany({"board":room_id});
            }
        }
        if (boards[room_id]) {
            emitBoardPresence();
            emitBoardCanvasInfo();
        }
        
        
        // delete clients[client_id];
        log.push(
            "Usuario "+socket.id+" desconectado en board "+room_id+" a las "+new Date().toTimeString().split(' ')[0]
        );
        // console.dir(socket.id);
    });


});


function saveImage(rawData) {
    var regex = /^data:.+\/(.+);base64,(.*)$/;

    var matches = rawData.match(regex);
    var ext = matches[1];
    var data = matches[2];
    var buffer = new Buffer(data, 'base64');
    const publicDir = 'public';
    const usrImgDir = 'user-img';
    const pubUserImgDir = publicDir + '/' + usrImgDir;
    var filename = usrImgDir + '/' + uuidv4() + '.' + ext;
    mkdirp.sync(pubUserImgDir);
    writeFile(publicDir + '/' + filename, buffer, function(err) {
        if (err) throw err;
    });
    return filename;
}


function writeLogTable(){
    var structDatas = [];
        // { handler: 'http', endpoint: 'http://localhost:3000/path', method: 'ALL' },
        // { handler: 'event', endpoint: 'http://localhost:3000/event', method: 'POST' },
        // { handler: 'GCS', endpoint: 'http://localhost:3000/GCS', method: 'POST' }
    
    for(var i=0; i < clients.length; i++){
        structDatas.push({
            "Board": clients[i].board,
            "User Agent": clients[i].ua,
            "Socket ID" : clients[i].socketId,
            "Trazos ID": clients[i].trazosId,
            "Gestures": clients[i].lines,
            "Connected": clients[i].connected,
            "Last connection": clients[i].time,
        });
    }

    // clients.forEach((client)=>{
    //     structDatas.push({ handler: 'http', endpoint: 'http://localhost:3000/path', method: 'ALL' });
    // })
    console.dir(log);
    console.table(structDatas,["Board","User Agent","Socket ID","Trazos ID","Gestures","Connected","Last connection"]);
    
}

async function startServer() {
    if(MEMORY_ENABLED) {
        try {
            await initDB();
            await ensureMemoryIndexes();
        } catch (error) {
            console.error('Failed to initialize Mongo memory:', error);
            process.exit(1);
        }
    } else {
        console.log('Board memory disabled (TRAZOS_MEMORY_ENABLED=false)');
    }

    server.listen(port, () => {
        console.log('Running on *:'+port);
    });

    // setInterval(function () {
    //     console.clear();
    //     writeLogTable();
    // }, 1000);
}

startServer();

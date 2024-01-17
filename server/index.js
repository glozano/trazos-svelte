import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { handler } from '../build/handler.js'
import console from 'console'
import uap from 'ua-parser-js'


import { MongoClient }  from 'mongodb'

const port = 3000

// SvelteKit should handle everything else using Express middleware
// https://github.com/sveltejs/kit/tree/master/packages/adapter-node#custom-server


//////////////////////

// Dependencias

// var textBody = require("body");
const app = express();
app.use(handler)
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
// var uuid = require('node-uuid');
// var mkdirp = require('mkdirp');
// var Hashids = require("hashids"),
// hashids = new Hashids("this is my salt",0, "0123456789abcdef");
var connections = 0;
var chatConnections = [];
var log =[];


// MongoDB vars
var db = null;
const url = 'mongodb://localhost:27017';
const dbName = 'mongo_trazos';

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
var boardSeed = 0;
var boards = [];

function initDB(){
    // Use connect method to connect to the server
    MongoClient.connect(url,(err, client)=>{
        console.log("Connected successfully to Mongo");
        db = client.db(dbName);
    });
}

// Conexión
io.on('connection', function(socket) {
    var chatUser = false;
    
    // Recibo desde el cliente el room_id
    var room_id = socket.handshake.query.room_id;
    // var client_id = socket.client.conn.id;
    var client_id = socket.id;
    socket.join(room_id);

    if (!chatConnections[room_id]) chatConnections[room_id] = {qty:0,usernames:[]};

    // Suma una conexion
    connections++;
    if(boards[room_id]){
        boards[room_id].connections++;
    }else{
        boards[room_id] = {
            "id":room_id,
            "connections":1
        };
    }
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
        clients.push({
            "socketId" : client_id,
            "trazosId"  : data.id,
            "board" : room_id,
            "lines" : 0,
            "ua" : uap(socket.request.headers['user-agent']).os,
            "connected" : true,
            "time" : new Date().toTimeString().split(' ')[0]
        })
        // clients[client_id] = data.id;
        // console.log("Se conecto el usuario " + data.id);

        // Enviar las lineas pasadas cuando el usuario se conecta

        const boardLines = await db.collection('lines').find({"board":room_id}).toArray();
        if(boardLines.length){
            socket.emit("previousLines",boardLines);
        }
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
        socket.username = username;
        ++chatConnections[room_id].qty;
        chatConnections[room_id].usernames.push(username);
        console.log('Usuarios conectados al chat: ', chatConnections[room_id].qty);
        console.log("Se conecto al chat el usuario " + username);
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
        
        db.collection("lines").insertOne({
            board:room_id,
            id: data.gesture_id,
            data:data,
            layer:data.layer,
            user:client_id,
            timestamp:new Date()
        });
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

        db.collection("lines").deleteMany({
            board:room_id,
            user:client_id,
            layer:data.layer
        });
    });

    // Desconexion de un cliente
    socket.on('disconnect', function(data) {
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


        boards[room_id].connections--;

        // Si no quedan mas usuarios borrar todas las lineas 

        if(boards[room_id].connections < 1){
            db.collection("lines").deleteMany({"board":room_id});
        }
        
        
        // delete clients[client_id];
        log.push(
            "Usuario "+socket.id+" desconectado en board "+room_id+" a las "+new Date().toTimeString().split(' ')[0]
        );
        // console.dir(socket.id);
        if(clients.find((el) => el.socketId == socket.id)){
            clients.find((el) => el.socketId == socket.id).connected = false ;
        }
    });


});


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

server.listen(port,async () =>{
    console.log('Running on *:3000');

    // Conexión a Mongo

    initDB();
    const client = new MongoClient(url);
    await client.connect();
    console.log("Connected successfully to Mongo");
    db =  await client.db(dbName);
    console.log('Mongo running on: '+url);
    console.log(db);


    setInterval(function () {
        console.clear();
        writeLogTable();
    }, 1000);


    // Borramos lineas viejas

    setInterval(function () {
        var THREE_HOURS = 3 * 60 * 60 * 1000; /* ms */
        db.collection("lines").deleteMany({"timestamp" : {$lt : new Date((new Date())-THREE_HOURS)}});
    }, 1 * 60 * 60 * 1000);
});

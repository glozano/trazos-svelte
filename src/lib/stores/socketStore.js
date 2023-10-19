import { io } from 'socket.io-client'
import { readable, writable } from 'svelte/store';

var _io;
var _id = Math.round(Date.now() * Math.random());
// var clients = {};

// var connected = false;

export const socket = writable(null);
export const id = readable(_id);

export const initSocket = function(roomId){
    _io = io({query: 'room_id='+roomId});
    socket.set(_io);
}
export const clientConnect = function(){
    var con = {
        'id': _id
    }  
    _io.emit("clientConnectionEvent", con);
}
export const deleteLayer = function(i){
    var del = {
        'layer': i,
        'id': _id
    }
    _io.emit("deleteEvent", del);
}


 
import { io } from 'socket.io-client';
import { readable, writable } from 'svelte/store';

var _io;
var _id = Math.round(Date.now() * Math.random());
// var clients = {};

// var connected = false;

export const socket = writable(null);
export const id = readable(_id);
export const onlineUsers = writable(1);
export const onlineUsernames = writable([]);
export const joinedExistingBoard = writable(false);
export const boardReady = writable(false);
export const boardJoinEvent = writable(null);

export const initSocket = function(roomId, options = {}){
    if (_io) _io.disconnect();

    joinedExistingBoard.set(false);
    boardReady.set(false);
    boardJoinEvent.set(null);
    onlineUsers.set(1);
    onlineUsernames.set([]);

    var query = { room_id: roomId };
    if (options.private) query.private = '1';

    function applyPresence(data) {
        if (Number.isFinite(data?.onlineUsers)) {
            onlineUsers.set(data.onlineUsers);
        }
        if (Array.isArray(data?.users)) {
            onlineUsernames.set(data.users.map((user) => (typeof user === 'string' ? user : '')));
        }
    }

    _io = io({ query });

    _io.on('boardPresence', function(data){
        applyPresence(data);
    });

    _io.on('boardSessionInfo', function(data){
        joinedExistingBoard.set(Boolean(data?.joinedExistingBoard));
        boardReady.set(true);
        applyPresence(data);
    });

    _io.on('boardUserJoined', function(data){
        if (Number.isFinite(data?.onlineUsers)) {
            onlineUsers.set(data.onlineUsers);
        }
        boardJoinEvent.set({
            id: Date.now() + Math.random(),
            username: typeof data?.username === 'string' ? data.username : '',
            onlineUsers: Number.isFinite(data?.onlineUsers) ? data.onlineUsers : null
        });
    });

    _io.on('disconnect', function(){
        onlineUsers.set(0);
        onlineUsernames.set([]);
    });

    socket.set(_io);
};

export const clientConnect = function(username = ''){
    var normalized = typeof username === 'string' ? username.trim() : '';
    var con = {
        id: _id,
        username: normalized
    };
    _io.emit("clientConnectionEvent", con);
};

export const setCanvasUsername = function(username){
    var normalized = typeof username === 'string' ? username.trim() : '';
    if (!normalized || !_io) return;
    _io.emit('setCanvasUsername', { username: normalized });
};

export const deleteLayer = function(i){
    var del = {
        layer: i,
        id: _id
    };
    _io.emit("deleteEvent", del);
};


 

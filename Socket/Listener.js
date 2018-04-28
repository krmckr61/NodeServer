let ClientSocketListener = require('./Client/SocketListener');
let ServerSocketListener = require('./Server/SocketListener');
let Request = require('../Core/Request');
let cookieParser = require('cookie-parser');

let Listener = function () {
    this.app;
    this.http;
    this.io;
    this.socket;
};

Listener.prototype.init = function () {
    this.app = require('express')();
    this.http = require('http').Server(this.app);
    this.io = require('socket.io')(this.http);

    this.http.listen(3000, function () {
        console.log('SERVER IS RUNNING ON *:3000');
    });

    this.initSockets();
};

Listener.prototype.initSockets = function () {
    this.io.on('connection', (socket) => {
        let id = Request.getClientId(socket.request);
        if (!id) {
            id = Request.getRepresentativeId(socket.request);

            ServerSocketListener.connection(id, socket, this.io);

            socket.on('takeClient', (clientId) => {
                ServerSocketListener.takeClient(clientId, id, socket, this.io);
            });

            socket.on('sendMessage', (data) => {
                ServerSocketListener.sendMessage(id, data, socket, this.io);
            });

            socket.on('destroyChat', (visitId) => {
                ServerSocketListener.destroyChat(id, visitId, socket, this.io);
            });

            socket.on('readMessages', (id) => {
                ServerSocketListener.readMessages(id);
            });

            socket.on('getHistory', (dates) => {
                ServerSocketListener.getHistory(dates, socket);
            });

            socket.on('getHistoryChat', (id) => {
                ServerSocketListener.getHistoryChat(id, socket);
            });

            socket.on('setOnlineStatus', (onlineStatus) => {
                ServerSocketListener.setOnlineStatus(id, onlineStatus, this.io);
            });

            socket.on('getShortcuts', (data) => {
                ServerSocketListener.getShortcuts(data, socket);
            });

            socket.on('getUserList', (visitId) => {
                ServerSocketListener.getUserList(id, visitId, socket, this.io);
            });

            socket.on('addUserToVisit', (data) => {
                ServerSocketListener.addUserToVisit(id, data.userId, data.visitId, socket, this.io);
            });

            socket.on('joinVisit', (clientId) => {
                ServerSocketListener.joinVisit(id, clientId, socket, this.io);
            });

            socket.on('takeNewVisit', (data) => {
                ServerSocketListener.takeNewVisit(id, data.userId, data.visitId, socket, this.io);
            });

            socket.on('logoutUserFromVisit', (visitId) => {
                ServerSocketListener.logoutUserFromVisit(id, visitId, socket, this.io);
            });

            socket.on('banClient', (data) => {
                ServerSocketListener.banUser(id, data.clientId, data.date, socket, this.io);
            });

            socket.on('sendPrivateMessage', (data) => {
                ServerSocketListener.sendPrivateMessage(id, data.clientId, data.message, socket, this.io);
            });

            socket.on('getCurrentTime', () => {
                ServerSocketListener.getCurrentTime(socket);
            });

            socket.on('disconnect', () => {
                ServerSocketListener.disconnect(id, this.io);
            });

        } else {

            ClientSocketListener.connection(id, socket, this.io);

            socket.on('clientLogin', (data) => {
                ClientSocketListener.clientLogin(id, data, socket, this.io);
            });

            socket.on('sendMessage', (data) => {
                ClientSocketListener.sendMessage(data, this.io);
            });

            socket.on('destroyChat', () => {
                ClientSocketListener.destroyChat(id, socket, this.io);
            });

            socket.on('rateChat', (value) => {
                ClientSocketListener.rateChat(id, value, socket, this.io);
            });

            socket.on('disconnect', () => {
                ClientSocketListener.disconnect(id, socket, this.io);
            });

        }
    });
};

module.exports = new Listener();
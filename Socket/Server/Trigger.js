let Client = require('../../Modules/Controllers/ClientController');
let Server = require('../../Modules/Controllers/ServerController');
let Visit = require('../../Modules/Controllers/VisitController');
let ClientTrigger = require('../Client/Trigger');
let cli = require('../../Modules/Model/Client');
let MessageModel = require('../../Modules/Model/Message');
let UserModel = require('../../Modules/Model/User');
let VisitModel = require('../../Modules/Model/Visit');

let Trigger = function () {
};

Trigger.prototype.initServer = function (id, users, socket, io) {
    this.loadClients(id, socket);
    this.loadTalkingClients(id, socket);
    this.loadUsers(id, io);
    Visit.autoTakeClients(users, io);
};

Trigger.prototype.loadUsers = function (id, io) {
    if (Object.keys(Server.getAll()).length > 1) {
        UserModel.getOtherUsers(id, Server.getAll()).then((users) => {
            if (users) {
                Server.getUserRoom(id, io).emit('loadUsers', users);
            }
        });
    }
    UserModel.getUser(id).then((user) => {
        io.to('user').emit('newUser', user);
    });
};

Trigger.prototype.loadClients = function (id, socket) {
    let visitors = Client.getAll();
    socket.emit('loadClients', visitors);
};

Trigger.prototype.loadTalkingClients = function (id, socket) {
    cli.getTalkingClients(id).then((rows) => {
        if (rows && rows.length > 0) {
            socket.emit('loadTalkingClients', rows);
            for (let i = 0; i < rows.length; i++) {
                let row = rows[i];

                MessageModel.getMessages(row.id).then((messages) => {
                    if (messages) {
                        socket.emit('loadMessages', {visitid: row.id, messages: messages});
                    }

                    VisitModel.getRecentVisits(row.visitorid, row.id).then((recentVisits) => {
                        if (recentVisits) {
                            socket.emit('loadRecentVisits', {visitId: row.id, recentVisits: recentVisits});
                            for (let i = 0; i < recentVisits.length; i++) {
                                MessageModel.getMessages(recentVisits[i]['id']).then((recentMessages) => {
                                    socket.emit('loadRecentVisitMessages', {
                                        recentVisitId: recentVisits[i]['id'],
                                        messages: recentMessages
                                    });
                                });
                            }
                        }
                    });
                });
            }
        } else {
            socket.emit('loadTalkingClients', []);
        }
    });
};

Trigger.prototype.takeClient = function (clientId, userId, visitId, socket, io) {
    ClientTrigger.showTalkPage(Client.get(clientId), io);
    io.to('user').emit('takeClient', Client.get(clientId));

    cli.getVisit(visitId).then((visit) => {
        Visit.getVisitRoom(visitId, io).emit('talkClient', visit);
        this.loadMessagesToUser(visitId, userId, io);

        VisitModel.getRecentVisits(clientId, visitId).then((recentVisits) => {
            if (recentVisits) {
                socket.emit('loadRecentVisits', {visitId: visitId, recentVisits: recentVisits});
                for (let i = 0; i < recentVisits.length; i++) {
                    MessageModel.getMessages(recentVisits[i]['id']).then((recentMessages) => {
                        socket.emit('loadRecentVisitMessages', {
                            visitId: visitId,
                            recentVisitId: recentVisits[i]['id'],
                            messages: recentMessages
                        });
                    });
                }
            }
        });
    });
};

Trigger.prototype.takeNewClient = function (clientId, user, visitId, socket, io) {
    ClientTrigger.newUser(clientId, Client.get(clientId).users, io);
    io.to('user').emit('takeClient', Client.get(clientId));
    cli.getVisit(visitId).then((visit) => {
        Server.getUserRoom(user.id, io).emit('talkClient', visit);
        this.loadMessagesToUser(visitId, user.id, io);

        VisitModel.getRecentVisits(clientId, visitId).then((recentVisits) => {
            if (recentVisits) {
                socket.emit('loadRecentVisits', {visitId: visitId, recentVisits: recentVisits});
                for (let i = 0; i < recentVisits.length; i++) {
                    MessageModel.getMessages(recentVisits[i]['id']).then((recentMessages) => {
                        socket.emit('loadRecentVisitMessages', {
                            recentVisitId: recentVisits[i]['id'],
                            messages: recentMessages
                        });
                    });
                }
            }
        });
    });
};

Trigger.prototype.leaveVisit = function (clientId, userId, visitId, socket, io) {
    ClientTrigger.newUser(clientId, Client.get(clientId).users, io);
    io.to('user').emit('takeClient', Client.get(clientId));
    cli.getVisit(visitId).then((visit) => {
        Server.getUserRoom(userId, io).emit('leaveVisit', visitId);
    });
};

Trigger.prototype.loadMessagesToUser = function (visitId, userId, io) {
    MessageModel.getMessages(visitId).then((messages) => {
        if (messages && messages.length > 0) {
            Server.getUserRoom(userId, io).emit('loadMessages', {visitid: visitId, messages: messages});
        }
    });
};

Trigger.prototype.loadMessages = function (visitId, io) {
    MessageModel.getMessages(visitId).then((messages) => {
        if (messages && messages.length > 0) {
            Visit.getVisitRoom(visitId, io).emit('loadMessages', {visitid: visitId, messages: messages});
        }
    });
};

Trigger.prototype.sendMessage = function (message, socket, io) {
    Visit.getVisitRoom(message.visitid, io).emit('getMessage', message);
};

Trigger.prototype.sendPrivateMessage = function (userId, io) {
    Server.getUserRoom(userId, io).emit('privateMessageSended');
};

Trigger.prototype.setHistory = function (rows, socket) {
    socket.emit('setHistory', rows);
};

Trigger.prototype.userConnect = function (id, io) {
    UserModel.getUser(id).then((user) => {
        if (user) {
            io.sockets.emit('newUser', user);
        }
    });
};

Trigger.prototype.clientDisconnect = function (clientId, io) {
    io.to('user').emit('disconnectClient', clientId);
};

Trigger.prototype.clientDisconnectChat = function (visitId, io) {
    Visit.getVisitRoom(visitId, io).emit('clientDisconnectChat', visitId);
};

Trigger.prototype.destroyChat = function (clientId, visitId, chatEndedMessage, io) {
    io.to('user').emit('chatDestroyed', clientId);
    Visit.getVisitRoom(visitId, io).emit('getMessage', chatEndedMessage);
    let client = Client.get(clientId);
    if(!client || client.data.banned === true) {
        Client.getClientRoom(clientId, io).emit('destroyClient', false);
    } else {
        Client.getClientRoom(clientId, io).emit('destroyClient', true);
    }
};

Trigger.prototype.userDisconnect = function (userId, io) {
    io.to('user').emit('userDisconnect', userId);
};

Trigger.prototype.showInformation = function (message, socket) {
    socket.emit('showInformation', message);
};

module.exports = new Trigger();
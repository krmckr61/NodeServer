let Trigger = require('./Trigger');
let Server = require('../../Modules/Controllers/ServerController');
let Client = require('../../Modules/Controllers/ClientController');
let ClientModel = require('../../Modules/Model/Client');
let srv = require('../../Modules/Model/Server');
let UserModel = require('../../Modules/Model/User');
let MessageModel = require('../../Modules/Model/Message');
let VisitModel = require('../../Modules/Model/Visit');
let BannedWordModel = require('../../Modules/Model/BannedWord');
let PreparedContentModel = require('../../Modules/Model/PreparedContent');
let Visit = require('../../Modules/Controllers/VisitController');
let ClientSocketController = require('../Client/SocketListener');
let BannedUserModel = require('../../Modules/Model/BannedUser');

let SocketListener = function () {
};

SocketListener.prototype.connection = function (id, socket, io) {
    Server.add(id, socket).then((res) => {
        Trigger.initServer(id, Server.getAll(), socket, io);
    });
};

SocketListener.prototype.takeClient = function (clientId, userId, socket, io) {
    UserModel.getOnlineStatus(userId).then((onlineStatus) => {
        if (onlineStatus == 1) {
            Client.takeClient(clientId, userId, socket, io).then((visitId) => {
                Trigger.takeClient(clientId, userId, visitId, socket, io);
            });
        } else {
            Trigger.showInformation('Müşteri alabilmek için durumunuzu çevrimiçi yapmalısınız.', socket);
        }
    });
};

SocketListener.prototype.takeNewVisit = function (userId, givenUserId, visitId, socket, io) {
    Client.takeNewClient(visitId, userId, socket, io).then((response) => {
        Trigger.sendMessage(response.message, socket, io);
        Visit.joinVisitRoom(visitId, socket);
        Trigger.takeNewClient(response.clientId, response.user, visitId, socket, io);
    });
};

SocketListener.prototype.addUserToVisit = function (userId, newUserId, visitId, socket, io) {
    Server.getUserRoom(newUserId, io).emit('takeVisit', {visitId: visitId, userId: newUserId});
};

SocketListener.prototype.joinVisit = function(userId, clientId, socket, io){
    VisitModel.getVisitIdFromClientId(clientId).then((visitId) => {
        VisitModel.hasUser(userId, visitId).then((hasUser) => {
            if(!hasUser) {
                Server.getUserRoom(userId, io).emit('takeVisit', {visitId: visitId, userId: userId});
            } else {
                Trigger.showInformation('Bu görüşmeye zaten katılmış durumdasınız.', socket);
            }
        });
    });
};

SocketListener.prototype.sendMessage = function (userId, data, socket, io) {
    BannedWordModel.initBannedWordNotification(userId, data.visitid, data.message);

    MessageModel.sendUserMessage(userId, data.visitid, data.message).then((message) => {
        if (message) {
            Trigger.sendMessage(message, socket, io);
        }
    });
};

SocketListener.prototype.sendPrivateMessage = function (userId, clientId, message, socket, io) {
    VisitModel.getVisitIdFromClientId(clientId).then((visitId) => {
        MessageModel.sendUserMessage(userId, visitId, message, 1).then((message) => {
            if(message) {
                Trigger.sendMessage(message, socket, io);
                Trigger.sendPrivateMessage(userId, io);
            }
        });
    });
};

SocketListener.prototype.destroyChat = function (visitId, socket, io) {
    ClientModel.getClientIdFromVisitId(visitId).then((clientId) => {
        if (clientId) {
            let client = Client.get(clientId);
            if (client) {
                let visitId = client.visitId;
                if (visitId) {
                    MessageModel.addWelcomeMessage('chatEnded', visitId).then((message) => {
                        VisitModel.destroyVisit(visitId, '3').then((destroy) => {
                            Client.destroyChat(clientId);
                            Trigger.destroyChat(clientId, visitId, message, io);
                            Trigger.clientDisconnect(clientId, io);
                            ClientSocketController.reconnectClient(clientId, socket, io);
                            Visit.autoTakeClients(Server.getAll(), io);
                            Trigger.clientDisconnectChat(visitId, io);
                        });
                    });
                }
            }
        }
    });
};

SocketListener.prototype.readMessages = function (id) {
    MessageModel.readMessages(id, '1');
};

SocketListener.prototype.getHistory = function (dates, socket) {
    ClientModel.getHistory(dates).then((rows) => {
        if (rows.length > 0) {
            Trigger.setHistory(rows, socket);
        }
    });
};

SocketListener.prototype.getHistoryChat = function (id, socket) {
    ClientModel.getHistoryVisit(id).then((visit) => {
        if (visit) {
            VisitModel.getUsersFromVisit(id).then((users) => {
                visit.users = users;

                socket.emit('takeHistoryChat', visit);
                MessageModel.getHistoryMessages(id).then((rows) => {
                    for(let row in rows) {
                        if(rows[row].userid) {
                            rows[row].username = visit.users[rows[row].userid];
                        }
                    }
                    socket.emit('loadHistoryChatMessages', {visitid: id, messages: rows});
                });

                ClientModel.getClientIdFromVisitId(id).then((clientId) => {
                    VisitModel.getRecentVisits(clientId, visit.id).then((recentVisits) => {
                        socket.emit('loadRecentVisits', {visitId: visit.id, recentVisits: recentVisits});
                        for (let i = 0; i < recentVisits.length; i++) {
                            MessageModel.getMessages(recentVisits[i]['id']).then((recentMessages) => {
                                socket.emit('loadRecentVisitMessages', {visitId: id,
                                    recentVisitId: recentVisits[i]['id'],
                                    messages: recentMessages
                                });
                            });
                        }
                    });
                });
            });
        }
    });

};

SocketListener.prototype.disconnect = function (id, io) {
    Server.addDisconnectUser(id);
    setTimeout(() => {
        if (Server.hasDisconnectUser(id)) {
            console.log('a user disconnected');
            Server.remove(id);
            Trigger.userDisconnect(id, io);
        }
    }, Server.reconnectTime);
};

SocketListener.prototype.setOnlineStatus = function (userId, onlineStatus, io) {
    UserModel.setOnlineStatus(userId, onlineStatus).then((res) => {
        if (res) {
            Server.getUserRoom(userId, io).emit('setOnlineStatus', onlineStatus);
            io.to('user').emit('userSetStatus', {userId: userId, onlineStatus: onlineStatus});
        }
    });
};

SocketListener.prototype.getShortcuts = function (data, socket) {
    PreparedContentModel.getAllFromLetter(data.letter).then((contents) => {
        if (contents) {
            socket.emit('setShortcuts', {visitId: data.visitId, contents: contents});
        }
    });
};

SocketListener.prototype.getUserList = function (userId, visitId, socket, io) {
    UserModel.getOtherUsersWithoutVisit(userId, Server.getAll(), visitId).then((users) => {
        socket.emit('setUserList', {visitId: visitId, users: users});
    });
};

SocketListener.prototype.logoutUserFromVisit = function (userId, visitId, socket, io) {
    VisitModel.hasUser(userId, visitId).then((resp) => {
        if (resp) {
            VisitModel.getUserCount(visitId).then((userCount) => {
                if (userCount > 1) {
                    Client.leaveVisit(userId, visitId, socket).then((response) => {
                        Trigger.sendMessage(response.message, socket, io);
                        Trigger.leaveVisit(response.clientId, response.userId, visitId, socket, io);
                    });
                } else {
                    Trigger.showInformation('Görüşmeye başka bir kullanıcı eklemeden görüşmeden ayrılamazsınız.', socket);
                }
            })
        } else {
            Trigger.showInformation('Görüşmeye başka bir kullanıcı eklemeden görüşmeden ayrılamazsınız.', socket);
        }
    });
};

SocketListener.prototype.banUser = function (userId, clientId, date, socket, io) {
    let client = Client.get(clientId);
    if (client) {
        let ipAddress = client.data.ipAddress;
        BannedUserModel.addBannedUser(userId, clientId, ipAddress, date).then((resp) => {
            if (resp) {
                VisitModel.getVisitIdFromClientId(clientId).then((visitId) => {
                    MessageModel.addWelcomeMessage('clientBanned', visitId).then((message) => {
                        VisitModel.destroyVisit(visitId, '3').then((destroy) => {
                            Client.clients[clientId].data.banned = true;
                            Client.destroyChat(clientId);
                            Trigger.destroyChat(clientId, visitId, message, io);
                            Trigger.clientDisconnect(clientId, io);
                            ClientSocketController.reconnectClient(clientId, socket, io);
                            Visit.autoTakeClients(Server.getAll(), io);
                            Trigger.clientDisconnectChat(visitId, io);
                        });
                    });
                });
            }
        });
    }
};

module.exports = new SocketListener();
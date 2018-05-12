let Trigger = require('./Trigger');
let ServerTrigger = require('../Server/Trigger');
let Client = require('../../Modules/Controllers/ClientController');
let Visit = require('../../Modules/Controllers/VisitController');
let cli = require('../../Modules/Model/Client');
let MessageModel = require('../../Modules/Model/Message');
let VisitModel = require('../../Modules/Model/Visit');
let Server = require('../../Modules/Controllers/ServerController');
let SubjectModel = require('../../Modules/Model/Subject');

SocketListener = function () {
};

SocketListener.prototype.connection = function (id, socket, io, reconnect = false) {
    Client.add(id, socket).then((client) => {
        Client.initClientRooms(client, socket).then((res) => {
            if (!reconnect) {
                Trigger.initClient(client, io);
            } else {
                io.sockets.emit('newClient', client);
            }
        });
    });
};

SocketListener.prototype.clientLogin = function (id, data, socket, io) {
    VisitModel.hasCurrentVisit(id).then((hasCurrentVisit) => {
        if(!hasCurrentVisit) {
            let cl = Client.get(id);
            if (cl) {
                data = Object.assign(data, cl.data);
                console.log('a client login - ip : ' + data.ipAddress + ' - browser : ' + data.device.browser + ' - os : ' + data.device.os + ' - count : ' + cl.count + ' - subject : ' + data.SubjectId);
                if (data.SubjectId) {
                    SubjectModel.getNameFromId(data.SubjectId).then((subjectName) => {
                        if (subjectName) {
                            data.SubjectName = subjectName;
                            this.setClientLoginProperties(id, cl, data, socket, io);
                        }
                    });
                } else {
                    this.setClientLoginProperties(id, cl, data, socket, io);
                }
            } else {
                Trigger.throwClientError(id, 'Bağlantı hatası.', io);
            }
        }
    });
};

SocketListener.prototype.setClientLoginProperties = function (id, cl, data, socket, io) {
    cli.login(id, data).then((visitId) => {
        if (visitId) {
            // join visit room for other tabs
            Trigger.joinVisitRoom(id, io);

            Visit.joinVisitRoom(visitId, socket);
            Client.setLoginData(id, data);
            Client.setStatus(id, 1);
            MessageModel.addWelcomeMessage('waitingText', visitId).then((waitingText) => {
                Trigger.showWaitPage(Client.get(id), io);
            });
            if (data.SubjectId) {
                Visit.autoTakeClient(Server.getAll(), id, io, Client.clients[id].data.SubjectId);
            } else {
                Visit.autoTakeClient(Server.getAll(), id, io);
            }
        } else {
            Trigger.throwClientError(id, 'Bağlantı hatası', io);
        }
    });
};

SocketListener.prototype.disconnect = function (clientId, socket, io) {
    let client = Client.get(clientId);
    if (client) {
        if (client.count === 1) {
            Client.addDisconnectClient(clientId);
            setTimeout(() => {
                if (Client.hasDisconnectClient(clientId)) {
                    Client.remove(clientId, io).then((visitId) => {
                        if (typeof visitId === 'number') {
                            MessageModel.addWelcomeMessage('chatEnded', visitId).then((message) => {
                                ServerTrigger.destroyChat(clientId, visitId, message, io);
                                ServerTrigger.clientDisconnect(clientId, io);
                                if (typeof visitId === 'number') {
                                    ServerTrigger.clientDisconnectChat(visitId, io);
                                }
                            });
                        } else {
                            ServerTrigger.clientDisconnect(clientId, io);
                        }
                    });
                }
                Client.removeDisconnectClient(clientId);
            }, Client.reconnectTime);
        } else {
            Client.remove(clientId, io);
        }
    }
};

SocketListener.prototype.sendMessage = function (data, io) {
    if (Client.hasUser(data.clientId)) {
        let client = Client.get(data.clientId);
        MessageModel.sendClientMessage(client.visitId, data.text).then((add) => {
            if (add) {
                data.sender = 1;
                Visit.getVisitRoom(client.visitId, io).emit('getMessage', add);
            }
        });
    }
};

SocketListener.prototype.destroyChat = function (clientId, socket, io) {
    let client = Client.get(clientId);
    if (client) {
        let visitId = client.visitId;
        if (visitId) {
            MessageModel.addWelcomeMessage('chatEnded', visitId).then((message) => {
                VisitModel.destroyVisit(visitId, '2').then((destroy) => {
                    Client.destroyChat(clientId);
                    ServerTrigger.destroyChat(clientId, visitId, message, io);
                    ServerTrigger.clientDisconnect(clientId, io);
                    this.reconnectClient(clientId, socket, io);
                    Visit.autoTakeClients(Server.getAll(), io);
                    ServerTrigger.clientDisconnectChat(visitId, io);
                });
            });
        }
    }
};

SocketListener.prototype.reconnectClient = function (clientId, socket, io) {
    delete Client.clients[clientId];
    this.connection(clientId, socket, io, true);
    let client = Client.get(clientId);
};

SocketListener.prototype.rateChat = async function (clientId, value, socket, io) {
    return new Promise((resolve) => {
        VisitModel.getLastVisitIdFromClientId(clientId).then((visitId) => {
            if (visitId) {
                VisitModel.rateChat(visitId, value).then((rated) => {
                    Trigger.rateChat(socket);
                });
            }
        });
    });
};

SocketListener.prototype.joinVisitRoom = function (clientId, socket) {
    let client = Client.get(clientId);
    if(client) {
        if(client.visitId) {
            Visit.joinVisitRoom(client.visitId, socket);
        } else {
            VisitModel.getVisitIdFromClientId(clientId).then((visitId) => {
                Visit.joinVisitRoom(visitId, socket);
            })
        }
    }
};

module.exports = new SocketListener();
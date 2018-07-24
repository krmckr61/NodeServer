let ClientModel = require('../Model/Client');
let MessageModel = require('../Model/Message');
let UserModel = require('../Model/User');
let ClientInfo = require('../../Helpers/ClientInfo');
let Visit = require('./VisitController');
let VisitModel = require('../Model/Visit');

let ClientController = {
    clients: {},
    disconnects: {},
    clientStatus: ['disconnect', 'wait', 'talk'],
    clientRoomNamePrefix: 'client-',
    reconnectTime: 4000
};


ClientController.add = async function (clientId, siteId, socket) {
    return new Promise((resolve) => {
        if (this.has(clientId)) {
            //the client has already connected
            resolve(this.editClient(this.clients[clientId]));
        } else {
            //new client connected
            resolve(this.createClient(clientId, siteId, socket));
        }
    });
};

ClientController.editClient = async function (client) {
    return new Promise((resolve) => {
        if (this.hasDisconnectClient(client.id)) {
            //the client has disconnected in two seconds
            console.log('a client reloaded : ' + client.id + ' - siteId : ' + client.siteId);
            this.removeDisconnectClient(client.id);
            if (client.visitId) {
                client.reconnect = true;
            }
            resolve(client);
        } else {
            //the client connected from another tab
            client.count++;
            console.log('a client connected from another tab : ' + client.id + ' - siteId : ' + client.siteId + ' - count : ' + client.count);
            resolve(client);
        }
    });
};

ClientController.createClient = async function (clientId, siteId, socket) {
    return new Promise((resolve) => {
        console.log('a client connected : ' + clientId + ' - siteId : ' + siteId);
        //create client with pre infos
        this.addClientWithPreInfo(clientId, siteId, socket);
        //set client infos
        resolve(this.setClientEntranceDatas(this.clients[clientId]));
    });
};

ClientController.addClientWithPreInfo = function (id, siteId, socket, count = 1) {
    this.clients[id] = {id: id, siteId: siteId, count: count, data: ClientInfo.getPreInfo(socket), writer: {}};
};

ClientController.setClientEntranceDatas = async function (client) {
    return new Promise((resolve) => {
        ClientInfo.getClientProperties(client.id, client.siteId, client.data['ipAddress']).then((properties) => {
            client.data.location = properties.location;
            client.data.banned = properties.banned;
            client = Object.assign(client, properties.status);
            resolve(client);
        });
    });
};

ClientController.initClientRooms = async function (client, socket) {
    return new Promise((resolve) => {
        socket.join(this.clientRoomNamePrefix + client.id);
        if (client.status !== 0) {
            ClientModel.getVisitId(client.id).then((visitId) => {
                Visit.joinVisitRoom(visitId, socket);
                resolve(true);
            });
        } else {
            resolve(true);
        }
    });
};

ClientController.getClientRoom = function (clientId, io) {
    return io.to(this.clientRoomNamePrefix + clientId);
};

ClientController.takeClient = async function (clientId, userId, socket, io) {
    return new Promise((resolve) => {
        ClientModel.hasOperator(clientId).then((hasOperator) => {
            if (!hasOperator) {
                ClientModel.getVisitId(clientId).then((visitId) => {
                    if (visitId) {
                        if (this.get(clientId)) {
                            this.clients[clientId].visitId = visitId;
                            ClientModel.addOperator(visitId, userId).then((add) => {
                                if (add) {
                                    Visit.joinVisitRoom(visitId, socket);
                                    this.setStatus(clientId, 2);
                                    MessageModel.addWelcomeMessage('clientTaken', visitId).then((welcomeMessage) => {
                                        UserModel.get(userId).then((user) => {
                                            this.clients[clientId].users = [user];
                                            resolve(visitId);
                                        });
                                    });
                                } else {
                                    resolve(false);
                                }
                            });
                        }
                    } else {
                        resolve(false);
                    }
                });
            } else {
                resolve(false);
            }
        });
    });
};

ClientController.takeNewClient = async function (visitId, userId, socket, io) {
    return new Promise((resolve) => {
        ClientModel.addOperator(visitId, userId).then((add) => {
            if (add) {
                MessageModel.addWelcomeMessage('addUser', visitId).then((welcomeMessage) => {
                    ClientModel.getClientIdFromVisitId(visitId).then((clientId) => {
                        UserModel.get(userId).then((user) => {
                            this.clients[clientId].users.push(user);
                            resolve({clientId: clientId, user: user, message: welcomeMessage});
                        });
                    });
                });
            } else {
                resolve(false);
            }
        });
    });
};

ClientController.leaveVisit = async function (userId, visitId, socket) {
    return new Promise((resolve) => {
        ClientModel.removeOperator(visitId, userId).then((remove) => {
            if (remove) {
                Visit.leaveVisitRoom(visitId, socket);
                MessageModel.addWelcomeMessage('removeUser', visitId).then((welcomeMessage) => {
                    ClientModel.getClientIdFromVisitId(visitId).then((clientId) => {
                        this.removeUserFromClient(clientId, userId);
                        resolve({clientId: clientId, userId: userId, message: welcomeMessage});
                    });
                });
            }
        });
    });
};

ClientController.removeUserFromClient = function (clientId, userId) {
    for (let i = 0; i < this.clients[clientId].users.length; i++) {
        if (this.clients[clientId].users[i]['id'] == userId) {
            delete this.clients[clientId].users[i];
            this.clients[clientId].users.splice(i, 1);
            return true;
        }
    }
    return false;
};

ClientController.get = function (id) {
    if (this.has(id)) {
        return this.clients[id];
    } else {
        return false;
    }
};

ClientController.getMinimize = function (id) {
    if (this.has(id)) {
        let client = this.get(id);
        return {id: client.id, count: client.count, status: client.status, data: client.data, visitId: client.visitId};
    } else {
        return false;
    }
};

ClientController.remove = async function (clientId, io) {
    return new Promise((resolve) => {
        if (this.has(clientId)) {
            if (this.clients[clientId]['count'] === 1) {
                ClientModel.getStatus(clientId).then((status) => {
                    delete this.clients[clientId];
                    if (status.status !== 0) {
                        ClientModel.getVisitId(clientId).then((visitId) => {
                            ClientModel.logout(visitId).then((response) => {
                                resolve(visitId);
                            });
                        });
                    } else {
                        resolve(true);
                    }
                });
                console.log('a client disconnected');
            } else {
                console.log('a client disconnected from another tab');
                this.clients[clientId]['count'] -= 1;
                resolve(false);
            }
        } else {
            resolve(false);
        }
    });
};

ClientController.addDisconnectClient = function (clientId) {
    this.disconnects[clientId] = true;
};

ClientController.hasDisconnectClient = function (clientId) {
    if (this.disconnects[clientId]) {
        return true;
    } else {
        return false;
    }
};

ClientController.removeDisconnectClient = function (clientId) {
    if (this.hasDisconnectClient(clientId)) {
        delete this.disconnects[clientId];
    }
};

ClientController.getAll = function () {
    return this.clients;
};

ClientController.has = function (id) {
    if (this.clients[id]) {
        return true;
    } else {
        return false;
    }
};

ClientController.hasVisit = function (id) {
    if (this.clients[id] && this.clients[id]['visitId']) {
        return true;
    } else {
        return false;
    }
};

ClientController.hasUser = function (id) {
    if (this.clients[id] && this.clients[id]['visitId'] && this.clients[id].users) {
        return true;
    } else {
        return false;
    }
};

ClientController.getStatus = function (id) {
    return this.clients[id]['status'];
};

ClientController.setStatus = function (id, status) {
    if (this.has(id)) {
        this.clients[id]['status'] = status
    } else {
        return false;
    }
};

ClientController.setConnectionTime = function (id) {
    this.clients[id]['data'].connectionTime = ClientInfo.getDateInfo();
};

ClientController.setLoginData = function (id, data) {
    this.clients[id]['data'].UserName = (data.UserName ? data.UserName : 'N/A');
    this.clients[id]['data'].Email = data.Email;
    this.clients[id]['data'].NameSurname = (data.NameSurname ? data.NameSurname : 'N/A');
    this.clients[id]['data'].SubjectId = (data.SubjectId ? data.SubjectId : '');
    if (data.FacebookId) {
        this.clients[id]['data'].FacebookId = data.FacebookId;
    }
};

ClientController.destroyChat = function (clientId) {
    if (this.has(clientId)) {
        this.clients[clientId].disconnect = true;
        this.clients[clientId].status = 0;
        this.clients[clientId].users = [];
    }
};

ClientController.getSiteId = function (clientId) {
    if(this.has(clientId)) {
        return this.clients[clientId].siteId;
    } else {
        return false;
    }
};

ClientController.addOld = async function (id, siteId, socket, count = 1) {
    return new Promise((resolve) => {
        if (this.has(id)) {
            if (this.hasDisconnectClient(id) && this.clients[id].count === 1) {
                console.log('a client reloaded : - ip : ' + this.clients[id].data.ipAddress + ' - browser : ' + this.clients[id].data.device.browser + ' - os : ' + this.clients[id].data.device.os + ' - site : ' + siteId + ' - count : ' + this.clients[id].count);
                this.removeDisconnectClient(id);
                if (this.clients[id].visitId) {
                    this.clients[id].reconnect = true;
                }
                ClientModel.hasBanned(id, this.get(id).data.ipAddress).then((isBanned) => {
                    if (isBanned) {
                        this.clients[id].data.banned = true;
                    } else {
                        this.clients[id].data.banned = false;
                    }
                    resolve(this.get(id));
                });
            } else {
                this.clients[id]['count'] += 1;
                ClientModel.hasBanned(id, this.get(id).data.ipAddress).then((isBanned) => {
                    if (isBanned) {
                        this.clients[id].data.banned = true;
                    } else {
                        this.clients[id].data.banned = false;
                    }
                    console.log('a client connected from another tab : ' + this.clients[id].data.ipAddress + ' - browser : ' + this.clients[id].data.device.browser + ' - os : ' + this.clients[id].data.device.os + ' - site : ' + siteId + ' - count : ' + this.clients[id].count);
                    resolve(this.get(id));
                });
            }
        } else {
            ClientModel.getStatus(id).then((status) => {
                ClientInfo.getInfo(socket).then((data) => {
                    ClientModel.hasBanned(id, data.ipAddress).then((isBanned) => {
                        if (isBanned) {
                            data.banned = true;
                        } else {
                            data.banned = false;
                        }
                        console.log('a client connected - ip : ' + data.ipAddress + ' - browser : ' + data.device.browser + ' - os : ' + data.device.os + ' - site : ' + siteId + " - status : " + status + " - count : " + 1);
                        VisitModel.getVisitIdFromClientId(id).then((visitId) => {
                            if (visitId) {
                                VisitModel.getDataFromId(visitId).then((visitData) => {
                                    if (visitData) {
                                        data = Object.assign(data, visitData);
                                    }
                                    VisitModel.getUsersFromVisit(visitId).then((users) => {
                                        if (users.length > 0) {
                                            this.clients[id] = {
                                                id: id,
                                                status: status,
                                                count: count,
                                                data: data,
                                                visitId: visitId,
                                                users: users,
                                                siteId: siteId
                                            };
                                            resolve(this.get(id));
                                        } else {
                                            this.clients[id] = {
                                                id: id,
                                                status: status,
                                                count: count,
                                                data: data,
                                                visitId: visitId,
                                                users: [],
                                                siteId: siteId
                                            };
                                        }
                                    });
                                });
                            } else {
                                this.clients[id] = {
                                    id: id,
                                    status: status,
                                    count: count,
                                    data: data,
                                    users: [],
                                    siteId: siteId
                                };
                                resolve(this.get(id));
                            }
                        });
                    });
                });
            });
        }
    });
};

ClientController.addWriter = async function (visitId, userId) {
    return new Promise((resolve) => {
        ClientModel.getClientIdFromVisitId(visitId).then((clientId) => {
            if (this.has(clientId) && typeof this.clients[clientId].writer[userId] === 'undefined') {
                console.log(111);
                UserModel.getName(userId).then((name) => {
                    this.clients[clientId].writer[userId] = name;
                    resolve(this.clients[clientId].writer);
                });
            } else {
                resolve(false);
            }
        });
    });
};

ClientController.removeWriter = async function (visitId, userId) {
    return new Promise((resolve) => {
        ClientModel.getClientIdFromVisitId(visitId).then((clientId) => {
            if (this.has(clientId) && typeof this.clients[clientId].writer[userId] !== 'undefined') {
                delete this.clients[clientId].writer[userId];
                resolve(this.clients[clientId].writer);
            } else {
                resolve(false);
            }
        });
    });
};

module.exports = ClientController;
let VisitModel = require('../Model/Visit');
let UserModel = require('../Model/User');
let UserOnlineTimeModel = require('../Model/UserOnlineTime');
let Visit = require('./VisitController');
let Helper = require('../../Helpers/Helper');

let ServerController = {
    users: {},
    userRoomNamePrefix: 'user-',
    roleRoomNamePrefix: 'role-',
    disconnects: {},
    reconnectTime: 2000
};

ServerController.add = async function (id, siteId, socket, io) {
    return new Promise((resolve) => {
        if (this.has(id)) {
            let hasDisconnectUser = false;
            if (this.hasDisconnectUser(id)) {
                console.log('a user reloaded : ' + id + ' - siteId : ' + siteId);
                hasDisconnectUser = true;
                this.removeDisconnectUser(id);
            } else {
                console.log('a user connected from another tab : ' + id + ' - site id : ' + siteId + ' - count : ' + this.users[id].count);
                this.users[id].count++;
            }
            this.getUserRoom(id, io).emit('disconnectCurrentUsers');
            if(!hasDisconnectUser) {
                setTimeout(() => {
                    this.initUserRooms(id, siteId, socket);
                    resolve(true);
                }, this.reconnectTime);
            } else {
                this.initUserRooms(id, siteId, socket);
                resolve(true);
            }
        } else {
            console.log('a user connected : ' + id + ' - siteId : ' + siteId);
            this.initUserRooms(id, siteId, socket);
            UserModel.addLoginOnlineStatus(id).then((res) => {
                this.users[id] = {id: id, count: 1, connectionDate: Helper.getCurrentTimeStamp(), siteId: siteId};
                resolve(true);
            });
        }
    });
};

ServerController.initUserRooms = function (userId, siteId, socket) {
    //init user room
    socket.join('user' + siteId);
    socket.join(this.userRoomNamePrefix + userId);

    this.joinUserVisitRooms(userId, socket).then((res) => {
        this.joinUserRoleRooms(userId, socket).then((res) => {
        });
    });
};

ServerController.joinUserVisitRooms = async function (userId, socket) {
    return new Promise((resolve) => {
        VisitModel.getActiveTakenVisitsFromUserId(userId).then((visits) => {
            //init visit rooms for user
            if (visits && visits.length > 0) {
                for (let i = 0; i < visits.length; i++) {
                    Visit.joinVisitRoom(visits[i].id, socket);
                }
            }
            resolve(true);
        });
    });
};

ServerController.joinUserRoleRooms = async function (userId, socket) {
    return new Promise((resolve) => {
        UserModel.getRoles(userId).then((roles) => {
            //init role rooms for user
            if (roles && roles.length > 0) {
                for (let i = 0; i < roles.length; i++) {
                    socket.join(this.roleRoomNamePrefix + roles[i].role_id);
                }
            }
            resolve(true);
        });
    });
};

ServerController.leaveRoomsOfUser = function (userId, socket) {
    socket.leaveAll();
};

ServerController.getUserRoom = function (userId, io) {
    return io.to(this.userRoomNamePrefix + userId);
};

ServerController.getRoleRoom = function (roleId, io) {
    return io.to(this.roleRoomNamePrefix + roleId);
};

ServerController.getSiteRoom = function(siteId, io) {
    return io.to('user' + siteId);
};

ServerController.has = function (id) {
    if (this.users[id]) {
        return true;
    } else {
        return false;
    }
};

ServerController.remove = function (id) {
    if (this.has(id)) {
        if (this.users[id].count === 1) {
            UserModel.hasRole(id, 'canli-destek').then((hasRole) => {
                UserModel.closeLastOnlineStatus(id);
                if (hasRole) {
                    UserOnlineTimeModel.add(id, this.users[id].connectionDate).then((response) => {
                        delete this.users[id];
                    });
                } else {
                    delete this.users[id];
                }
            });
        } else {
            this.users[id].count = this.users[id].count - 1;
        }
        return true;
    } else {
        return false;
    }
};

ServerController.getAll = function () {
    return this.users;
};

ServerController.get = function (id) {
    if (this.has(id)) {
        return this.users[id];
    } else {
        return false;
    }
};


ServerController.addDisconnectUser = function (userId) {
    this.disconnects[userId] = true;
};

ServerController.hasDisconnectUser = function (userId) {
    if (this.disconnects[userId]) {
        return true;
    } else {
        return false;
    }
};

ServerController.removeDisconnectUser = function (userId) {
    if (this.hasDisconnectUser(userId)) {
        delete this.disconnects[userId];
    }
};

ServerController.takeClient = function (userId, visitId) {
    if (this.has(userId)) {
        this.users[userId].visits.push(visitId);
    }
};

ServerController.getSiteId = function (userId) {
    if(this.has(userId)) {
        return this.get(userId).siteId;
    } else {
        return false;
    }
};

module.exports = ServerController;
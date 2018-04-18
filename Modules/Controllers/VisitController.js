let UserModel = require('../Model/User');
let ConfigModel = require('../Model/Config');
let VisitModel = require('../Model/Visit');
let MessageModel = require('../Model/Message');

const VisitController = {
    visitRoomNamePrefix: 'visit-',
    autoTakeConfig: 'autoTake',
    taskedVisits: []
};

VisitController.joinVisitRoom = function (visitId, socket) {
    //join visit room
    socket.join(this.visitRoomNamePrefix + visitId);
};

VisitController.leaveVisitRoom = function (visitId, socket) {
    //join visit room
    socket.leave(this.visitRoomNamePrefix + visitId);
};

VisitController.getVisitRoom = function (visitId, io) {
    return io.to(this.visitRoomNamePrefix + visitId);
};

VisitController.autoTakeClients = async function (users, io) {
    ConfigModel.getValue(this.autoTakeConfig).then((autoTake) => {
        if (autoTake) {
            VisitModel.getWaitingVisits().then((visits) => {
                if (visits) {
                    for (let i = 0; i < visits.length; i++) {
                        this.autoTakeClient(users, visits[i].visitorid, io);
                    }
                }
            });
        }
    });
};



VisitController.autoTakeClient = async function (users, clientId, io, subjectId = false) {
    return new Promise((resolve) => {
        ConfigModel.getValue(this.autoTakeConfig).then((autoTake) => {
            if (autoTake == 1) {
                if (Object.keys(users).length > 0) {
                    if(subjectId) {
                        this.autoTakeClientWithSubject(clientId, users, subjectId, io);
                    } else {
                        this.autoTakeClientWithoutSubject(clientId, users, io);
                    }
                }
            }
        });
    });
};

VisitController.autoTakeClientWithoutSubject = function(clientId, users, io) {
    UserModel.getAvaibleUserId(users).then((userId) => {
        if (userId) {
            io.to('user-' + userId).emit('autoTakeClient', clientId);
        }
    });
};

VisitController.autoTakeClientWithSubject = async function (clientId, users, subjectId, io) {
    UserModel.getAvaibleUserIdFromSubjectId(users, subjectId).then((userId) => {
        if(userId) {
            io.to('user-' + userId).emit('autoTakeClient', clientId);
        } else {
            this.autoTakeClientWithoutSubject(clientId, users, io);
        }
    });
};

module.exports = VisitController;
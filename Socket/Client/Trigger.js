let Client = require('../../Modules/Controllers/ClientController');
let ClientModel = require('../../Modules/Model/Client');
let Message = require('../../Modules/Model/Message');
let Visit = require('../../Modules/Controllers/VisitController');
let ConfigModel = require('../../Modules/Model/Config');
let SubjectModel = require('../../Modules/Model/Subject');

let Trigger = function () {
};

Trigger.prototype.initClient = function (client, io) {

    this.loadSubjects(client.id, io);

    if (client['status'] === 0) {
        this.showDisconnectPage(client.id, io);
    } else if (client['status'] === 1) {
        this.showWaitPage(client, io);
    } else if (client['status'] === 2) {
        this.showTalkPage(client, io);
    }

    if (!client.reconnect) {
        io.sockets.emit('newClient', client);
    }
};

Trigger.prototype.loadSubjects = function (id, io) {
    ConfigModel.getValue('subject').then((hasSubject) => {
        if(hasSubject === '1') {
            SubjectModel.getAll().then((subjects) => {
                Client.getClientRoom(id, io).emit('loadSubjects', subjects);
            });
        }
    });
};

Trigger.prototype.loadMessages = function (clientId, io) {
    ClientModel.getVisitId(clientId).then((visitId) => {
        Message.getMessages(visitId).then((messages) => {
            if (messages.length > 0) {
                Client.getClientRoom(clientId, io).emit('loadMessages', messages);
            }
        });
    });
};

Trigger.prototype.showDisconnectPage = function (id, io) {
    let client = Client.get(id);

    if(client.data.banned) {
        Client.getClientRoom(id, io).emit('clientDisconnectPage', false);
    } else {
        Client.getClientRoom(id, io).emit('clientDisconnectPage', true);
    }
};

Trigger.prototype.showWaitPage = function (client, io) {
    Client.getClientRoom(client.id, io).emit('clientWaitPage');
    this.loadMessages(client.id, io);

    if (!client.reconnect) {
        io.to('user' + client.siteId).emit('clientConnect', client);
    }
};

Trigger.prototype.showTalkPage = function (client, io) {
    Client.getClientRoom(client.id, io).emit('clientTalkPage', {client: client});
    this.loadMessages(client.id, io);
};

Trigger.prototype.newUser = function (clientId, users, io) {
    Client.getClientRoom(clientId, io).emit('newUser', {users:users});
};

Trigger.prototype.throwClientError = function (id, message, io) {
    io.to(id).emit('clientError', message);
};

Trigger.prototype.rateChat = function (socket) {
    socket.emit('chatRated');
};

Trigger.prototype.joinVisitRoom = function (id, io) {
    Client.getClientRoom(id, io).emit('joinVisitRoom');
};

module.exports = new Trigger();
let db = require('../../Core/Database');
let cli = require('./Client');

let Message = function () {

};

Message.prototype.sendUserMessage = async function (userId, visitId, message, isPrivate = 0) {
    return new Promise((resolve) => {
        db.query({
            text: "INSERT INTO message(sender, userid, visitid, text, private) VALUES($1, $2, $3, $4, $5) RETURNING sender, (SELECT name FROM users WHERE id = userid) as username, userid, text, seen, visitid AS visitId, private, created_at",
            values: ['2', userId, visitId, message, isPrivate]
        }, (err, response) => {
            if (!err) {
                resolve(response.rows[0]);
            } else {
                resolve(false);
            }
        });
    });
};

Message.prototype.sendClientMessage = async function (visitId, message) {
    return new Promise((resolve) => {
        db.query({
            text: "INSERT INTO message(sender, visitid, text) VALUES($1, $2, $3) RETURNING sender, text, seen, visitid AS visitId, private, created_at",
            values: ['1', visitId, message]
        }, (err, response) => {
            if (!err) {
                resolve(response.rows[0]);
            } else {
                resolve(false);
            }
        });
    });
};

Message.prototype.sendSystemMessage = async function (visitId, message) {
    return new Promise((resolve) => {
        db.query({
            text: "INSERT INTO message(sender, visitid, text) VALUES($1, $2, $3) RETURNING sender, text, seen, visitid AS visitId, created_at",
            values: ['0', visitId, message]
        }, (err, response) => {
            if (!err) {
                resolve(response.rows[0]);
            } else {
                resolve(false);
            }
        });
    });
};

Message.prototype.getMessages = async function (visitId) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT message.*, users.name as username FROM message LEFT JOIN users ON message.userid=users.id WHERE message.visitid=$1 ORDER BY message.id",
            values: [visitId]
        }, (err, response) => {
            if (!err) {
                resolve(response.rows);
            } else {
                resolve(false);
            }
        });
    });
};

Message.prototype.disableChatFromClientId = function (clientId, visitId, io) {
    return new Promise((resolve) => {
        cli.getOperatorIds(visitId).then((operators) => {
            if (operators) {
                for (let i = 0; i < operators.length; i++) {
                    io.to(operators[i].userid).emit('clientDisconnectChat', visitId);
                }
            }
            resolve(true);
        });
    });
};

Message.prototype.destroyChat = async function (visitId) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT id FROM visit WHERE id=$1 AND active='1' ORDER BY id DESC LIMIT 1",
            values: [visitId]
        }, (er, res) => {
            if (!er && res.rows.length > 0) {
                db.query({
                    text: "UPDATE visit SET active='3', closed_at=NOW() WHERE id=$1",
                    values: [visitId]
                }, (err, response) => {
                    if (!err) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                });
            } else {
                resolve(true);
            }
        });
    });
};

Message.prototype.getUnreadMessagesCount = async function (visitId) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT COUNT(message.id) FROM message where visitid=$1 AND seen='0' AND sender='1'",
            values: [visitId]
        }, (err, response) => {
            if (!err) {
                resolve(response.rows[0]['count']);
            } else {
                resolve(false);
            }
        });
    });
};

Message.prototype.readMessages = async function (visitId, sender) {
    return new Promise((resolve) => {
        db.query({
            text: "UPDATE message SET seen='1' WHERE visitid=$1 AND (sender=$2 OR sender='0')",
            values: [visitId, sender]
        }, (err, response) => {
            if (!err) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
};

Message.prototype.getHistoryMessages = async function (visitId) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT * FROM message WHERE visitid=$1 ORDER BY created_at ASC",
            values: [visitId]
        }, (err, response) => {
            if (!err) {
                resolve(response.rows);
            } else {
                resolve(false);
            }
        });
    });
};

Message.prototype.getWelcomeMessage = async function (type) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT content FROM welcomemessage WHERE type=$1",
            values: [type]
        }, (err, response) => {
            if (!err) {
                resolve(response.rows[0]);
            } else {
                resolve(false);
            }
        });
    });
};

Message.prototype.addWelcomeMessage = async function (type, visitId) {
    return new Promise((resolve) => {
        this.getWelcomeMessage(type).then((message) => {
            db.query({
                text: "INSERT INTO message(sender, visitid, text) VALUES('0', $1, $2) RETURNING *",
                values: [visitId, message.content]
            }, (err, response) => {
                if (!err) {
                    resolve(response.rows[0]);
                } else {
                    resolve(false);
                }
            });
        });
    });
};

Message.prototype.getActiveTakenVisitsFromUserId = async function (userId) {

};

module.exports = new Message();
let db = require('../../Core/Database');
let msg = require('./Message');
let Helper = require('../../Helpers/Helper');

let Client = function () {

};

Client.prototype.getStatus = async function (id) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT id FROM visit where visitorid=$1 AND active='1' AND status='1' ORDER BY id DESC LIMIT 1",
            values: [id]
        }, (err, response) => {
            if (!err) {
                if (response.rows.length > 0) {
                    this.hasOperator(response.rows[0][id]).then((res) => {
                        if (res) {
                            resolve(2);
                        } else {
                            resolve(1);
                        }
                    });
                } else {
                    resolve(0);
                }
            } else {
                resolve(0);
            }
        });
    });
};

Client.prototype.hasOperator = async function (visitorId) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT id FROM visituser WHERE visitorid=$1 AND userid IS NOT NULL ORDER BY id DESC LIMIT 1",
            values: [visitorId]
        }, (err, response) => {
            if (!err) {
                if (response.rows.length > 0) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            } else {
                resolve(false);
            }
        });
    });
};

Client.prototype.getOperatorIds = async function (visitId) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT userid FROM visituser WHERE visitId=$1",
            values: [visitId]
        }, (err, response) => {
            if (!err) {
                if (response.rows.length > 0) {
                    resolve(response.rows);
                } else {
                    resolve(false);
                }
            } else {
                resolve(false);
            }
        });
    });
};

Client.prototype.login = async function (id, data) {
    return new Promise(function (resolve) {
        db.query("INSERT INTO visit(visitorid, data) VALUES($1, $2) RETURNING id", [id, data], (err, response) => {
            if (!err) {
                resolve(response.rows[0].id);
            } else {
                resolve(false);
            }
        });
    });
};

Client.prototype.logout = async function (id) {
    return new Promise((resolve) => {
            db.query({
                text: "SELECT id FROM visit WHERE id=$1 AND active='1' ORDER BY id DESC limit 1",
                values: [id]
            }, (er, res) => {
                if (!er && res.rows.length > 0) {
                    db.query({
                        text: "UPDATE visit SET active='2', closed_at=NOW() WHERE id=$1",
                        values: [id]
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
        }
    );
};

Client.prototype.getHistory = async function (dates) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT visit.id, visit.visitorid, visit.data, visit.active, visit.status, visit.created_at::varchar, visit.closed_at::varchar,(SELECT STRING_AGG(DISTINCT(users.name), ', ') AS username FROM users INNER JOIN visituser ON users.id=visituser.userid WHERE visituser.visitid=visit.id GROUP BY visit.id), extract (epoch from (visit.closed_at - visit.created_at)) as chattime FROM visit" +
            "   WHERE" +
            "       visit.status='1' AND " +
            "       (visit.active='2' OR visit.active='3') AND " +
            "       (" +
            "           (visit.created_at >= $1 AND visit.created_at <= $2) OR" +
            "           (visit.closed_at >= $1 AND visit.closed_at <= $2)" +
            "       ) AND" +
            "       visit.closed_at IS NOT NULL GROUP BY visit.id ORDER BY visit.created_at DESC, visit.closed_at DESC",
            values: [dates.startDate, dates.endDate]
        }, (err, response) => {
            if (!err) {
                resolve(response.rows);
            } else {
                resolve(false);
            }
        });
    });
};

Client.prototype.getVisitId = async function (id) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT id FROM visit WHERE visitorid=$1 AND status='1' AND active='1' ORDER BY id DESC limit 1",
            values: [id]
        }, (err, response) => {
            if (!err) {
                if (response.rows.length > 0) {
                    resolve(response.rows[0].id);
                } else {
                    resolve(false);
                }
            } else {
                console.log(err);
                resolve(false);
            }
        });
    });
};

Client.prototype.addOperator = async function (visitId, userId) {
    return new Promise((resolve) => {
        db.query({
            text: "INSERT INTO visituser(visitid, userid) VALUES($1, $2)",
            values: [visitId, userId]
        }, (err) => {
            if (!err) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
};

Client.prototype.removeOperator = async function (visitId, userId) {
    return new Promise((resolve) => {
        db.query({
            text: "UPDATE visituser SET active='2', updated_at=$3 WHERE visitid=$1 AND userid=$2",
            values: [visitId, userId, Helper.getCurrentTimeStamp()]
        }, (err) => {
            if (!err) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
};

Client.prototype.getTalkingClients = async function (id) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT visit.* FROM visit INNER JOIN visituser ON visit.id=visituser.visitid WHERE visituser.userid=$1 AND visit.status='1' AND visituser.active='1' AND visit.active='1' ORDER BY visit.created_at",
            values: [id]
        }, (err, response) => {
            if (!err) {
                resolve(response.rows);
            } else {
                resolve(false);
            }
        });
    });
};

Client.prototype.getVisit = async function (id) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT visit.* FROM visit WHERE visit.id=$1 AND visit.status='1' AND visit.active='1' ORDER BY visit.id DESC limit 1",
            values: [id]
        }, (err, response) => {
            if (!err) {
                if (response.rows.length > 0) {
                    resolve(response.rows[0]);
                } else {
                    resolve(false);
                }
            } else {
                resolve(false);
            }
        });
    });
};

Client.prototype.getClientIdFromVisitId = async function (visitId) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT visitorid FROM visit WHERE id=$1",
            values: [visitId]
        }, (err, response) => {
            if (!err) {
                resolve(response.rows[0].visitorid);
            } else {
                resolve(false);
            }
        });
    });
};

Client.prototype.getHistoryVisit = async function (id) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT " +
            "visit.*, " +
            " extract (epoch from (visit.closed_at - visit.created_at)) as chattime," +
            " (SELECT STRING_AGG(users.name, ', ') FROM visituser INNER JOIN users ON visituser.userid=users.id WHERE visituser.visitid=visit.id) AS username, " +
            " CASE WHEN visit.closeduser=0 THEN '0' ELSE (SELECT users.name FROM users WHERE users.id=visit.closeduser) END AS closedusername " +
            " FROM visit " +
            " WHERE " +
            " visit.id=$1 AND " +
            " visit.status='1' AND " +
            " (visit.active='2' OR visit.active='3')",
            values: [id]
        }, (err, response) => {
            if (!err) {
                resolve(response.rows[0]);
            } else {
                resolve(false);
            }
        });
    });
};

Client.prototype.hasBanned = async function (clientId, ipAddress) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT id FROM banneduser WHERE (clientid=$1 OR ipaddress=$2) AND date>NOW()",
            values: [clientId, ipAddress]
        }, (err, response) => {
            if (!err) {
                if (response.rows.length > 0) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            } else {
                resolve(false);
            }
        });
    });
};

module.exports = new Client();
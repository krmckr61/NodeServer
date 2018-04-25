let db = require('../../Core/Database');
let Helper = require('../../Helpers/Helper');

let Visit = function () {

};

Visit.prototype.getActiveTakenVisitsFromUserId = async function (userId) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT visit.id FROM visit" +
            "       INNER JOIN visituser ON visit.id=visituser.visitid" +
            "   WHERE visituser.userid=$1 AND visit.active='1' AND visit.status='1'",
            values: [userId]
        }, (err, response) => {
            if (!err) {
                resolve(response.rows);
            } else {
                resolve(false);
            }
        })
    });
};

Visit.prototype.getRecentVisits = async function (clientId, visitId) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT (SELECT STRING_AGG(DISTINCT(users.name), ', ') as username FROM users INNER JOIN visituser ON users.id=visituser.userid WHERE visituser.visitid=visit.id), visit.*," +
            " extract (epoch from (visit.closed_at - visit.created_at)) as chattime, " +
            " CASE WHEN visit.closeduser=0 THEN '0' ELSE (SELECT users.name FROM users WHERE users.id=visit.closeduser) END AS closedusername" +
            " FROM visit " +
            " WHERE visit.visitorid=$1 AND (visit.active='2' OR visit.active='3') AND visit.id < $2 AND visit.status='1' ORDER BY visit.id DESC LIMIT 5",
            values: [clientId, visitId]
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
        })
    });
};

Visit.prototype.getWaitingVisits = async function () {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT visit.id, visit.visitorid FROM visit" +
            " WHERE" +
            " visit.active='1' AND EXISTS(SELECT visituser.id FROM visituser WHERE visituser.visitid=visit.id)=FALSE GROUP BY visit.id"
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
        })
    });
};

Visit.prototype.getVisitIdFromClientId = async function (clientId) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT visit.id FROM visit WHERE visitorid=$1 AND active='1' AND status='1' ORDER BY id DESC LIMIT 1",
            values: [clientId]
        }, (err, response) => {
            if (!err) {
                if (response.rows.length > 0) {
                    resolve(response.rows[0].id);
                } else {
                    resolve(false);
                }
            } else {
                resolve(false);
            }
        });
    });
};

Visit.prototype.destroyVisit = async function (visitId, active, userId) {
    return new Promise((resolve) => {
        db.query({
            text: "UPDATE visit SET active=$1, closed_at=$2, closeduser=$4 WHERE id=$3",
            values: [active, Helper.getCurrentTimeStamp(), visitId, userId]
        }, (err, response) => {
            if (!err) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
};

Visit.prototype.getLastVisitIdFromClientId = async function (clientId) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT id FROM visit WHERE visitorid=$1 AND active!='1' ORDER BY id DESC LIMIT 1",
            values: [clientId]
        }, (err, response) => {
            if(!err) {
                if(response.rows.length > 0) {
                    resolve(response.rows[0]['id']);
                } else {
                    resolve(false);
                }
            } else {
                resolve(false);
            }
        });
    });
};

Visit.prototype.rateChat = async function (visitId, value) {
    return new Promise((resolve) => {
        db.query({
            text :"UPDATE visit SET point=$1 WHERE id=$2",
            values: [value, visitId]
        }, (err, response) => {
            if(!err) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
};

Visit.prototype.hasUser = async function (userId, visitId) {
    return new Promise((resolve) => {
        db.query({
            text : "SELECT id FROM visituser WHERE userid=$1 AND visitid=$2 AND active='1'",
            values: [userId, visitId]
        }, (err, response) => {
            if(!err) {
                if(response.rows.length > 0) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            } else {
                resolve(false);
            }
        });
    })
};

Visit.prototype.getUserCount = async function (visitId) {
    return new Promise((resolve) => {
        db.query({
            text : "SELECT count(id) AS usercount FROM visituser WHERE visitid=$1 AND active='1'",
            values: [visitId]
        }, (err, response) => {
            if(!err) {
                if(response.rows.length > 0) {
                    resolve(response.rows[0].usercount);
                } else {
                    resolve(false);
                }
            } else {
                resolve(false);
            }
        });
    })
};

Visit.prototype.getUsersFromVisit = async function (visitId) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT users.id, users.name from visit INNER JOIN visituser ON visit.id=visituser.visitid INNER JOIN users ON visituser.userid=users.id WHERE visit.id=$1",
            values: [visitId]
        }, (err, response) => {
            if(!err) {
                if(response.rows.length > 0) {
                    let arr = {};
                    for(let key in response.rows) {
                        arr[response.rows[key].id] = response.rows[key].name;
                    }
                    resolve(arr);
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

Visit.prototype.hasMultipleUsers = async function(visitId) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT count(visituser.id) AS usercount FROM visituser WHERE visitid=$1 AND visituser.active='1'",
            values: [visitId]
        }, (err, response) => {
            if(!err) {
                if(response.rows[0]['usercount'] > 1) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            } else {
                response(false);
            }
        });
    });
};

module.exports = new Visit();
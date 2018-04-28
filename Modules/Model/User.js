let db = require('../../Core/Database');
let Helper = require('../../Helpers/Helper');

let User = function () {

};

User.prototype.getName = async function (id) {
    return new Promise((resolve) => {
        db.query({text: "SELECT name FROM users WHERE id=$1", values: [id]}, (err, response) => {
            if (!err && response.rows.length === 1) {
                resolve(response.rows[0].name);
            } else {
                resolve(false);
            }
        });
    });
};

User.prototype.get = async function (id) {
    return new Promise((resolve) => {
        db.query({text: "SELECT id, name FROM users WHERE id=$1", values: [id]}, (err, response) => {
            if (!err && response.rows.length === 1) {
                let row = response.rows[0];
                resolve({id: row.id, name: row.name});
            } else {
                resolve(false);
            }
        });
    });
};

User.prototype.getOnlineUsers = async function () {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT id, name, online FROM users WHERE onlinestatus='1'",
        }, (err, response) => {
            if (!err) {
                resolve(response.rows);
            } else {
                resolve(false);
            }
        });
    });
};

User.prototype.getUser = async function (id) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT " +
            " users.id, users.name, users.onlinestatus, userstatus.created_at::varchar" +
            " FROM " +
            " users " +
            " INNER JOIN" +
            "  userstatus ON users.id=userstatus.userid" +
            " WHERE users.id=$1 AND userstatus.status=users.onlinestatus ORDER BY userstatus.id DESC LIMIT 1",
            values: [id]
        }, (err, response) => {
            if (!err) {
                if(response.rows.length > 0) {
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

User.prototype.getRoles = async function (userId) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT * FROM role_user WHERE user_id=$1",
            values: [userId]
        }, (err, response) => {
            if (!err) {
                resolve(response.rows);
            } else {
                resolve(false);
            }
        });
    });
};

User.prototype.getOtherUsers = async function (userId, users) {
    return new Promise((resolve) => {
        let values = [];
        let sql = '';
        let i = 0;
        for (let key in users) {
            if (key != userId) {
                if (i !== 0) {
                    sql += 'OR ';
                }
                sql += 'users.id=$' + (i + 1);
                values.push(key);
                i++;
            }
        }

        if (values.length > 0) {
            db.query({
                text: "SELECT users.id, users.name, users.onlinestatus, (SELECT userstatus.created_at FROM userstatus WHERE userstatus.userid=users.id AND userstatus.status=users.onlinestatus ORDER BY userstatus.id DESC LIMIT 1)::varchar as created_at FROM users WHERE (" + sql + ") AND users.status='1' AND users.active='1'",
                values: values
            }, (err, response) => {
                if (!err) {
                    resolve(response.rows);
                } else {
                    resolve(false);
                }
            })
        } else {
            resolve(false);
        }
    });
};

User.prototype.getOtherUsersWithoutVisit = async function (userId, users, visitId) {
    return new Promise((resolve) => {
        let values = [];
        let sql = '';
        let i = 0;
        for (let key in users) {
            if (key != userId) {
                if (i !== 0) {
                    sql += 'OR ';
                }
                sql += 'users.id=$' + (i + 1);
                values.push(key);
                i++;
            }
        }

        if (values.length > 0) {
            values.push(visitId);
            let last = values.length;
            db.query({
                text: "SELECT users.id, users.name, users.onlinestatus, (SELECT userstatus.created_at FROM userstatus WHERE userstatus.userid=users.id AND userstatus.status=users.onlinestatus ORDER BY userstatus.id DESC LIMIT 1)::varchar as created_at FROM users WHERE (" + sql + ") AND users.status='1' AND users.active='1' AND EXISTS(SELECT id FROM visituser WHERE visitid=$" + last +  " AND userid=users.id AND visituser.active='1')=false",
                values: values
            }, (err, response) => {
                if (!err) {
                    resolve(response.rows);
                } else {
                    resolve(false);
                }
            })
        } else {
            resolve(false);
        }
    });
};

User.prototype.setOnlineStatus = async function (userId, onlineStatus) {
    return new Promise((resolve) => {
        this.closeLastOnlineStatus(userId);
        db.query({
            text: "INSERT INTO userstatus(userid, status) VALUES($1, $2) RETURNING created_at",
            values: [userId, onlineStatus]
        }, (err, response) => {
            if (!err) {
                db.query({
                    text: "UPDATE users SET onlinestatus=$1 WHERE id=$2",
                    values: [onlineStatus, userId]
                }, (err, response2) => {
                    if (!err) {
                        if(response.rows.length > 0) {
                            resolve(response.rows[0].created_at);
                        } else {
                            resolve(false);
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

User.prototype.closeLastOnlineStatus = async function (userId) {
    return new Promise((resolve) => {
        db.query({
            text: "UPDATE userstatus SET statustime=EXTRACT(EPOCH FROM ($1::timestamp - created_at)) WHERE userid=$2 AND statustime IS NULL",
            values: [Helper.getCurrentTimeStamp(), userId]
        }, (err, response) => {
            if (!err) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
};

User.prototype.getOnlineStatus = async function (userId) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT onlinestatus FROM users WHERE id=$1",
            values: [userId]
        }, (err, response) => {
            if (!err) {
                resolve(response.rows[0]['onlinestatus']);
            } else {
                resolve(false);
            }
        });
    });
};

User.prototype.addLoginOnlineStatus = async function (userId) {
    return new Promise((resolve) => {
        this.closeLastOnlineStatus(userId).then(() => {
            this.getOnlineStatus(userId).then((onlineStatus) => {
                if (onlineStatus) {
                    db.query({
                        text: "INSERT INTO userstatus(userid, status) values($1, $2)",
                        values: [userId, onlineStatus]
                    }, (err, response) => {
                        if (!err) {
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    })
                }
            });
        });
    })
};

User.prototype.getCurrentChatCount = async function (userId) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT COUNT(visituser.id) AS count FROM visituser" +
            "       INNER JOIN visit ON visituser.visitid = visit.id" +
            "       WHERE" +
            "       visituser.userid=$1 AND visit.active='1'",
            values: [userId]
        }, (err, response) => {
            if (!err) {
                if (response.rows.length > 0) {
                    resolve(response.rows[0].count);
                }
            } else {
                resolve(false);
            }
        });
    });
};

User.prototype.hasRole = async function (userId, roleName) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT role_user.user_id FROM role_user" +
            " INNER JOIN roles ON role_user.role_id=roles.id" +
            " WHERE" +
            " roles.name=$1 AND role_user.user_id=$2",
            values: [roleName, userId]
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

User.prototype.getAvaibleUserId = async function getAvaibleUsers(userArr) {
    return new Promise((resolve) => {
        let userIds = [];
        let queryString = "";
        let i = 0;
        Object.keys(userArr).forEach((userId) => {
            if (i !== 0) {
                queryString += " OR ";
            }
            queryString += " users.id=$" + (i + 1);
            userIds.push(userId);
            i++;
        });

        db.query({
            text: "SELECT " +
            " users.id, users.onlinestatus" +
            " FROM" +
            " users" +
            " INNER JOIN role_user ON users.id=role_user.user_id" +
            " INNER JOIN roles ON role_user.role_id=roles.id" +
            " WHERE" +
            " users.onlinestatus='1' AND " +
            " roles.name='canli-destek' AND (" + queryString + ") AND  (" +
            " SELECT" +
            " count(visituser.id)" +
            " FROM" +
            " visituser" +
            " INNER JOIN visit ON visituser.visitid=visit.id" +
            " WHERE" +
            " users.onlinestatus='1' AND visit.active='1' AND visituser.userid=users.id" +
            " ) < users.maxvisitcount" +
            " ORDER BY" +
            " CASE WHEN EXISTS(SELECT visituser.id FROM visituser WHERE visituser.userid=users.id ORDER BY visituser.id DESC LIMIT 1) THEN (SELECT visituser.id FROM visituser WHERE visituser.userid=users.id ORDER BY visituser.id DESC LIMIT 1) ELSE 0 END ASC LIMIT 1",
            values: userIds
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

User.prototype.getAvaibleUserIdFromSubjectId = async function(userArr, subjectId) {

    return new Promise((resolve) => {
        let userIds = [];
        let queryString = "";
        let i = 0;
        Object.keys(userArr).forEach((userId) => {
            if (i !== 0) {
                queryString += " OR ";
            }
            queryString += " users.id=$" + (i + 1);
            userIds.push(userId);
            i++;
        });

        db.query({
            text: "SELECT " +
            " users.id, users.onlinestatus" +
            " FROM" +
            " users" +
            " INNER JOIN role_user ON users.id=role_user.user_id" +
            " INNER JOIN roles ON role_user.role_id=roles.id" +
            " INNER JOIN usersubject ON users.id=usersubject.userid" +
            " WHERE" +
            " users.onlinestatus='1' AND " +
            " usersubject.subjectid='" + subjectId + "' AND" +
            " roles.name='canli-destek' AND (" + queryString + ") AND  (" +
            " SELECT" +
            " count(visituser.id)" +
            " FROM" +
            " visituser" +
            " INNER JOIN visit ON visituser.visitid=visit.id" +
            " WHERE" +
            " users.onlinestatus='1' AND visit.active='1' AND visituser.userid=users.id" +
            " ) < users.maxvisitcount" +
            " ORDER BY" +
            " CASE WHEN EXISTS(SELECT visituser.id FROM visituser WHERE visituser.userid=users.id ORDER BY visituser.id DESC LIMIT 1) THEN (SELECT visituser.id FROM visituser WHERE visituser.userid=users.id ORDER BY visituser.id DESC LIMIT 1) ELSE 0 END ASC LIMIT 1",
            values: userIds
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

module.exports = new User();
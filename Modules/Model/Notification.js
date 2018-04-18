let db = require('../../Core/Database');
let UserModel = require('./User');

let Notification = function () {
    this.contentCount = 20;
};

Notification.prototype.getAllNotificationsFromUserId = async function (userId, page) {
    return new Promise((resolve) => {
        UserModel.getRoles(userId).then((roles) => {

            let query = "";
            let values = [];
            if (roles && roles.length > 0) {
                let arr = this.getRoleQueryString(roles, 2);
                let roleIds = arr.roleIds;
                let roleQuery = arr.roleQuery;
                query = "(notification.type='user' AND notification.ownerid=$1) OR (notification.type='role' AND (" + roleQuery + ")) ORDER BY notification.id DESC";
                roleIds.unshift(userId);
                values = roleIds;
            } else {
                query = "notification.type='user' AND notification.ownerid=$1 ORDER BY notification.id DESC";
                values = [userId];
            }

            page--;

            db.query({
                text: "SELECT notification.*, users.name AS username FROM notification " +
                "   INNER JOIN users ON notification.userid=users.id" +
                "   WHERE " + query + " LIMIT " + this.contentCount + " OFFSET " + (page * this.contentCount),
                values: values
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
    })
};

Notification.prototype.getUserNotificationsFromUserId = async function (userId) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT * FROM notification WHERE type='user' AND ownerid=$1",
            values: [userId]
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

Notification.prototype.getUserRoleNotificationsFromUserId = async function (userId) {
    return new Promise((resolve) => {
        UserModel.getRoles(userId).then((roles) => {
            if (roles && roles.length > 0) {
                let arr = this.getRoleQueryString(roles);
                let roleIds = arr.roleIds;
                let roleQuery = arr.roleQuery;

                if (roleIds.length > 0) {
                    db.query({
                        text: "SELECT * FROM notification WHERE type='role' AND (" + roleQuery + ") ORDER BY notification.id DESC",
                        values: roleIds
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
                } else {
                    resolve(false);
                }
            } else {
                resolve(false);
            }
        });
    });
};

Notification.prototype.getRoleQueryString = function (roles, parameterStart = 1) {
    let roleIds = [];
    let roleQuery = '';
    for (let i = 0; i < roles.length; i++) {
        if (i !== 0) {
            roleQuery += ' OR ';
        }
        roleQuery += ' notification.ownerid=$' + parameterStart;
        roleIds.push(roles[i].role_id);
        parameterStart++;
    }
    if (roleIds.length > 0) {
        return {roleIds: roleIds, roleQuery: roleQuery};
    } else {
        return false;
    }
};

Notification.prototype.add = async function (userId, text) {
    return new Promise((resolve) => {
        db.query({
            text: "INSERT INTO notification(userid, text) VALUES($1, $2)",
            values: [userId, text]
        }, (err, response) => {
            if(!err) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
};

module.exports = new Notification();
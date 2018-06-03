let db = require('../../Core/Database');
let NotificationModel = require('./Notification');
let VisitModel = require('./Visit');

let BannedUser = function () {
};

BannedUser.prototype.addBannedUser = async function (userId, siteId, clientId, ipAddress, date) {
    return new Promise((resolve) => {
        db.query({
            text: "INSERT INTO banneduser(userid, siteid, clientid, ipaddress, date) VALUES($1, $2, $3, $4, $5)",
            values: [userId, siteId, clientId, ipAddress, date]
        }, (err, response) => {
            if(!err) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
};

module.exports = new BannedUser();
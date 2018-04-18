let db = require('../../Core/Database');
let NotificationModel = require('./Notification');
let VisitModel = require('./Visit');

let BannedUser = function () {
    this.table = 'banneduser';
};

BannedUser.prototype.addBannedUser = async function (userId, clientId, ipAddress, date) {
    return new Promise((resolve) => {
        db.query({
            text: "INSERT INTO banneduser(userid, clientid, ipaddress, date) VALUES($1, $2, $3, $4)",
            values: [userId, clientId, ipAddress, date]
        }, (err, response) => {
            if(!err) {
                resolve(true);
            } else {
                resolve(false);
            }
        });

        resolve(true);

    });
};

module.exports = new BannedUser();
let db = require('../../Core/Database');
let Helper = require('../../Helpers/Helper');

let useronlinetime = function () {
    this.table = 'useronlinetime';
};

useronlinetime.prototype.add = async function (userId, connectionDate) {
    return new Promise((resolve) => {
        let date1 = new Date(connectionDate);
        let date2 = Helper.getCurrentDate();
        let timeDiffInSecs = Math.abs((date2.getTime() - date1.getTime()) / 1000);
        db.query({
            text: "INSERT INTO useronlinetime(userid, onlinetime, connectiontime) VALUES($1, $2, $3)",
            values: [userId, timeDiffInSecs, connectionDate]
        }, (err, response) => {
            if(!err) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
};


module.exports = new useronlinetime();
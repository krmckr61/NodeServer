let db = require('../../Core/Database');

let Config = function () {
    
};

Config.prototype.getValue = function (name) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT value FROM config WHERE name=$1",
            values:[name]
        }, (err, response) => {
            if(!err) {
                if(response.rows.length > 0) {
                    resolve(response.rows[0]['value']);
                } else {
                    resolve(false);
                }
            } else {
                resolve(false);
            }
        });
    });
};

module.exports = new Config();
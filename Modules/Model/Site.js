let db = require('../../Core/Database');

let Site = function () {
    
};

Site.prototype.isActive = function (siteId) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT id FROM site WHERE id=$1",
            values: [siteId]
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
        })
    });
};

module.exports = new Site();
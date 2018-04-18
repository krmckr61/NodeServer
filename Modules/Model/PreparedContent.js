let db = require('../../Core/Database');

let PreparedContent = function () {
    
};

PreparedContent.prototype.getAllFromLetter = async function (letter) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT id, name, content, number FROM preparedcontent WHERE type='text' AND letter=$1 AND status='1' AND active='1' AND number is NOT NULL",
            values: [letter]
        }, (err, response) => {
            if(!err) {
                if(response.rows.length > 0) {
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

module.exports = new PreparedContent();
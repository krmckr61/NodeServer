let db = require('../../Core/Database');

let Subject = function () {
    
};

Subject.prototype.getAll = async function() {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT * FROM subject WHERE active=$1 AND status=$1",
            values: ['1']
        }, (err, response) => {
            if(!err) {
                resolve(response.rows);
            } else {
                resolve(false);
            }
        });
    });
};

Subject.prototype.getNameFromId = async function(subjectId) {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT name FROM subject WHERE id=$1",
            values: [subjectId]
        }, (err, response) => {
            if(!err) {
                if(response.rows.length > 0) {
                    resolve(response.rows[0].name);
                } else {
                    resolve(false);
                }
            } else {
                resolve(false);
            }
        });
    });
};

module.exports = new Subject();
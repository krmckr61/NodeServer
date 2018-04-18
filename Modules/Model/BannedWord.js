let db = require('../../Core/Database');
let NotificationModel = require('./Notification');
let VisitModel = require('./Visit');

let BannedWord = function () {
    this.table = 'bannedword';
};

BannedWord.prototype.getAllToArray = async function () {
    return new Promise((resolve) => {
        db.query({
            text: "SELECT content FROM bannedword WHERE active='1' AND status='1'"
        }, (err, response) => {
            if (!err) {
                if (response.rows.length > 0) {
                    let arr = [];
                    for (let i = 0; i < response.rows.length; i++) {
                        arr.push(response.rows[i]['content']);
                    }
                    resolve(arr);
                } else {
                    resolve(false);
                }
            } else {
                resolve(false);
            }
        });
    });
};

BannedWord.prototype.getCouplingWords = async function (text) {
    return new Promise((resolve) => {
        this.getAllToArray().then((bannedWords) => {
            if (bannedWords) {
                text = this.resetText(text);
                let words = text.split(' ');
                if (words.length > 0) {
                    let couplingWords = this.getCouplingWordsInArray(words, bannedWords);
                    if (couplingWords.length > 0) {
                        resolve(couplingWords);
                    } else {
                        resolve(false);
                    }
                } else {
                    resolve(false);
                }
            } else {
                resolve(false);
            }
        });
    });
};

BannedWord.prototype.getCouplingWordsInArray = function (words, bannedWords) {
    let couplingWords = [];
    for (let i = 0; i < words.length; i++) {
        for (let j = 0; j < bannedWords.length; j++) {
            if (words[i].toLowerCase() === bannedWords[j].toLowerCase()) {
                couplingWords.push(words[i]);
            }
        }
    }
    return couplingWords;
};

BannedWord.prototype.resetText = function (text) {
    text = text.replace('.', ' ');
    text = text.replace(',', ' ');
    text = text.replace(':', ' ');
    text = text.trim();
    return text;
};

BannedWord.prototype.initBannedWordNotification = function (userId, visitId, message) {
    this.getCouplingWords(message).then((couplingWords) => {
        if (couplingWords) {
            for (let i = 0; i < couplingWords.length; i++) {
                let notificationText = "Yasaklı kelime kullanıldı : '" + couplingWords[i] + "'";
                NotificationModel.add(userId, notificationText).then((response) => {
                });
            }
        }
    });
};

module.exports = new BannedWord();
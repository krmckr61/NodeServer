let useragent = require('useragent');
let where = require('node-where');

let ClientInfo = {};

ClientInfo.getInfo = async function (socket) {
    return new Promise((resolve) => {
        let data = {};
        data.connectionTime = this.getDateInfo();
        let agent = useragent.parse(socket.request.headers['user-agent']).toString().split('/');
        data.device = {os: agent[1], browser: agent[0]};
        if (socket.request.connection.remoteAddress) {
            data.ipAddress = socket.conn.request.headers['x-forwarded-for'];
        } else if(socket.request.connection.remoteAddress) {
            data.ipAddress = socket.request.connection.remoteAddress;
        }

        if (data.ipAddress) {
            if(data.ipAddress === '127.0.0.1' || data.ipAddress === '::ffff:127.0.0.1' || data.ipAddress === '::1') {
                data.ipAddress = '167.99.135.47';
            }
            this.getLocationInfo(data.ipAddress).then((location) => {
                if (location) {
                    data.location = location;
                }
                resolve(data);
            });
        }
    });
};

ClientInfo.getLocationInfo = async function (ip) {
    return new Promise((resolve) => {
        where.is(ip, (err, res) => {
            if (!err) {
                let location = {};
                location.country = res.get('country');
                location.countryCode = res.get('countryCode');
                location.city = res.get('city');
                resolve(location);
            } else {
                resolve(false);
            }
        });
    });
};

ClientInfo.getDateInfo = function () {
    let date = new Date();
    return {year : date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(), hour: date.getHours(), minute: date.getMinutes()};
};

module.exports = ClientInfo;
let useragent = require('useragent');
let where = require('node-where');
let ClientModel = require('../Modules/Model/Client');
let ClientInfo = {};

ClientInfo.getInfo = async function (socket) {
    return new Promise((resolve) => {
        let data = {};
        data.connectionTime = this.getDateInfo();
        let agent = useragent.parse(socket.request.headers['user-agent']).toString().split('/');
        data.device = {os: agent[1], browser: agent[0]};
        if (socket.conn.request && socket.conn.request.headers && socket.conn.request.headers['x-forwarded-for']) {
            data.ipAddress = socket.conn.request.headers['x-forwarded-for'];
        } else if (socket.request.connection.remoteAddress) {
            data.ipAddress = socket.request.connection.remoteAddress;
        }
        if (data.ipAddress === '127.0.0.1' || data.ipAddress === '::ffff:127.0.0.1' || data.ipAddress === '::1' || !data.ipAddress) {
            data.ipAddress = '167.99.135.47';
        }
        this.getLocationInfo(data.ipAddress).then((location) => {
            if (location) {
                data.location = location;
            } else {
                console.log('client location not found : ' + data.ipAddress);
            }
            resolve(data);
        });
    });
};

ClientInfo.getPreInfo = function (socket) {
    let data = {};
    data.connectionTime = this.getDateInfo();
    let agent = useragent.parse(socket.request.headers['user-agent']).toString().split('/');
    data.device = {os: agent[1], browser: agent[0]};
    if (socket.conn.request && socket.conn.request.headers && socket.conn.request.headers['x-forwarded-for']) {
        data.ipAddress = socket.conn.request.headers['x-forwarded-for'];
    } else if (socket.request.connection.remoteAddress) {
        data.ipAddress = socket.request.connection.remoteAddress;
    }
    if (data.ipAddress === '127.0.0.1' || data.ipAddress === '::ffff:127.0.0.1' || data.ipAddress === '::1' || !data.ipAddress) {
        data.ipAddress = '167.99.135.47';
    }

    return data;
};

ClientInfo.getClientProperties = async function (clientId, siteId, ipAddress) {
    return new Promise((resolve) => {
        let properties = {};
        ClientModel.getStatus(clientId).then((status) => {
            ClientInfo.getLocationInfo(ipAddress).then((location) => {
                ClientModel.hasBanned(clientId, ipAddress).then((banned) => {
                    properties.status = status;
                    properties.location = location;
                    properties.banned = banned;
                    resolve(properties);
                });
            });
        });
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
    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes()
    };
};

module.exports = ClientInfo;
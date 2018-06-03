let Request = {
    getClientId: function (request) {
        return request._query.id;
    },
    getRepresentativeId: function (request) {
        return request._query.representativeId;
    },
    getSiteId: function (request) {
        return request._query.siteId
    }
};

module.exports = Request;
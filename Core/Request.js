let Request = {
    getClientId: function (request) {
        return request._query.id;
    },
    getRepresentativeId: function (request) {
        return request._query.representativeId;
    }
};

module.exports = Request;
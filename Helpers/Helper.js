var helper = {

};

helper.getCurrentTimeStamp = function () {
    return new Date(new Date().getTime() + (3 * 1000 * 60 * 60)).toISOString().replace(/T/, ' ').replace(/\..+/, '');
};

helper.getCurrentDate = function () {
    return new Date(new Date().getTime() + (3 * 1000 * 60 * 60));
};

module.exports = helper;
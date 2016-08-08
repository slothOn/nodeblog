/**
 * Created by zxc on 16/8/4.
 */
var settings = require('../settings'),
    Db = require('mongodb').Db,
    Connectiong = require('mongodb').Connection,
    Server = require('mongodb').Server;
module.exports = new Db(settings.db, new Server(settings.host, settings.port), {safe : true});

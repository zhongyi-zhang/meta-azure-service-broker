/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var async = require('async');
var HttpStatus = require('http-status-codes');
var util = require('util');

var sqldbBind = function (log, params) {

    var instanceId = params.instance_id;
    var reqParams = params.parameters || {};
    var lastoperation = params.last_operation || '';
    var resourceGroupName = reqParams.resourceGroup || '';
    var sqldbName = reqParams.sqldbName || '';
    var sqlServerName = reqParams.sqlServerName || '';

    log.info(util.format('sqldb cmd-bind: resourceGroupName: %s, sqldbName: %s, sqlServerName: %s', resourceGroupName, sqldbName, sqlServerName));

    var parametersDefined = !(_.isNull(reqParams.parameters) || _.isUndefined(reqParams.parameters));

    var location = '';
    if (parametersDefined)
        location = reqParams.parameters.location || '';

    this.bind = function (sqldbOperations, callback) {
        var groupParameters = {
            location: location
        };

        sqldbOperations.setParameters(resourceGroupName, sqlServerName, sqldbName);
        
        log.info('sqldb cmd-bind: async.waterfall/get status of sql server');
        sqldbOperations.getServer(function (err, result) {
            if (err) {
                log.error('sqldb cmd-bind: async.waterfall/get status of sql server: err: %j', err);
                callback(err);
            } else {
                log.info('sqldb cmd-bind: async.waterfall/get status of sql server: result: %j', result);
                callback(null, result);
            }
        });
    };
};

module.exports = sqldbBind;

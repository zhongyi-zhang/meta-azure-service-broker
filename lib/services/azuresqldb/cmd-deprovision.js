/* jshint camelcase: false */
/* jshint newcap: false */

var async = require('async');
var HttpStatus = require('http-status-codes');
var util = require('util');

var sqldbDeprovision = function (log, params) {

    var provisioningResult = JSON.parse(params.provisioning_result);
    var idParts = provisioningResult.id.split('/');
    var resourceGroupName = idParts[4];
    var sqldbName = provisioningResult.name;    
    var sqlServerName = provisioningResult.sqlServerName;

    log.info(util.format('sqldb cmd-deprovision: resourceGroupName: %s, sqldbName: %s, sqlServerName: %s', resourceGroupName, sqldbName, sqlServerName));

    this.deprovision = function (sqldbOperations, next) {

        sqldbOperations.setParameters(resourceGroupName, sqlServerName, sqldbName);

        sqldbOperations.deleteDatabase(function (err) {
            if (err) {
                log.error('sqldb cmd-deprovision: async.waterfall/deleteDatabase: err: %j', err);
                return next(err);
            } else {
                var result = {};
                result.state = 'succeeded';
                result.description = 'Deleted database';
                next(null, result);
            }
        });
    };
};

module.exports = sqldbDeprovision;

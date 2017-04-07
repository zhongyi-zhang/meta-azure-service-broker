/* jshint camelcase: false */
/* jshint newcap: false */

var util = require('util');
var Config = require('./service');
var common = require('../../common');
var log = common.getLogger(Config.name);

var sqldbDeprovision = function (params) {

    var provisioningResult = JSON.parse(params.provisioning_result);
    var resourceGroupName = provisioningResult.resourceGroup;
    var mysqlServerName = provisioningResult.mysqlServerName;

    log.info(util.format('mysqldb cmd-deprovision: resourceGroupName: %s, mysqlServerName: %s', resourceGroupName, mysqlServerName));

    this.deprovision = function (sqldbOperations, next) {

        sqldbOperations.setParameters(resourceGroupName, mysqlServerName);

        sqldbOperations.deleteServer(function (err) {
            if (err) {
                log.error('mysqldb cmd-deprovision: async.waterfall/deleteServer: err: %j', err);
                return next(err);
            } else {
                var result = {};
                result.state = 'in progress';
                result.description = 'Deleting Server';
                next(null, result);
            }
        });
    };
};

module.exports = sqldbDeprovision;

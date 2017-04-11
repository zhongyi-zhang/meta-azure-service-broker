/* jshint camelcase: false */
/* jshint newcap: false */

var util = require('util');
var Config = require('./service');
var common = require('../../common');
var log = common.getLogger(Config.name);

var mysqldbDeprovision = function (params) {

    var provisioningResult = params.provisioning_result;
    var resourceGroupName = provisioningResult.resourceGroup;
    var mysqlServerName = provisioningResult.mysqlServerName;
    var mysqldbName = provisioningResult.mysqldbName;

    log.info(util.format('mysqldb cmd-deprovision: resourceGroupName: %s, mysqlServerName: %s, mysqldbName: %s', resourceGroupName, mysqlServerName, mysqldbName));

    this.deprovision = function (mysqldbOperations, next) {

        mysqldbOperations.setParameters(resourceGroupName, mysqlServerName, mysqldbName);
        mysqldbOperations.setConnectionConfig(
            provisioningResult.fullyQualifiedDomainName,
            provisioningResult.administratorLogin,
            provisioningResult.administratorLoginPassword
        );
        
        mysqldbOperations.deleteDatabase(true, function (err) {
            if (err) {
                log.error('mysqldb cmd-deprovision: async.waterfall/deleteDatabase: err: %j', err);
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

module.exports = mysqldbDeprovision;

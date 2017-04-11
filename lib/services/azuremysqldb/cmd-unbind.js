/* jshint camelcase: false */
/* jshint newcap: false */

var util = require('util');
var Config = require('./service');
var common = require('../../common');
var log = common.getLogger(Config.name);

var mysqldbUnbind = function (params) {

    var reqParams = params.parameters || {};
    var provisioningResult = params.provisioning_result;
    var bindingResult = params.binding_result;
    var resourceGroupName = provisioningResult.resourceGroup || '';
    var mysqldbName = reqParams.mysqldbName || '';
    var mysqlServerName = reqParams.mysqlServerName || '';
    var databaseLogin = bindingResult.databaseLogin;

    log.info(util.format('mysqldb cmd-unbind: resourceGroupName: %s, mysqldbName: %s, mysqlServerName: %s', resourceGroupName, mysqldbName, mysqlServerName));

    this.unbind = function (mysqldbOperations, next) {
        mysqldbOperations.setParameters(resourceGroupName, mysqlServerName, mysqldbName);
        mysqldbOperations.setConnectionConfig(
            provisioningResult.fullyQualifiedDomainName,
            provisioningResult.administratorLogin,
            provisioningResult.administratorLoginPassword
        );
        
        log.info('mysqldb cmd-unbind: dropUser');
        mysqldbOperations.dropUser(databaseLogin, false, function(err) {
            if (err) {
                log.error('mysqldb cmd-unbind: dropUser: err: %j', err);
            }
            next(err);
        });
                
    };
};

module.exports = mysqldbUnbind;

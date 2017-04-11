/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var async = require('async');
var HttpStatus = require('http-status-codes');
var Config = require('./service');
var common = require('../../common');
var log = common.getLogger(Config.name);
var util = require('util');

var mysqldbProvision = function (params) {

    var reqParams = params.parameters || {};
    var privilege = params.privilege.mysqldb;
    var accountPool = params.accountPool.mysqldb;
    
    var mysqlServerName = reqParams.mysqlServerName || '';
    var mysqldbName = reqParams.mysqldbName || '';
    
    // read resourceGroupName, location, administratorLogin, administratorLoginPassword all from module config, or all from broker config
    var resourceGroupName = reqParams.resourceGroup || '';
    var location = reqParams.location || '';

    var administratorLogin = null, administratorLoginPassword = null;
    if (reqParams.mysqlServerParameters) {
        var properties = reqParams.mysqlServerParameters.properties;
        if (properties) {
            administratorLogin = properties.administratorLogin;
            administratorLoginPassword = properties.administratorLoginPassword;
        }
    }
    
    if (!(resourceGroupName || location || administratorLogin || administratorLoginPassword)) {
        if (mysqlServerName in accountPool) {
            resourceGroupName = accountPool[mysqlServerName]['resourceGroup'];
            location = accountPool[mysqlServerName]['location'];
            administratorLogin = accountPool[mysqlServerName]['administratorLogin'];
            administratorLoginPassword = accountPool[mysqlServerName]['administratorLoginPassword'];
        }
    }
        
    log.info(util.format('mysqldb cmd-provision: resourceGroupName: %s, mysqlServerName: %s, mysqldbName: %s', resourceGroupName, mysqlServerName, mysqldbName));
    
    reqParams.sku = {
      'name': 'MYSQLS3M100',
      'tier': 'Basic',
      'capacity': 100
    };

    this.provision = function (mysqldbOperations, next) {
        
        var groupParameters = {
            location: location
        };
        reqParams.location = location;
        
        mysqldbOperations.setParameters(resourceGroupName, mysqlServerName, mysqldbName);
        
        async.waterfall([
            function (callback) {
                mysqldbOperations.createResourceGroup(resourceGroupName, groupParameters, callback);
            },
            function (callback) {  // get mysql server status (existence check)
                mysqldbOperations.getServer(function (err, result) {
                    if (err) {
                        log.error('mysqldb cmd-provision: get the mysql server: err: %j', err);
                        return callback(err);
                    } else {
                        log.info('mysqldb cmd-provision: get the mysql server: %j', result);
                        callback(null, result);
                    }
                });
            },
            function (result, callback) {   // create mysql server if not exist
                if (result.statusCode === HttpStatus.NOT_FOUND) {
                    if (!privilege.allowToCreateMysqlServer) {
                        var errorMessage = util.format('The specified server does not exist but you do not have the privilege to create a new server.');
                        return callback(Error(errorMessage));
                    }
                    
                    mysqldbOperations.createServer(reqParams, function (err) {
                        if (err) {
                            log.error('mysqldb cmd-provision: create the mysql server: err: %j', err);
                            callback(err);
                        } else {    // mysql server created, go on to create the server
                            log.info('mysqldb cmd-provision: create the mysql server: succeeded');
                            callback(null);
                        }
                    });
                } else if (result.statusCode === HttpStatus.OK) {  // mysql server exists
                    if (!privilege.allowToCreateMysqlServer) {
                        if (!_.isUndefined(reqParams.mysqlServerParameters) && !_.isUndefined(reqParams.mysqlServerParameters.allowMysqlServerFirewallRules)) {
                          var errorMessage = util.format('You specify the firewall rules for the server but you do not have the privilege to operate the server.');
                          return callback(Error(errorMessage));
                        }
                    }
                  
                    mysqldbOperations.setConnectionConfig(
                        result.body.properties.fullyQualifiedDomainName,
                        administratorLogin,
                        administratorLoginPassword
                    );
                    
                    // check existence of database
                    log.info('mysqldb cmd-provision: check existence of database');
                    mysqldbOperations.getDatabase(true, function (err, dbs) {
                        if (err) {
                            log.error('mysqldb cmd-provision: check existence of sql database: err: %j', err);
                            return callback(err);
                        }
                        
                        if (dbs.length === 0) {
                            callback(null);
                        } else {
                            var error = Error('The database name is not available.');
                            error.statusCode = HttpStatus.CONFLICT;
                            callback(error);
                        }
                    });
                } else {
                    var errorMessage = util.format('Unexpected error: %j', result);
                    log.error(Error(errorMessage));
                    callback(Error(errorMessage));
                }
            }
        ], function (err) {
            if (err) {
                log.error('mysqldb cmd-provision: final callback: err: ', err);
                next(err);
            } else {
                var result = {};
                result.body = {};
                result.body.resourceGroup = resourceGroupName;
                result.body.mysqlServerName = mysqlServerName;
                result.body.mysqldbName = mysqldbName;
                result.body.administratorLogin = administratorLogin;
                result.body.administratorLoginPassword = administratorLoginPassword;
                result.body.provisionStage = 0;
                result.value = {};
                result.value.state = 'in progress';
                result.value.description = 'Creating logical server ' + reqParams.mysqlServerName + '.';
                log.info('mysqldb cmd-provision: final callback: result: ', result);
                next(null, result);
            }
        });
    };

    // validators

    this.firewallRuleIsOk = function () {
        if (!_.isUndefined(reqParams.mysqlServerParameters) && !_.isUndefined(reqParams.mysqlServerParameters.allowMysqlServerFirewallRules)) {
            var rules = reqParams.mysqlServerParameters.allowMysqlServerFirewallRules;
            if (!(rules instanceof Array)) return false;
            var ruleValidFlag = true;
            rules.forEach(function (rule){
                if (rule.ruleName) {
                    if (rule.ruleName.length === 0) {ruleValidFlag = false; return;}
                } else {ruleValidFlag = false; return;}
                if (_.isString(rule.startIpAddress)) {
                    if (rule.startIpAddress.length === 0) {ruleValidFlag = false; return;}
                    if (rule.startIpAddress.search('^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$') !== 0) {ruleValidFlag = false; return;}
                } else {ruleValidFlag = false; return;}
                if (_.isString(rule.endIpAddress)) {
                    if (rule.endIpAddress.length === 0) {ruleValidFlag = false; return;}
                    if (rule.endIpAddress.search('^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$') !== 0) {ruleValidFlag = false; return;}
                } else {ruleValidFlag = false; return;}
            });
            return ruleValidFlag;
        }
        return true;    // no firewall rule at all, is ok.
    };
    
    this.parametersNotProvided = function () {
        var ret = [];
      
        var names =  ['resourceGroupName', 'location', 'mysqlServerName', 'mysqldbName', 'administratorLogin', 'administratorLoginPassword'];
        var values = [ resourceGroupName,   location,   mysqlServerName,   mysqldbName,   administratorLogin,   administratorLoginPassword];
        for (var i = 0; i < names.length; i++) {
            if (!_.isString(values[i]) || values[i].length === 0) {
                ret.push(names[i]);
            }
        }
        return ret;
    };

    this.getInvalidParams = function () {
        var invalidParams = [];
        invalidParams = invalidParams.concat(this.parametersNotProvided());
        
        if (!this.firewallRuleIsOk()) invalidParams.push('allowMysqlServerFirewallRules');
        return invalidParams;
    };
};

module.exports = mysqldbProvision;


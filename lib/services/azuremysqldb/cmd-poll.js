/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var async = require('async');
var HttpStatus = require('http-status-codes');
var util = require('util');
var Config = require('./service');
var common = require('../../common');
var log = common.getLogger(Config.name);

var mysqldbPoll = function (params) {

    var reqParams = params.parameters;
    var provisioningResult = params.provisioning_result;
    var lastoperation = params.last_operation;
    var resourceGroupName = provisioningResult.resourceGroup;
    var mysqlServerName = reqParams.mysqlServerName;
    var mysqldbName = reqParams.mysqldbName;
    
    log.info(util.format('mysqldb cmd-poll: resourceGroupName: %s, mysqlServerName: %s, mysqldbName: %s', resourceGroupName, mysqlServerName, mysqldbName));

    this.poll = function (mysqldbOperations, next) {

        mysqldbOperations.setParameters(resourceGroupName, mysqlServerName, mysqldbName);
        
        var reply = {
            state: '',
            description: ''
        };
        var result = {};
        result.body = provisioningResult;
        result.value = reply;
        
        if (lastoperation === 'provision') {
            
            async.waterfall([
                function (callback) {
                    if (provisioningResult.provisionStage !== 0) {
                        return callback(null);
                    }
                  
                    // get status of server
                    log.info('mysqldb cmd-poll: check existence of server');
                    mysqldbOperations.getServer(function (err, res) {
                        if (err) {
                            log.error('mysqldb cmd-poll: check existence of mysql server: err: %j', err);
                            callback(err);
                        } else {
                            log.info('mysqldb cmd-poll: check existence of mysql server: res: %j\nlastoperation: %s', res, lastoperation);
                            if (res.statusCode === HttpStatus.OK && res.body.properties.userVisibleState === 'Ready') {
                                /* example 
                                  {
                                   "id":"/subscriptions/c4528d9e-c99a-48bb-b12d-fde2176a43b8/resourceGroups/zhongyitest/providers/Microsoft.DBforMySQL/servers/zhongyimysql5",
                                   "name":"zhongyimysql5",
                                   "type":"Microsoft.DBforMySQL/servers",
                                   "location":"westus",
                                   "sku":{"name":"MYSQLS3M100","tier":"Basic","capacity":100},
                                   "properties":{"administratorLogin":"zhongyi","storageMB":51200,"version":"5.6","userVisibleState":"Ready","fullyQualifiedDomainName":"zhongyimysql5.database.windows.net"}
                                  }
                                */
                                provisioningResult.fullyQualifiedDomainName = res.body.properties.fullyQualifiedDomainName;
                                mysqldbOperations.setConnectionConfig(
                                    provisioningResult.fullyQualifiedDomainName,
                                    provisioningResult.administratorLogin,
                                    provisioningResult.administratorLoginPassword
                                );
                                
                                ++provisioningResult.provisionStage;
                                return callback(null);
                            } else if (res.statusCode === HttpStatus.OK || res.statusCode === HttpStatus.NOT_FOUND) { 
                                
                                reply.state = 'in progress';
                                reply.description = 'Creating server ' + reqParams.mysqlServerName + '.';
                                callback(null);
                            } else {
                                log.error('mysqldb cmd-poll: create server, unexpected error: res: %j', res);
                                callback(new Error(res.body.message));
                            }
                        }
                    });
                },
                function (callback) {
                    if (provisioningResult.provisionStage !== 1) {
                        return callback(null);
                    }
                    
                    // configure firewall rules
                    var firewallRules = null;

                    if (!_.isUndefined(reqParams.mysqlServerParameters)) {
                        if (!_.isUndefined(reqParams.mysqlServerParameters.allowMysqlServerFirewallRules)) {
                            firewallRules = reqParams.mysqlServerParameters.allowMysqlServerFirewallRules;
                        }
                    }
                    if (firewallRules === null) {
                        ++provisioningResult.provisionStage;
                        return callback(null);
                    }
                    
                    var n = firewallRules.length;
                    var i = 0;
                    async.whilst(
                        function() {
                            return i < n;
                        },
                        function(cb) {
                            var firewallRuleName = firewallRules[i]['ruleName'];
                            var firewallRuleStartIp = firewallRules[i]['startIpAddress'];
                            var firewallRuleEndIp = firewallRules[i]['endIpAddress'];
                            log.info('mysqldb cmd-poll: create the server-level firewall rules, index: %s, rule name: %s, start IP address: %s, end IP address: %s', i, firewallRuleName, firewallRuleStartIp, firewallRuleEndIp);
                            mysqldbOperations.createFirewallRule(firewallRuleName, firewallRuleStartIp, firewallRuleEndIp, function (err, res) {
                                if (err) {
                                    log.error('mysqldb cmd-poll: create firewall rule: err: %j', err);
                                    return cb(err);
                                } else if ((res.statusCode === HttpStatus.OK) || (res.statusCode === HttpStatus.ACCEPTED)) {
                                    log.info('mysqldb cmd-poll: create firewall rule: rule created');
                                    ++i;
                                    cb(null);
                                } else {
                                    log.error('mysqldb cmd-poll: create firewall rule, unexpected error: res: %j', res);
                                    return cb(Error(res.body.message));
                                }
                            });
                        },
                        function(err) {
                            if (err) {
                                return callback(err);
                            }
                            ++provisioningResult.provisionStage;
                            return callback(null);
                        }
                    );
                },
                function (callback) {
                    if (provisioningResult.provisionStage !== 2) {
                        return callback(null);
                    }
                    
                    // create database
                    log.info('mysqldb cmd-poll: create the database');
                    mysqldbOperations.createDatabase(true, function (err, res) {
                        if (err) {
                            log.error('mysqldb cmd-poll: create mysql database: err: %j', err);
                            callback(err);
                        } else {
                            log.info('mysqldb cmd-poll: create mysql database: res: %j', res);

                            reply.state = 'succeeded';
                            reply.description = 'Created database ' + reqParams.mysqldbName + ' on server ' + reqParams.mysqlServerName + '.';
                            ++provisioningResult.provisionStage;
                            callback(null);
                        }
                    });
                }
            ], function (err) {
                next(err, result);
            });
        } else if (lastoperation === 'deprovision') {
            mysqldbOperations.setConnectionConfig(
                provisioningResult.fullyQualifiedDomainName,
                provisioningResult.administratorLogin,
                provisioningResult.administratorLoginPassword
            );
            mysqldbOperations.getDatabase(true, function (err, dbs) {
                if (err) {
                    log.error('mysqldb cmd-poll: check existence of mysql database: err: %j', err);
                    next(err);
                } else {
                    log.info('mysqldb cmd-poll: check existence of mysql database: %j\nlastoperation: %s', dbs, lastoperation);
                    if (dbs.length !== 0) {
                        reply.state = 'in progress';
                        reply.description = 'Deleting the database.';
                    } else {
                        reply.state = 'succeeded';
                        reply.description = 'Database has been deleted.';
                    }
                    result.value = reply;
                    next(null, result);
                }
            });
        }
    };

};

module.exports = mysqldbPoll;


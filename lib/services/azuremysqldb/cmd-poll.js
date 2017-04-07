/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var async = require('async');
var HttpStatus = require('http-status-codes');
var util = require('util');
var Config = require('./service');
var common = require('../../common');
var log = common.getLogger(Config.name);

var sqldbPoll = function (params) {

    var reqParams = params.parameters || {};
    var provisioningResult = JSON.parse(params.provisioning_result);    
    var lastoperation = params.last_operation || '';
    var resourceGroupName = provisioningResult.resourceGroup || '';
    var mysqlServerName = reqParams.mysqlServerName || '';
    
    log.info(util.format('mysqldb cmd-poll: resourceGroupName: %s, mysqlServerName: %s', resourceGroupName, mysqlServerName));

    this.poll = function (sqldbOperations, next) {

        sqldbOperations.setParameters(resourceGroupName, mysqlServerName);
        
        var reply = {
            state: '',
            description: ''
        };

        if (lastoperation === 'provision') {
            async.waterfall([
                function (callback) {
                    // get status of server
                    log.info('mysqldb cmd-poll: async.waterfall/check existence of server');
                    sqldbOperations.getServer(function (err, result) {
                        if (err) {
                            log.error('mysqldb cmd-poll: async.waterfall/check existence of mysql server: err: %j', err);
                            callback(err);
                        } else {
                            log.info('mysqldb cmd-poll: async.waterfall/check existence of mysql server: result: %j', result);
                            log.info('mysqldb cmd-poll: async.waterfall/check existence of mysql server: lastoperation: %j', lastoperation);
                            if (result.statusCode === HttpStatus.OK && result.body.properties.userVisibleState === 'Ready') {
                                result.body = _.extend(result.body, provisioningResult);
                                reply.state = 'succeeded';
                                reply.description = 'Created logical server ' + reqParams.mysqlServerName + '.';
                            } else if (result.statusCode === HttpStatus.OK || result.statusCode === HttpStatus.NOT_FOUND) { 
                                result.body = provisioningResult;
                                reply.state = 'in progress';
                                reply.description = 'Creating logical server ' + reqParams.mysqlServerName + '.';
                            }
                            result.value = reply;
                            callback(null, result);
                        }
                    });
                },
                function (result, callback) {  // open firewall IP if requested
                    if (result.value.state !== 'succeeded') {
                      return callback(null, result);
                    }
                    var firewallRules = null;

                    if (!_.isUndefined(reqParams.mysqlServerParameters)) {
                        if (!_.isUndefined(reqParams.mysqlServerParameters.allowMysqlServerFirewallRules)) {
                            firewallRules = reqParams.mysqlServerParameters.allowMysqlServerFirewallRules;
                        }
                    }
                    if (firewallRules === null) {
                        return callback(null, result);
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
                            log.info('mysqldb cmd-provision: create the server-level firewall rules, index: %s, rule name: %s, start IP address: %s, end IP address: %s', i, firewallRuleName, firewallRuleStartIp, firewallRuleEndIp);
                            sqldbOperations.createFirewallRule(firewallRuleName, firewallRuleStartIp, firewallRuleEndIp, function (err, res) {
                                if (err) {
                                    log.error('mysqldb cmd-provision: create firewall rule: err: %j', err);
                                    return cb(err);
                                } else if ((res.statusCode === HttpStatus.OK) || (res.statusCode === HttpStatus.CREATED)) {
                                    log.info('mysqldb cmd-provision: create firewall rule: rule created');
                                    ++i;
                                    cb(null);
                                } else {
                                    log.error('mysqldb cmd-provision: create firewall rule, unexpected error: res: %j', res);
                                    return cb(Error(res.body.message));
                                }
                            });
                        },
                        function(err) {
                            callback(err, result);
                        }
                    );
                }
            ], function (err, result) {
                log.debug('mysqldb cmd-poll: async.waterfall/final callback: result: %j', result);
                next(err, result);
            });
        } else if (lastoperation === 'deprovision') {
            sqldbOperations.getServer(function (err, result) {
                if (err) {
                    log.error('mysqldb cmd-poll: async.waterfall/check existence of mysql server: err: %j', err);
                    next(err);
                } else {
                    log.info('mysqldb cmd-poll: async.waterfall/check existence of mysql server: result: %j', result);
                    log.info('mysqldb cmd-poll: async.waterfall/check existence of mysql server: lastoperation: %j', lastoperation);
                    if (result.statusCode === HttpStatus.OK) {
                        reply.state = 'in progress';
                        reply.description = 'Deleting the server.';
                    } else if (result.statusCode === HttpStatus.NOT_FOUND) {
                        reply.state = 'succeeded';
                        reply.description = 'Server has been deleted.';
                    }
                    result.value = reply;
                    next(null, result);
                }
            });
        }
    };

};

module.exports = sqldbPoll;


/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var async = require('async');
var HttpStatus = require('http-status-codes');
var util = require('util');

var sqldbPoll = function (log, params) {

    var instanceId = params.instance_id;
    var reqParams = params.parameters || {};
    var provisioningResult = JSON.parse(params.provisioning_result);    
    var lastoperation = params.last_operation || '';
    var resourceGroupName = reqParams.resourceGroup || '';
    var sqldbName = reqParams.sqldbName || '';
    var sqlServerName = reqParams.sqlServerName || '';
    var tde = reqParams.transparentDataEncryption || false;
    
    log.info(util.format('sqldb cmd-poll: resourceGroupName: %s, sqldbName: %s, sqlServerName: %s', resourceGroupName, sqldbName, sqlServerName));

    this.poll = function (sqldbOperations, next) {

        sqldbOperations.setParameters(resourceGroupName, sqlServerName, sqldbName);
        
        async.waterfall([
            function (callback) {
                // get status of database
                log.info('sqldb cmd-poll: async.waterfall/check existence of database');
                sqldbOperations.getDatabase(function (err, result) {
                    var reply = {
                        state: '',
                        description: ''
                    };
                    if (err) {
                        log.error('sqldb cmd-poll: async.waterfall/check existence of sql database: err: %j', err);
                        callback(err);
                    } else {
                        log.info('sqldb cmd-poll: async.waterfall/check existence of sql database: result: %j', result);
                        log.info('sqldb cmd-poll: async.waterfall/check existence of sql database: lastoperation: %j', lastoperation);
                        if (lastoperation === 'provision') {
                            if (result.statusCode === HttpStatus.OK) {
                                result.body = _.extend(result.body, provisioningResult);
                                                        
                                reply.state = 'succeeded';
                                reply.description = 'Created logical database ' + reqParams.sqldbName + ' on logical server ' + reqParams.sqlServerName + '.';
                            } else if (result.statusCode === HttpStatus.NOT_FOUND) { 
                                result.body = provisioningResult;
                                        
                                reply.state = 'in progress';
                                reply.description = 'Creating logical database ' + reqParams.sqldbName + ' on logical server ' + reqParams.sqlServerName + '.';
                            }
                        } else if (lastoperation === 'deprovision') {
                            if (result.statusCode === HttpStatus.OK) {
                                reply.state = 'in progress';
                                reply.description = 'Deleting the database.';
                            } else if (result.statusCode === HttpStatus.NOT_FOUND) {
                                reply.state = 'succeeded';
                                reply.description = 'Database has been deleted.';
                            }
                        }
                        result.value = reply;
                        callback(null, result);
                    }
                });
            },
            function(result, callback) {   // Set Transparent data encryption  
                if ( lastoperation === 'provision' && result.value.state === 'succeeded' && tde === true){
                    log.info('sqldb cmd-poll: async.waterfall/Set transparent data encryption: Enabled');
                    sqldbOperations.setTransparentDataEncryption(function (err, tdeResult) {
                        if (err) {
                            callback(err);
                        } else if (tdeResult.statusCode === HttpStatus.OK || tdeResult.statusCode === HttpStatus.CREATED) {
                            log.info('sqldb cmd-poll: async.waterfall/setTransparentDataEncryption: success');
                            callback(null, result);
                        } else {
                            log.error('sqldb cmd-poll: async.waterfall/setTransparentDataEncryption, unexpected error: tdeResult: %j', tdeResult);
                            callback(Error(tdeResult.body.message));
                        }
                    });
                } else {
                    callback(null, result);
                }
            }
        ], function (err, result) {
            log.debug('sqldb cmd-poll: async.waterfall/final callback: result: %j', result);
            next(err, result);
        });
    };

};

module.exports = sqldbPoll;


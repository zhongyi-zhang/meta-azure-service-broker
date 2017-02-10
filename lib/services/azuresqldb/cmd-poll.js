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
    
    log.info(util.format('sqldb cmd-poll: resourceGroupName: %s, sqldbName: %s, sqlServerName: %s', resourceGroupName, sqldbName, sqlServerName));

    this.poll = function (sqldbOperations, next) {

        sqldbOperations.setParameters(resourceGroupName, sqlServerName, sqldbName);
        
        // get status of database
        log.info('sqldb cmd-poll: check existence of database');
        sqldbOperations.getDatabase(function (err, result) {
            var reply = {
                state: '',
                description: ''
            };
            if (err) {
                log.error('sqldb cmd-poll: check existence of sql database: err: %j', err);
                next(err);
            } else {
                log.info('sqldb cmd-poll: check existence of sql database: result: %j', result);
                log.info('sqldb cmd-poll: check existence of sql database: lastoperation: %j', lastoperation);
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
                next(null, result);
            }
        });
    };

};

module.exports = sqldbPoll;


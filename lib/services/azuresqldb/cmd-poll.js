/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var async = require('async');
var HttpStatus = require('http-status-codes');
var util = require('util');

var sqldbPoll = function (log, params) {

    var instanceId = params.instance_id;
    var reqParams = params.parameters || {};
    var lastoperation = params.last_operation || '';
    var resourceGroupName = reqParams.resourceGroup || '';
    var sqldbName = reqParams.sqldbName || '';
    var sqlServerName = reqParams.sqlServerName || '';

    log.info(util.format('sqldb cmd-poll: resourceGroupName: %s, sqldbName: %s, sqlServerName: %s', resourceGroupName, sqldbName, sqlServerName));

    var parametersDefined = !(_.isNull(reqParams.parameters) || _.isUndefined(reqParams.parameters));

    var location = '';
    if (parametersDefined)
        location = reqParams.parameters.location || '';

    this.poll = function (sqldbOperations, callback) {

        var groupParameters = {
            location: location
        };

        sqldbOperations.setParameters(resourceGroupName, sqlServerName, sqldbName);
        var reply = {
            state: '',
            description: ''
        };
                    
        if (lastoperation === 'provision') {
            // get status of database
            log.info('sqldb cmd-poll: async.waterfall/check existence of database: provision');
            sqldbOperations.getDatabase(function (err, result) {
                if (err) {
                    log.error('sqldb cmd-poll: async.waterfall/check existence of sql database: err: %j', err);
                    return callback(err);
                }
                log.info('sqldb cmd-poll: async.waterfall/check existence of sql database: result: %j', result);
                if (result.statusCode === HttpStatus.OK) {

                    result.body.sqlServerName = reqParams.sqlServerName;
                    result.body.administratorLogin = reqParams.sqlServerParameters.properties.administratorLogin;
                    result.body.administratorLoginPassword = reqParams.sqlServerParameters.properties.administratorLoginPassword;
                                
                    reply.state = 'succeeded';
                    reply.description = 'Created logical database ' + reqParams.sqldbName + ' on logical server ' + reqParams.sqlServerName + '.';
                } else if (result.statusCode === HttpStatus.NOT_FOUND) { 

                    reply.state = 'in progress';
                    reply.description = 'Creating logical database ' + reqParams.sqldbName + ' on logical server ' + reqParams.sqlServerName + '.';
                }
                result.value = reply;
                callback(null, result);
            });
        } else if (lastoperation === 'deprovision') {
          
             log.info('sqldb cmd-poll: async.waterfall/check existence of sql server: deprovision');
             sqldbOperations.getServer(function (err, result) {
                 if (err) {
                     log.error('sqldb cmd-poll: async.waterfall/check existence of sql server: err: %j', err);
                     return callback(err);
                 }
                 log.info('sqldb cmd-poll: async.waterfall/check existence of sql server: result: %j', result);
                 if (result.statusCode === HttpStatus.OK) {
                     reply.state = 'in progress';
                     reply.description = 'Deleting the server.';
                 } else if (result.statusCode === HttpStatus.NOT_FOUND) {
                     reply.state = 'succeeded';
                     reply.description = 'Server has been deleted.';
                 }
                 result.value = reply;
                 callback(null, result);
             });
        }

    };

};

module.exports = sqldbPoll;


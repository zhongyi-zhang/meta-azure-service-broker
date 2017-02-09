/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var uuid = require('node-uuid');
var HttpStatus = require('http-status-codes');
var request = require('request');
var async = require('async');
var util = require('util');
var common = require('../../common/');
var msRestRequest = require('../../common/msRestRequest');

var API_VERSIONS;

var sqldbOperations = function (log, azure) {
    this.log = log;
    this.azure = azure;

    var environmentName = azure.environment;
    var environment = common.getEnvironment(environmentName);
    this.resourceManagerEndpointUrl = environment.resourceManagerEndpointUrl;

    API_VERSIONS = common.API_VERSION[environmentName];

    log.info('sqldb client CTOR');

};

sqldbOperations.prototype.setParameters = function (resourceGroupName, sqlServerName, sqldbName) {

    this.serverUrl = util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Sql/servers/%s',
        this.resourceManagerEndpointUrl, this.azure.subscriptionId, resourceGroupName, sqlServerName);
    this.sqldbUrl = util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Sql/servers/%s/databases/%s',
        this.resourceManagerEndpointUrl, this.azure.subscriptionId, resourceGroupName, sqlServerName, sqldbName);
    this.firewallRuleUrl = util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Sql/servers/%s/firewallRules/',
        this.resourceManagerEndpointUrl, this.azure.subscriptionId, resourceGroupName, sqlServerName);

    this.sqlServerName = sqlServerName;
    this.sqldbName = sqldbName;
    this.resourceType = 'Microsoft.Sql/servers/databases';

    this.id = util.format('subscriptions/%s/resourceGroups/%s/providers/Microsoft.Sql/servers/%s/databases/%s',
        this.azure.subscriptionId, resourceGroupName, sqlServerName, sqldbName);

    this.standardHeaders = {
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept': 'application/json'
    };

};

sqldbOperations.prototype.createFirewallRule = function (ruleName, startIpAddress, endIpAddress, callback) {

    var that = this;

    var data = {
      properties: {
        startIpAddress: startIpAddress,
        endIpAddress: endIpAddress
      }
    };
    
    var headers = common.mergeCommonHeaders(that.log, 'sqldb client - createFirewallRule', that.standardHeaders);
    msRestRequest.PUT(that.firewallRuleUrl + ruleName, headers, data, API_VERSIONS.SQL, msRestRequest.USE_SP, function (err, res, body) {
        
        common.logHttpResponse(that.log, res, 'Create SQL server firewall rules', true);
    
        var result = {};
        result.statusCode = res.statusCode;

        if (err) {
            that.log.info('sqldb client: createFirewallRule: err %j', err);
            callback(err, null);
        } else if (res.statusCode === HttpStatus.OK) {
            callback(null, result);
        } else {
            that.log.info('sqldb client: createFirewallRule: body: %j', body);
            result.body = body;
            callback(null, result);
        }

    });
};

sqldbOperations.prototype.getServer = function (callback) {

    var that = this;

    var headers = common.mergeCommonHeaders(that.log, 'sqldb client - getServer', that.standardHeaders);
    msRestRequest.GET(that.serverUrl, headers, API_VERSIONS.SQL, msRestRequest.USE_SP, function (err, res, body) {

        common.logHttpResponse(that.log, res, 'Get SQL server', true);
        
        var result = {};
        result.statusCode = res.statusCode;

        if (err) {
            that.log.info('sqldb client: getServer: err %j', err);
            callback(err, null);
        } else if (res.statusCode == HttpStatus.NOT_FOUND) {
            that.log.info('sqldb client: getServer: NotFound');
            callback(null, result);
        } else {  // this includes OK and anything else besides NOT_FOUND
            that.log.info('sqldb client: getServer: body: %j', body);
            result.body = body;
            callback(null, result);
        }
    });

};

sqldbOperations.prototype.createServer = function (parameters, callback) {

    var that = this;

    // create local object in case firewall rules are present
    var sqlServerParameters = {};
    sqlServerParameters.tags = common.mergeTags(parameters.sqlServerParameters.tags);
    sqlServerParameters.location = parameters.location;
    sqlServerParameters.properties = parameters.sqlServerParameters.properties;

    var headers = common.mergeCommonHeaders(that.log, 'sqldb client - createServer', that.standardHeaders);
    msRestRequest.PUT(that.serverUrl, headers, sqlServerParameters, API_VERSIONS.SQL, msRestRequest.USE_SP, function (err, res, body) {

        common.logHttpResponse(that.log, res, 'Create SQL server', false);

        var result = {};
        result.statusCode = res.statusCode;

        if (err) {
            that.log.info('sqldb client: createServer: err %j', err);
            callback(err, null);
        } else if (result.statusCode != HttpStatus.CREATED) {
            var e = new Error();
            e.statusCode = result.statusCode;
            e.code = body.code;
            e.message = body.message;
            callback(e, null);
        } else {
            that.log.info('sqldb client: createServer: body: %j', body);
            result.body = body;
            callback(null, result);
        }
    });

};

sqldbOperations.prototype.deleteServer = function (callback) {

    var that = this;

    var headers = common.mergeCommonHeaders(that.log, 'sqldb client - getServer', that.standardHeaders);
    msRestRequest.DELETE(that.serverUrl, headers, API_VERSIONS.SQL, msRestRequest.USE_SP, function (err, res, body) {

        common.logHttpResponse(that.log, res, 'Delete SQL server', true);

        if (err) {
            that.log.info('sqldb client: deleteServer: err %j', err);
            callback(err);
        } else if (res.statusCode == HttpStatus.OK || res.statusCode == HttpStatus.NO_CONTENT) {
            that.log.info('sqldb client: deleteServer: success');
            callback(null);
        } else {
            that.log.info('sqldb client: deleteServer: err %j', body);
            var e = new Error(body);
            e.statusCode = res.statusCode;
            callback(e);
        }
    });

};

sqldbOperations.prototype.getDatabase = function (callback) {

    var that = this;

    var headers = common.mergeCommonHeaders(that.log, 'sqldb client - getDatabase', that.standardHeaders);
    msRestRequest.GET(that.sqldbUrl, headers, API_VERSIONS.SQL, msRestRequest.USE_SP, function (err, res, body) {

        common.logHttpResponse(that.log, res, 'Get SQL database', true);
        
        var result = {};
        result.statusCode = res.statusCode;

        if (err) {
            that.log.info('sqldb client: getDatabase: err %j', err);
            callback(err, null);
        } else if (res.statusCode == HttpStatus.NOT_FOUND) {
            that.log.info('sqldb client: getDatabase: NotFound');
            callback(null, result);
        } else { // this includes OK and anything else besides NOT_FOUND
            that.log.info('sqldb client: getDatabase: body: %j', body);
            result.body = JSON.parse(body);
            callback(null, result);
        }
    });

};

sqldbOperations.prototype.createDatabase = function (parameters, callback) {

    var that = this;

    parameters.sqldbParameters.tags = common.mergeTags(parameters.sqldbParameters.tags);
    parameters.sqldbParameters.location = parameters.location;

    var headers = common.mergeCommonHeaders(that.log, 'sqldb client - createDatabase', that.standardHeaders);
    msRestRequest.PUT(that.sqldbUrl, headers, parameters.sqldbParameters, API_VERSIONS.SQL, msRestRequest.USE_SP, function (err, res, body) {

        common.logHttpResponse(that.log, res, 'Create SQL database', true);
        
        var result = {};
        result.statusCode = res.statusCode;

        if (err) {
            that.log.info('sqldb client: createDatabase: err %j', err);
            callback(err, null);
        } else if (result.statusCode != HttpStatus.ACCEPTED) {
            var e = new Error();
            e.statusCode = result.statusCode;
            e.code = body.code;
            e.message = body.message;
            callback(e, null);
        } else {
            that.log.info('sqldb client: createDatabase: body: %j', body);
            result.body = body;
            callback(null, result);
        }
    });

};

module.exports = sqldbOperations;

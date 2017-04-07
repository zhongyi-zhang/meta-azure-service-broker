/* jshint camelcase: false */
/* jshint newcap: false */

var HttpStatus = require('http-status-codes');
var util = require('util');
var common = require('../../common/');
var msRestRequest = require('../../common/msRestRequest');
var resourceGroup = require('../../common/resourceGroup-client');
var Config = require('./service');
var log = common.getLogger(Config.name);

var API_VERSIONS;

var sqldbOperations = function (azure) {
    this.azure = azure;

    var environmentName = azure.environment;
    var environment = common.getEnvironment(environmentName);
    this.resourceManagerEndpointUrl = environment.resourceManagerEndpointUrl;

    API_VERSIONS = common.API_VERSION[environmentName];

    log.info('mymysqldb client CTOR');

};

sqldbOperations.prototype.setParameters = function (resourceGroupName, mysqlServerName) {

    this.serverUrl = util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.DBforMySQL/servers/%s',
        this.resourceManagerEndpointUrl, this.azure.subscriptionId, resourceGroupName, mysqlServerName);
    this.firewallRuleUrl = util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.DBforMySQL/servers/%s/firewallRules/',
        this.resourceManagerEndpointUrl, this.azure.subscriptionId, resourceGroupName, mysqlServerName);

    this.mysqlServerName = mysqlServerName;

    this.standardHeaders = {
        'Content-Type': 'application/json; charset=UTF-8'
    };

};

sqldbOperations.prototype.createResourceGroup = function (resourceGroupName, groupParameters, callback) {

    var that = this;

    resourceGroup.createOrUpdate(
        'SqlDb',
        that.azure,
        resourceGroupName,
        groupParameters,
        callback
    );
};

sqldbOperations.prototype.createFirewallRule = function (ruleName, startIpAddress, endIpAddress, callback) {

    var that = this;

    var data = {
        properties: {
            startIpAddress: startIpAddress,
            endIpAddress: endIpAddress
        }
    };

    var headers = common.mergeCommonHeaders('mysqldb client - createFirewallRule', that.standardHeaders);
    msRestRequest.PUT(that.firewallRuleUrl + ruleName, headers, data, API_VERSIONS.MYSQL, function (err, res, body) {
        if (err) {
            log.error('mymysqldb client: createFirewallRule: err %j', err);
            return callback(err, null);
        }
        
        common.logHttpResponse(res, 'Create MySQL server firewall rules', true);
    
        var result = {};
        result.statusCode = res.statusCode;

        if (res.statusCode === HttpStatus.ACCEPTED) {
            callback(null, result);
        } else {
            log.info('mymysqldb client: createFirewallRule: body: %j', body);
            result.body = body;
            callback(null, result);
        }

    });
};

sqldbOperations.prototype.getServer = function (callback) {

    var that = this;

    var headers = common.mergeCommonHeaders('mysqldb client - getServer', that.standardHeaders);
    msRestRequest.GET(that.serverUrl, headers, API_VERSIONS.MYSQL, function (err, res, body) {
        if (err) {
            log.error('mymysqldb client: getServer: err %j', err);
            return callback(err, null);
        }
        
        common.logHttpResponse(res, 'mysqldb client - getServer', true);
        
        var result = {};
        result.statusCode = res.statusCode;

        if (res.statusCode == HttpStatus.NOT_FOUND) {
            log.info('mymysqldb client: getServer: NotFound');
            callback(null, result);
        } else {  // this includes OK and anything else besides NOT_FOUND
            log.info('mymysqldb client: getServer: body: %j', body);
            result.body = JSON.parse(body);
            callback(null, result);
        }
    });

};

sqldbOperations.prototype.createServer = function (parameters, callback) {

    var that = this;

    // create local object in case firewall rules are present
    var mysqlServerParameters = {};
    mysqlServerParameters.tags = common.mergeTags(parameters.mysqlServerParameters.tags);
    mysqlServerParameters.location = parameters.location;
    mysqlServerParameters.sku = parameters.sku;
    mysqlServerParameters.properties = parameters.mysqlServerParameters.properties;

    var headers = common.mergeCommonHeaders('mysqldb client - createServer', that.standardHeaders);
    msRestRequest.PUT(that.serverUrl, headers, mysqlServerParameters, API_VERSIONS.MYSQL, function (err, res, body) {
        if (err) {
            log.error('mymysqldb client: createServer: err %j', err);
            return callback(err);
        }
        
        common.logHttpResponse(res, 'Create MySQL server', true);

        var result = {};
        result.statusCode = res.statusCode;

        if (result.statusCode != HttpStatus.ACCEPTED) {
            return common.formatErrorFromRes(res, callback);
        } else {
            log.debug('mymysqldb client: createServer: body: %j', body);
            callback(null);
        }
    });

};

sqldbOperations.prototype.deleteServer = function (callback) {

    var that = this;

    var headers = common.mergeCommonHeaders('mysqldb client - deleteServer', that.standardHeaders);
    msRestRequest.DELETE(that.serverUrl, headers, API_VERSIONS.MYSQL, function (err, res, body) {
        if (err) {
            log.error('mymysqldb client: deleteServer: err %j', err);
            return callback(err, null);
        }
        
        common.logHttpResponse(res, 'Delete MySQL server', true);

        var result = {};
        result.statusCode = res.statusCode;

        if (result.statusCode != HttpStatus.ACCEPTED) {
            return common.formatErrorFromRes(res, callback);
        } else {
            log.debug('mymysqldb client: deleteServer: body: %j', body);
            result.body = body;
            callback(null, result);
        }
    });

};

module.exports = sqldbOperations;

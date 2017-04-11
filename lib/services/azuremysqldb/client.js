/* jshint camelcase: false */
/* jshint newcap: false */

var HttpStatus = require('http-status-codes');
var util = require('util');
var common = require('../../common/');
var msRestRequest = require('../../common/msRestRequest');
var resourceGroup = require('../../common/resourceGroup-client');
var mysql = require('mysql2');
var Config = require('./service');
var log = common.getLogger(Config.name);

var API_VERSIONS;

var mysqldbOperations = function (azure) {
    this.azure = azure;

    var environmentName = azure.environment;
    var environment = common.getEnvironment(environmentName);
    this.resourceManagerEndpointUrl = environment.resourceManagerEndpointUrl;

    API_VERSIONS = common.API_VERSION[environmentName];

    log.info('mysqldb client CTOR');

};

mysqldbOperations.prototype.setParameters = function (resourceGroupName, mysqlServerName, mysqldbName) {

    this.serverUrl = util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.DBforMySQL/servers/%s',
        this.resourceManagerEndpointUrl, this.azure.subscriptionId, resourceGroupName, mysqlServerName);
    this.firewallRuleUrl = util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.DBforMySQL/servers/%s/firewallRules/',
        this.resourceManagerEndpointUrl, this.azure.subscriptionId, resourceGroupName, mysqlServerName);

    this.mysqlServerName = mysqlServerName;
    this.mysqldbName = mysqldbName;

    this.standardHeaders = {
        'Content-Type': 'application/json; charset=UTF-8'
    };

};

mysqldbOperations.prototype.setConnectionConfig = function (serverDomainName, adminLogin, adminLoginPassword) {

    this.connectionConfig = {
        host: serverDomainName,
        user: util.format('%s@%s', adminLogin, this.mysqlServerName),
        password: adminLoginPassword,
        database: 'mysql',
        port: 3306
    };

};

mysqldbOperations.prototype.createResourceGroup = function (resourceGroupName, groupParameters, callback) {

    var that = this;

    resourceGroup.createOrUpdate(
        'mysqlDb',
        that.azure,
        resourceGroupName,
        groupParameters,
        callback
    );
};

mysqldbOperations.prototype.createFirewallRule = function (ruleName, startIpAddress, endIpAddress, callback) {

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
            log.error('mysqldb client: createFirewallRule: err %j', err);
            return callback(err);
        }
        
        common.logHttpResponse(res, 'Create MySQL server firewall rules', true);
    
        var result = {};
        result.statusCode = res.statusCode;
        callback(null, result);

    });
};

mysqldbOperations.prototype.deleteFirewallRule = function (ruleName, callback) {

    var that = this;

    var headers = common.mergeCommonHeaders('mysqldb client - deleteFirewallRule', that.standardHeaders);
    msRestRequest.DELETE(that.firewallRuleUrl + ruleName, headers, API_VERSIONS.MYSQL, function (err, res, body) {
        if (err) {
            log.error('mysqldb client: deleteFirewallRule: err %j', err);
            return callback(err);
        }
        
        common.logHttpResponse(res, 'Delete MySQL server firewall rules', true);
    
        var result = {};
        result.statusCode = res.statusCode;

        if (res.statusCode === HttpStatus.ACCEPTED || res.statusCode === HttpStatus.NO_CONTENT) {
            callback(null);
        } else {
            result.body = body;
            log.error('mysqldb client: deleteFirewallRule: err: %j', result);
            callback(result);
        }

    });
};

mysqldbOperations.prototype.executeSql = function (config, sql, isDeleteFirewallRuleAfter, callback) {

    var that = this;
    
    var tempFirewallRuleName = 'broker-temp-rule-' + that.mysqldbName;
    
    log.info('mysqldb: Connecting to database %s on server %s ...', config.database, config.host);
    var conn = mysql.createConnection(config);
    conn.connect(function(err) {
        if (err) {
            if (err.message.startsWith('Client with IP address')) {
                log.info('mysqldb: failed to login server: %s', err);
                log.info('mysqldb: It is going to create a temp firewall rule');
                
                //example message: 'Client with IP address xxx.xxx.xxx.xx is not allowed to access the server.'
                var runnerIpPrefix = err.message.match(/\d+\.\d+\.\d+\./)[0];

                return that.createFirewallRule(tempFirewallRuleName, runnerIpPrefix + '0', runnerIpPrefix + '255', function(err, result){
                    if (err) {
                        log.error('mysqldb: create temp firewall rule: err: %j', err);
                        callback(err);
                    } else if ((result.statusCode === HttpStatus.OK) || (result.statusCode === HttpStatus.ACCEPTED)) {
                        log.info('mysqldb: create temp firewall rule: rule created');
                        that.executeSql(config, sql, isDeleteFirewallRuleAfter, callback);
                    } else {
                        log.error('mysqldb: create temp firewall rule, unexpected error: %j', result);
                        callback(result);
                    }
                });
            }

            log.error('mysqldb client: connect to server: err %j', err);
            return callback(err);
        }

        log.info('mysqldb: Connect to database %s on server %s: succeed.', config.database, config.host);
        log.info('mysqldb: It is going to execute sql: %s', sql);
        conn.query(sql, function(err, results) {
            conn.end();
            if (err) {
                return callback(err);
            }
            
            log.info('mysqldb: executed sql: %s', sql);
            
            if (isDeleteFirewallRuleAfter) {
                that.deleteFirewallRule(tempFirewallRuleName, function(err){
                    if (err) {
                        log.error('mysqldb: delete temp firewall rule: err: %j', err);
                        return callback(err);
                    }
                    log.info('mysqldb: delete temp firewall rule: rule deleted');
                    callback(null, results);
                });
            } else callback(null, results);
        });
    });
};

mysqldbOperations.prototype.createUser = function (databaseLogin, databaseLoginPassword, isDeleteFirewallRuleAfter, callback) {
  
  var that = this;
  
  var config = that.connectionConfig;
  
  var sql = util.format('CREATE USER \'%s\'@\'%\' IDENTIFIED BY \'%s\'', databaseLogin, databaseLoginPassword);
  
  that.executeSql(config, sql, isDeleteFirewallRuleAfter, callback);
};

mysqldbOperations.prototype.dropUser = function (databaseLogin, isDeleteFirewallRuleAfter, callback) {
  
  var that = this;
  
  var config = that.connectionConfig;
  
  var sql = util.format('DROP USER \'%s\'@\'%\'', databaseLogin);
  
  that.executeSql(config, sql, isDeleteFirewallRuleAfter, callback);
};

mysqldbOperations.prototype.grantPriviledgesToUser = function (databaseLogin, isDeleteFirewallRuleAfter, callback) {
  
  var that = this;
  
  var config = that.connectionConfig;
  
  var sql = util.format('GRANT ALL PRIVILEGES ON `%s`.* TO \'%s\'@\'%\'', that.mysqldbName, databaseLogin);
  
  that.executeSql(config, sql, isDeleteFirewallRuleAfter, callback);
};

mysqldbOperations.prototype.getDatabase = function (isDeleteFirewallRuleAfter, callback) {

  var that = this;
  
  var config = that.connectionConfig;
  
  var sql = util.format('SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = \'%s\'', that.mysqldbName);
  
  that.executeSql(config, sql, isDeleteFirewallRuleAfter, callback);

};

mysqldbOperations.prototype.createDatabase = function (isDeleteFirewallRuleAfter, callback) {

  var that = this;
  
  var config = that.connectionConfig;
  
  var sql = util.format('CREATE DATABASE `%s`', that.mysqldbName);
  
  that.executeSql(config, sql, isDeleteFirewallRuleAfter, callback);


};

mysqldbOperations.prototype.deleteDatabase = function (isDeleteFirewallRuleAfter, callback) {

  var that = this;
  
  var config = that.connectionConfig;
  
  var sql = util.format('DROP DATABASE `%s`', that.mysqldbName);
  
  that.executeSql(config, sql, isDeleteFirewallRuleAfter, callback);

};

mysqldbOperations.prototype.getServer = function (callback) {

    var that = this;

    var headers = common.mergeCommonHeaders('mysqldb client - getServer', that.standardHeaders);
    
    msRestRequest.GET(that.serverUrl, headers, API_VERSIONS.MYSQL, function (err, res, body) {
        if (err) {
            log.error('mysqldb client: getServer: err %j', err);
            return callback(err, null);
        }
        
        common.logHttpResponse(res, 'mysqldb client - getServer', true);
        
        var result = {};
        result.statusCode = res.statusCode;

        if (res.statusCode == HttpStatus.NOT_FOUND) {
            log.info('mysqldb client: getServer: NotFound');
            callback(null, result);
        } else {  // this includes OK and anything else besides NOT_FOUND
            log.info('mysqldb client: getServer: body: %j', body);
            result.body = JSON.parse(body);
            callback(null, result);
        }
    });

};

mysqldbOperations.prototype.createServer = function (parameters, callback) {

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
            log.error('mysqldb client: createServer: err %j', err);
            return callback(err);
        }
        
        common.logHttpResponse(res, 'Create MySQL server', true);

        var result = {};
        result.statusCode = res.statusCode;

        if (result.statusCode != HttpStatus.ACCEPTED) {
            return common.formatErrorFromRes(res, callback);
        } else {
            log.debug('mysqldb client: createServer: body: %j', body);
            callback(null);
        }
    });

};

module.exports = mysqldbOperations;

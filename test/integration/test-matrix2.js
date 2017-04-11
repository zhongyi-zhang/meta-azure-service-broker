var uuid = require('uuid');
var util = require('util');
var _ = require('underscore');
var common = require('../../lib/common');

var supportedEnvironments = require('../utils/supportedEnvironments');

var testMatrix = [];
var instanceId;
var bindingId;

var environment = process.env['ENVIRONMENT'];
if (!_.has(supportedEnvironments, environment)) {
  throw new Error(util.format('The test does not support %s', environment));
}

//sqldb
var sqlServerName, sqldbName, azuresqldb, administratorLogin, administratorLoginPassword;

var servers = common.getConfigurations().accountPool.sqldb;
for (var server in servers) {
  if (servers.hasOwnProperty(server)) {
    sqlServerName = server;
    administratorLogin = servers[server]['administratorLogin'];
    administratorLoginPassword = servers[server]['administratorLoginPassword'];
  }
}

instanceId = uuid.v4();
bindingId = uuid.v4();
sqldbName = 'cf' + instanceId;
azuresqldb = {
  serviceName: 'azure-sqldb',
  serviceId: 'fb9bc99e-0aa9-11e6-8a8a-000d3a002ed5',
  planId: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    'sqlServerName': sqlServerName,
    'sqldbName': sqldbName,
    'transparentDataEncryption': true,
    'sqldbParameters': {
      'properties': {
        'collation': 'SQL_Latin1_General_CP1_CI_AS'
      },
      'tags': {
        'foo': 'bar'
      }
    }
  },
  envProvisioningParameters: {
    administratorLogin: administratorLogin,
    administratorLoginPassword: administratorLoginPassword
  },
  bindingParameters: {},
  credentials: {
    'databaseLogin': '<string>',
    'databaseLoginPassword': '<string>',
    'sqlServerName': sqlServerName,
    'sqlServerFullyQualifiedDomainName': '<string>',
    'sqldbName': sqldbName,
    'jdbcUrl': '<string>',
    'jdbcUrlForAuditingEnabled': '<string>'
  },
  e2e: true
};
testMatrix.push(azuresqldb);

// mysqldb
var mysqlServerName, mysqldbName, azuremysqldb, administratorLogin, administratorLoginPassword;

var servers = common.getConfigurations().accountPool.mysqldb;
for (var server in servers) {
  if (servers.hasOwnProperty(server)) {
    mysqlServerName = server;
    administratorLogin = servers[server]['administratorLogin'];
    administratorLoginPassword = servers[server]['administratorLoginPassword'];
  }
}

instanceId = uuid.v4();
bindingId = uuid.v4();
mysqldbName = 'cf' + instanceId;
azuremysqldb = {
  serviceName: 'azure-mysqldb',
  serviceId: 'e40b3635-01bc-4262-b2c5-0847bd7ab43b',
  planId: 'd8d5cac9-d975-48ea-9ac4-8232f92bcb93',
  instanceId: instanceId,
  bindingId: bindingId,
  provisioningParameters: {
    'mysqlServerName': mysqlServerName,
    'mysqldbName': mysqldbName
  },
  envProvisioningParameters: {
    administratorLogin: administratorLogin,
    administratorLoginPassword: administratorLoginPassword
  },
  bindingParameters: {},
  credentials: {
    'databaseLogin': '<string>',
    'databaseLoginPassword': '<string>',
    'mysqlServerName': mysqlServerName,
    'mysqlServerFullyQualifiedDomainName': '<string>',
    'mysqldbName': mysqldbName,
    'jdbcUrl': '<string>'
  },
  e2e: true
};
testMatrix.push(azuremysqldb);

module.exports = testMatrix;
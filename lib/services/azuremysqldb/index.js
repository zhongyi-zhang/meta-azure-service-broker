/* jshint camelcase: false */
/* jshint newcap: false */

'use strict';

var util = require('util');
var HttpStatus = require('http-status-codes');
var Config = require('./service');
var common = require('../../common/');
var log = common.getLogger(Config.name);
var cmdDeprovision = require('./cmd-deprovision');
var cmdProvision = require('./cmd-provision');
var cmdPoll = require('./cmd-poll');
var sqldbOperations = require('./client');

var Handlers = {};

Handlers.generateAzureInstanceId = function(params) {
  return Config.name + '-' + params.parameters['mysqlServerName'];
};

Handlers.catalog = function (params, next) {
  var reply = Config;
  next(null, reply);
};

Handlers.provision = function (params, next) {

  log.debug('MySqlDb/index/provision/params: %j', params);
  
  var cp = new cmdProvision(params);
  log.info('mysqldb index: cmdProvision is newed up');

  var invalidParams = cp.getInvalidParams();
  if (invalidParams.length !== 0) {
    return common.handleServiceErrorEx(HttpStatus.BAD_REQUEST, util.format('Parameter validation failed. Please check your parameters: %s', invalidParams.join(', ')), next);
  }

  var sqldbOps = new sqldbOperations(params.azure);
  log.info('mysqldb index: sqldbOps is newed up');

  cp.provision(sqldbOps, function (err, result) {
    if (err) {
      common.handleServiceError(err, next);
    } else {
      next(null, { statusCode: HttpStatus.ACCEPTED, value: result.value }, result.body);
    }
  });
};

Handlers.deprovision = function (params, next) {

  log.debug('mysqldb/index/deprovision/params: %j', params);

  var cd = new cmdDeprovision(params);
  log.info('mysqldb index: cmdDeprovision is newed up');

  var sqldbOps = new sqldbOperations(params.azure);
  log.info('mysqldb index: sqldbOps is newed up');

  cd.deprovision(sqldbOps, function (err, result) {
    if (err) {
      common.handleServiceError(err, next);
    } else {
      next(null, { statusCode: HttpStatus.OK, value: result }, null);
    }
  });
};

Handlers.poll = function (params, next) {

  log.debug('mysqldb/index/poll/params: %j', params);

  var lastOperation = params.last_operation;
  var cp = new cmdPoll(params);
  var sqldbOps = new sqldbOperations(params.azure);
  log.info('mysqldb index: sqldbOps is newed up');

  cp.poll(sqldbOps, function (err, result) {
    if (err) {
      return common.handleServiceError(err, function(error) {
        next(error, lastOperation);
      });
    } else if (result.statusCode === HttpStatus.OK) {
      next(null, lastOperation, { statusCode: HttpStatus.OK, value: result.value }, result.body);
    } else {
      next(null, lastOperation, { statusCode: result.statusCode, value: result.value }, result.body);
    }
  });

};

Handlers.bind = function (params, next) {

  log.debug('mysqldb/index/bind/params: %j', params);

  var provisioningResult = JSON.parse(params.provisioning_result);
      
  var fqdn = provisioningResult.properties.fullyQualifiedDomainName;
  // Spring Cloud Connector Support
  var jdbcUrlTemplate = 'jdbc:mysql://%s:3306;' + 
                        'database={your_database}';
      
  var jdbcUrl = util.format(jdbcUrlTemplate,
                            fqdn);
                      
  // contents of reply.value winds up in VCAP_SERVICES
  var reply = {
    statusCode: HttpStatus.CREATED,
    code: HttpStatus.getStatusText(HttpStatus.CREATED),
    value: {
      credentials: {
        mysqlServerName: provisioningResult.sqlServerName,
        sqlServerFullyQualifiedDomainName: fqdn,
        administratorLogin: provisioningResult.admidatabaseLogin,
        administratorLoginPassword: provisioningResult.admidatabaseLoginPassword,
        jdbcUrl: jdbcUrl
      }
    }
  };
  next(null, reply, {});

};

Handlers.unbind = function (params, next) {

  log.debug('mysqldb/index/unbind/params: %j', params);
  var reply = {
    statusCode: HttpStatus.OK,
    code: HttpStatus.getStatusText(HttpStatus.OK),
    value: {},
  };
  next(null, reply, {});
};

module.exports = Handlers;

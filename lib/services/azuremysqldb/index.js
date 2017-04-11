/* jshint camelcase: false */
/* jshint newcap: false */

'use strict';

var util = require('util');
var HttpStatus = require('http-status-codes');
var Config = require('./service');
var common = require('../../common/');
var log = common.getLogger(Config.name);
var cmdProvision = require('./cmd-provision');
var cmdDeprovision = require('./cmd-deprovision');
var cmdPoll = require('./cmd-poll');
var cmdBind = require('./cmd-bind');
var cmdUnbind = require('./cmd-unbind');
var mysqldbOperations = require('./client');

var Handlers = {};

Handlers.generateAzureInstanceId = function(params) {
  return Config.name + '-' + params.parameters['mysqlServerName'] + '-' + params.parameters['mysqldbName'];
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

  var mysqldbOps = new mysqldbOperations(params.azure);
  log.info('mysqldb index: mysqldbOps is newed up');

  cp.provision(mysqldbOps, function (err, result) {
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

  var mysqldbOps = new mysqldbOperations(params.azure);
  log.info('mysqldb index: mysqldbOps is newed up');

  cd.deprovision(mysqldbOps, function (err, result) {
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
  var mysqldbOps = new mysqldbOperations(params.azure);
  log.info('mysqldb index: mysqldbOps is newed up');

  cp.poll(mysqldbOps, function (err, result) {
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

  var cb = new cmdBind(params);
  var mysqldbOps = new mysqldbOperations(params.azure);

  cb.bind(mysqldbOps, function (err, result) {
    if (err) {
      common.handleServiceError(err, next);
    } else {
      var reqParams = params.parameters;
      var provisioningResult = params.provisioning_result;

      var fqdn = provisioningResult.fullyQualifiedDomainName;
      
      // Spring Cloud Connector Support
      var jdbcUrlTemplate = 'jdbc:mysql://%s:3306;' + 
                            'database=%s';
      
      var jdbcUrl = util.format(jdbcUrlTemplate,
                                fqdn,
                                provisioningResult.mysqldbName);
                      
      // contents of reply.value winds up in VCAP_SERVICES
      var reply = {
        statusCode: HttpStatus.CREATED,
        code: HttpStatus.getStatusText(HttpStatus.CREATED),
        value: {
          credentials: {
            mysqldbName: reqParams.mysqldbName,
            mysqlServerName: reqParams.mysqlServerName,
            mysqlServerFullyQualifiedDomainName: fqdn,
            databaseLogin: result.databaseLogin,
            databaseLoginPassword: result.databaseLoginPassword,
            jdbcUrl: jdbcUrl
          }
        }
      };

      next(null, reply, result);
    }
  });
};

Handlers.unbind = function (params, next) {

  log.debug('mysqldb/index/unbind/params: %j', params);
  
  var cu = new cmdUnbind(params);
  var mysqldbOps = new mysqldbOperations(params.azure);

  cu.unbind(mysqldbOps, function (err) {
    if (err) {
      return common.handleServiceError(err, next);
    }
    var reply = {
      statusCode: HttpStatus.OK,
      code: HttpStatus.getStatusText(HttpStatus.OK),
      value: {},
    };
    next(null, reply, {});
  });
};

module.exports = Handlers;

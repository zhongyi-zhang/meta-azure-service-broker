/*jshint camelcase: false */
/*jshint newcap: false */

'use strict';

var uuid = require('node-uuid');
var request = require('request');
var util = require('util');
var common = require('../../common');
var resourceGroup = require('../../common/resourceGroup-client');
var msRestRequest = require('../../common/msRestRequest');
var HttpStatus = require('http-status-codes');

var API_VERSIONS;
var environment;
var azureProperties;
var log;
var namespaceUrlTemplate = '%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.ServiceBus/namespaces/%s';
  //Params needed: resourceManagerEndpointUrl, subscriptionId, resourceGroupName, namespaceName
exports.init = function(azure, logger) {
  log = logger;
  azureProperties = azure;

  var environmentName = azureProperties.environment;
  environment = common.getEnvironment(environmentName);

  API_VERSIONS = common.API_VERSION[environmentName];
};

exports.createResourceGroup = function(azureConfig, callback) {
  resourceGroup.createOrUpdate(
    'ServiceBus',
    azureProperties,
    azureConfig.resourceGroupName,
    { 'location': azureConfig.location },
    log,
    callback
  );
};

exports.createNamespace = function(azureConfig, callback) {
  msRestRequest.PUT(
    util.format(
      namespaceUrlTemplate,
      environment.resourceManagerEndpointUrl,
      azureProperties.subscriptionId,
      azureConfig.resourceGroupName,
      azureConfig.namespaceName),
    common.mergeCommonHeaders(log, 'ServiceBus - createNamespace', {}),
    {
      'location': azureConfig.location,
      'kind': azureConfig.sbType,
      'sku': {
        'name': 'StandardSku',
        'tier': azureConfig.sbTier
      },
      'tags': azureConfig.tags,
      'properties': {
      }
    },
    API_VERSIONS.SERVICE_BUS_NAMESPACE,
    function(err, response, body) {
      common.logHttpResponse(log, response, 'ServiceBus - createNamespace', true);
      if (err) {
        callback(err);
      } else {
        if (response.statusCode == HttpStatus.OK) {
          callback(null);
        } else {
          var e = body.error;
          e.statusCode = response.statusCode;
          e.code = body.error.code;
          e.message = body.error.message;
          callback(e);
        }
      }
    }
  );
};

function getNamespace(azureConfig, callback) {
  msRestRequest.GET(
    util.format(
      namespaceUrlTemplate,
      environment.resourceManagerEndpointUrl,
      azureProperties.subscriptionId,
      azureConfig.resourceGroupName,
      azureConfig.namespaceName),
    common.mergeCommonHeaders(log, 'ServiceBus - getNamespace', {}),
    API_VERSIONS.SERVICE_BUS_NAMESPACE,
    function(err, response, body) {
      callback(err, response, body);
    }
  );
}

exports.checkNamespaceAvailability = function(azureConfig, callback) {
  getNamespace(azureConfig, function(err, response, body) {
    common.logHttpResponse(log, response, 'Check namespace availability', true);
    if (err) {
      callback(err);
    } else {
      switch (response.statusCode) {
        case HttpStatus.NOT_FOUND:
          callback(null);
          break;
        case HttpStatus.OK:
          var error = new Error('The namespace name is not available.');
          error.statusCode = HttpStatus.CONFLICT;
          callback(error);
          break;
        default:
          var error = new Error(response.body);
          error.statusCode = response.statusCode;
          callback(error);
      }
    }
  });
};

exports.checkNamespaceStatus = function(azureConfig, callback) {
  getNamespace(azureConfig, function(err, response, body) {
    common.logHttpResponse(log, response, 'Check namespace Status', true);
    if(err) {
      callback(err);
    } else {
      if (response.statusCode == HttpStatus.OK) {
        var b = JSON.parse(body);
        callback(null, b.properties.provisioningState);
      } else {
        var b = JSON.parse(body);
        var e = b.error || {};
        e.statusCode = response.statusCode;
        callback(e);
      }
    }
  });
};

exports.listNamespaceKeys = function(azureConfig, callback) {
  msRestRequest.POST(
    util.format(
      namespaceUrlTemplate + '/authorizationRules/RootManageSharedAccessKey/ListKeys',
      environment.resourceManagerEndpointUrl,
      azureProperties.subscriptionId,
      azureConfig.resourceGroupName,
      azureConfig.namespaceName),
    common.mergeCommonHeaders(log, 'ServiceBus - listNamespaceKeys', {}),
    null,
    API_VERSIONS.SERVICE_BUS_NAMESPACE,
    function(err, response, body) {
      common.logHttpResponse(log, response, 'ServiceBus - listNamespaceKeys', false);
      if (err) {
        callback(err);
      } else {
        if (response.statusCode == HttpStatus.OK) {
          var b = JSON.parse(body);
          callback(null, 'RootManageSharedAccessKey', b.primaryKey);
        } else {
          var b = JSON.parse(body);
          var e = b.error || {};
          e.statusCode = response.statusCode;
          callback(e);
        }
      }
    }
  );
};

exports.delNamespace = function(azureConfig, callback) {
  msRestRequest.DELETE(
    util.format(
      namespaceUrlTemplate,
      environment.resourceManagerEndpointUrl,
      azureProperties.subscriptionId,
      azureConfig.resourceGroupName,
      azureConfig.namespaceName),
    common.mergeCommonHeaders(log, 'ServiceBus - deleteNamespace', {}),
    API_VERSIONS.SERVICE_BUS_NAMESPACE,
    function(err, response, body) {
      common.logHttpResponse(log, response, 'ServiceBus - deleteNamespace', true);
      if (err) {
        callback(err);
      } else {
        if (response.statusCode == HttpStatus.ACCEPTED || response.statusCode == HttpStatus.NO_CONTENT) {
          callback(null);
        } else {
          var e = new Error(JSON.stringify(body));
          e.statusCode = response.statusCode;
          callback(e);
        }
      }
    }
  );
};

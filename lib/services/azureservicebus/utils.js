/*jshint camelcase: false */
/*jshint newcap: false */

'use strict';

var uuid = require('node-uuid');
var request = require('request');
var util = require('util');
var common = require('../../common');
var HttpStatus = require('http-status-codes');
var msRestRequest = require('../../common/msRestRequest');

var API_VERSIONS;
var environment;
var azure_properties;
var log;

exports.init = function(properties, logger) {
  log = logger;
  azure_properties = properties;

  var environmentName = azure_properties.environment;
  environment = common.getEnvironment(environmentName);

  API_VERSIONS = common.API_VERSION[environmentName];
};

exports.createResourceGroup = function(azure_config, callback) {
  msRestRequest.PUT(
    util.format('%s/subscriptions/%s/resourceGroups/%s',
      environment.resourceManagerEndpointUrl,
      azure_properties.subscriptionId,
      azure_config.resourceGroupName),
    common.mergeCommonHeaders(log, 'ServiceBus - createResourceGroup', {}),
    { 'location': azure_config.location },
    API_VERSIONS.RESOURCE_GROUP,
    msRestRequest.USE_SP,
    function(err, response, body) {
      common.logHttpResponse(log, response, 'ServiceBus - createResrouceGroup', true);
      if(err) {
        return callback(err);
      }
      if (response.statusCode == HttpStatus.OK || response.statusCode == HttpStatus.CREATED) {
        callback(null);
      } else {
        var e = new Error(JSON.stringify(body));
        e.statusCode = response.statusCode;
        callback(e);
      }
    }
  );
};

exports.createNamespace = function(azure_config, callback) {
  msRestRequest.PUT(
    util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.ServiceBus/namespaces/%s',
      environment.resourceManagerEndpointUrl,
      azure_properties.subscriptionId,
      azure_config.resourceGroupName,
      azure_config.namespaceName),
    common.mergeCommonHeaders(log, 'ServiceBus - createNamespace', {}),
    {
      'location': azure_config.location,
      'kind': azure_config.sbType,
      'sku': {
        'name': 'StandardSku',
        'tier': azure_config.sbTier
      },
      'tags': azure_config.tags,
      'properties': {
      }
    },
    API_VERSIONS.SERVICE_BUS_NAMESPACE,
    msRestRequest.USE_SP,
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

function getNamespace(azure_config, callback) {
  msRestRequest.GET(
    util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.ServiceBus/namespaces/%s',
      environment.resourceManagerEndpointUrl,
      azure_properties.subscriptionId,
      azure_config.resourceGroupName,
      azure_config.namespaceName),
    common.mergeCommonHeaders(log, 'ServiceBus - getNamespace', {}),
    API_VERSIONS.SERVICE_BUS_NAMESPACE,
    msRestRequest.USE_SP,
    function(err, response, body) {
      callback(err, response, body);
    }
  );
}

exports.checkNamespaceAvailability = function(azure_config, callback) {
  getNamespace(azure_config, function(err, response, body) {
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

exports.checkNamespaceStatus = function(azure_config, callback) {
  getNamespace(azure_config, function(err, response, body) {
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

exports.listNamespaceKeys = function(azure_config, callback) {
  msRestRequest.POST(
    util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.ServiceBus/namespaces/%s/authorizationRules/RootManageSharedAccessKey/ListKeys',
      environment.resourceManagerEndpointUrl,
      azure_properties.subscriptionId,
      azure_config.resourceGroupName,
      azure_config.namespaceName),
    common.mergeCommonHeaders(log, 'ServiceBus - listNamespaceKeys', {}),
    null,
    API_VERSIONS.SERVICE_BUS_NAMESPACE,
    msRestRequest.USE_SP,
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

exports.delNamespace = function(azure_config, callback) {
  msRestRequest.DELETE(
    util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.ServiceBus/namespaces/%s',
      environment.resourceManagerEndpointUrl,
      azure_properties.subscriptionId,
      azure_config.resourceGroupName,
      azure_config.namespaceName),
    common.mergeCommonHeaders(log, 'ServiceBus - deleteNamespace', {}),
    API_VERSIONS.SERVICE_BUS_NAMESPACE,
    msRestRequest.USE_SP,
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

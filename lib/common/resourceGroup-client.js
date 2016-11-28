/* jshint camelcase: false */
/* jshint newcap: false */

var common = require('./index');
var msRestRequest = require('./msRestRequest');
var util = require('util');
var HttpStatus = require('http-status-codes');

// below codes are remained for redis cache, will remove after replacing SDK by REST API in redis cache.

var msRestAzure = require('ms-rest-azure');
var azureMgtResourceGroup = require('azure-arm-resource');
var resourceGroup;

var log;

exports.initialize = function(azure, logger) {
    
    log = logger;
    
    var environment = common.getEnvironment(azure.environment);
    var options = {
        environment: environment
    };

    var appTokenCreds = new msRestAzure.ApplicationTokenCredentials(azure.clientId, azure.tenantId, azure.clientSecret, options);

    var rc = new azureMgtResourceGroup.ResourceManagementClient(appTokenCreds, azure.subscriptionId, environment.resourceManagerEndpointUrl);
    resourceGroup = rc.resourceGroups;    

};

function createOrUpdate2(resourceGroupName, groupParameters, next) {
    resourceGroup.createOrUpdate(resourceGroupName, groupParameters, function (err, result, request, response) {
        common.logHttpResponse(log, response, 'Create or update resource group', true);
        next(err, result);
    });
}

exports.checkExistence = function(resourceGroupName, next) {
    resourceGroup.checkExistence(resourceGroupName, function (err, result, request, response) {
        common.logHttpResponse(log, response, 'Check resource group existence', true);
        next(err, result);
    });
};

// block end

exports.createOrUpdate = function(prefix, azureProperties, resourceGroupName, groupParameters, log, callback) {
  
  // Overload. Remove it after replacing SDK by REST API in redis cache.
  if (typeof resourceGroupName == 'function') {
    return createOrUpdate2(prefix, azureProperties, resourceGroupName);
  }
  
  var environmentName = azureProperties.environment;
  var environment = common.getEnvironment(environmentName);
  var API_VERSIONS = common.API_VERSION[environmentName];
  
  msRestRequest.PUT(
    util.format('%s/subscriptions/%s/resourceGroups/%s',
      environment.resourceManagerEndpointUrl,
      azureProperties.subscriptionId,
      resourceGroupName),
    common.mergeCommonHeaders(log, util.format('%s - create or update resource group', prefix), {}),
    groupParameters,
    API_VERSIONS.RESOURCE_GROUP,
    function(err, response, body) {
      common.logHttpResponse(log, response, util.format('%s - create or update resource group', prefix), true);
      if(err) {
        log.error('%s - create or update resource group, err: %j', prefix, err);
        return callback(err);
      }
      if (response.statusCode == HttpStatus.OK || response.statusCode == HttpStatus.CREATED) {
        log.info('%s - create or update resource group, succeeded', prefix);
        callback(null);
      } else {
        var e = new Error(JSON.stringify(body));
        e.statusCode = response.statusCode;
        log.error('%s - create or update resource group, err: %j', prefix, err);
        callback(e);
      }
    }
  );
};

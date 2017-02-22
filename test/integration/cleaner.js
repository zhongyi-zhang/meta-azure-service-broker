var common = require('../../../lib/common');
var msRestRequest = require('../../../lib/common/msRestRequest');
var chai = require('chai');
var should = chai.should();

exports.clean = function(provisioningParameters, done) {
  var environment = process.env['ENVIRONMENT'];
  var subscriptionId = process.env['SUBSCRIPTION_ID'];
  var resourceGroupName = provisioningParameters.resourceGroup;
  
  var environment = common.getEnvironment();
  var resourceManagerEndpointUrl = environment.resourceManagerEndpointUrl;
  
  resourceGroupUrl = util.format('%s/subscriptions/%s/resourcegroups/%s',
    resourceManagerEndpointUrl, subscriptionId, resourceGroupName);
  
  var headers = common.mergeCommonHeaders(console, 'Delete resource group for integration test', {});
  msRestRequest.DELETE(resourceGroupUrl, headers, API_VERSIONS.RESOURCE_GROUP, function (err, res, body) {
    should.not.exist(err);
    done();
  }
}
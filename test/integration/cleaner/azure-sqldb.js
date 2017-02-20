var common = require('../../../lib/common');
exports.clean = function(provisioningParameters) {
  var environment = process.env['ENVIRONMENT'];
  var subscriptionId = process.env['SUBSCRIPTION_ID'];
  var resourceGroupName = provisioningParameters.resourceGroup;
  var sqlServerName = provisioningParameters.sqlServerName;
  
  var environment = common.getEnvironment();
  var resourceManagerEndpointUrl = environment.resourceManagerEndpointUrl;
  
  serverUrl = util.format('%s/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Sql/servers/%s',
    resourceManagerEndpointUrl, subscriptionId, resourceGroupName, sqlServerName);
}
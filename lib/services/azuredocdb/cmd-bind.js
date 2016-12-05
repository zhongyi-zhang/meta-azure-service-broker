/* jshint camelcase: false */
/* jshint newcap: false */

var async = require('async');

var docDbBind = function(log, params) {
  var provisioningResult = JSON.parse(params.provisioning_result);
  var resourceGroupName = provisioningResult.resourceGroupName;
  var docDbAccountName = provisioningResult.docDbAccountName;
  
  this.bind = function(docDb, callback) {
    docDb.getAccountKey(resourceGroupName, docDbAccountName, function(err, masterKey) {
      callback(err, masterKey);
    });
  };
};

module.exports = docDbBind;

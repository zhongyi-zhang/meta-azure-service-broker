/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var async = require('async');
var common = require('../../common');
var HttpStatus = require('http-status-codes');

var docDbProvision = function(log, params) {

  var instanceId = params.instance_id;
  var reqParams = params.parameters || {};

  var resourceGroupName = reqParams.resourceGroup || '';
  var docDbAccountName = reqParams.docDbAccountName || '';
  var docDbName = reqParams.docDbName || '';
  var location = reqParams.location || '';
  
  this.provision = function(docDb, next) {

    async.waterfall([
      function(callback) {
        docDb.getDocDbAccount(resourceGroupName, docDbAccountName, function(err, res, body) {
          if (err) {
            return callback(err);
          }
          if (res.statusCode != HttpStatus.NOT_FOUND && res.statusCode != HttpStatus.NO_CONTENT) {
            var error = new Error('The docDb account name is not available.');
            error.statusCode = HttpStatus.CONFLICT;
            return callback(error);
          }
          callback(null);
        });
      },
      function(callback) {
        docDb.createResourceGroup(resourceGroupName, location, callback);
      },
      function(callback) {
        var params = {
          'location': location,
          'properties': {
            'databaseAccountOfferType': 'Standard'
          },
          'tags': common.mergeTags(reqParams.tags)
        };
        
        docDb.createDocDbAccount(resourceGroupName, docDbAccountName, params, function(err) {
            if (err) {
              return callback(err);
            }
            var result = {
              resourceGroupName: resourceGroupName,
              docDbAccountName: docDbAccountName
            };
            callback(null, result);
          }
        );
      }
    ], function(err, result){
      if (err) {
        next(err);
      } else {
        next(null, result);
      }
    });        
  };
  
  this.verifyParameters = function() {
    var reqParamsKey = ['resourceGroup', 'docDbAccountName', 'docDbName', 'location'];
    return common.verifyParameters(reqParams, reqParamsKey);
  };

};

module.exports = docDbProvision;


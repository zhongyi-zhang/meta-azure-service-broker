/*jshint camelcase: false */

var Token = require('./token');
var common = require('./index');
var _ = require('underscore');
var HttpStatus = require('http-status-codes');
var async = require('async');
var request = require('request');

var log;

var MAX_RETRY = 3;
var DEFAULT_RETRY_INTERVAL = 3000; //ms

var AZURE_RETRY_ERROR_CODES = [408, 429, 500, 502, 503, 504];
    
exports.init = function(azureProperties, _log) {
  log = _log;
  var environmentName = azureProperties.environment;
  var environment = common.getEnvironment(environmentName);
  
  Token.init(environment, azureProperties, common.API_VERSION[environmentName]['AZURE_ACTIVE_DIRECTORY'], log);
};
    
function msRestRequest(url, qs, method, headers, data, useSp, callback) {
  var tokenExpired = false;

  if (useSp) _.extend(headers, {'Authorization': ''});
  var requestObject = { url: url, qs: qs, method: method, headers: headers};
  
  if (data) {
    if (_.has(headers, 'Content-Type') && headers['Content-Type'] == 'application/x-www-form-urlencoded') {
      _.extend(requestObject, {form: data});
    } else {
      _.extend(requestObject, {json: data});
    }
  }

  function doRequest(callback) {
    request(requestObject, function (err, res, body) {
      if (err) {
        return callback(err);
      }

      if (useSp && res.statusCode == HttpStatus.UNAUTHORIZED) {
        tokenExpired = true;
        return callback(res);
      }

      if (AZURE_RETRY_ERROR_CODES.indexOf(res.statusCode) != -1) {
        return callback(res);
      }

      callback(null, {res: res, body: body});
    });
  }

  var tokenRetryTimes = 0, restRetryTimes = 0;
  var breakFlag = false;
  async.whilst(
    function () {
      return !breakFlag;
    },
    function (cb) {

      async.waterfall([
        function (callback) {
          if (!useSp) {
            return callback(null);
          }
          Token.getToken(tokenExpired, function(err, accessToken) {
            if (err) {
              ++tokenRetryTimes;
              return callback(err);
            }
            
            tokenExpired = false;
            requestObject.headers.Authorization = 'Bearer ' + accessToken;
            callback(null);
          });
        },
        function (callback) {
          doRequest(function (err, result) {
            if (err) {
              ++restRetryTimes;
              return callback(err);
            }
            callback(null, result);
          });
        }
      ], function (err, result) {
        if (err) {
          if (tokenRetryTimes < MAX_RETRY && restRetryTimes < MAX_RETRY) {
            log.warn('msRestRequest : %j', err);
            
            var retryAfter = DEFAULT_RETRY_INTERVAL;
            if (_.has(err, 'headers') &&
                _.has(err['headers'], 'Retry-After') &&
                typeof err['headers']['Retry-After'] === 'number'
            ) {
              retryAfter = err['headers']['Retry-After'] * 1000;
            }
            
            return setTimeout(cb(null), retryAfter);
          }
          breakFlag = true;
          return cb(err);
        }
        breakFlag = true;
        cb(null, result);
      });

    },
    function (err, result) {
      if (err) {
        log.error('msRestRequest : %j', err);
        return callback(err);
      }
      callback(null, result.res, result.body);
    }
  );
}

exports.USE_SP = true;
exports.NOT_USE_SP = false;

exports.POST = function (url, headers, data, apiVersion, useSp, callback) {
  msRestRequest(url, { 'api-version': apiVersion }, 'POST', headers, data, useSp, callback);
};

exports.PUT = function (url, headers, data, apiVersion, useSp, callback) {
  msRestRequest(url, { 'api-version': apiVersion }, 'PUT', headers, data, useSp, callback);
};

exports.GET = function (url, headers, apiVersion, useSp, callback) {
  msRestRequest(url, { 'api-version': apiVersion }, 'GET', headers, null, useSp, callback);
};

exports.DELETE = function (url, headers, apiVersion, useSp, callback) {
  msRestRequest(url, { 'api-version': apiVersion }, 'DELETE', headers, null, useSp, callback);
};
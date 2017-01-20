var logule = require('logule');
var statusCode = require('./statusCode');
var supportedEnvironments = require('./supportedEnvironments');

module.exports = function(environment) {
  var clientName = 'azuresqldbClient';
  var log = logule.init(module, clientName);

  this.validateCredential = function(credential, next) {
    var Connection = require('tedious').Connection;
    var Request = require('tedious').Request;
    
    var serverSuffix = supportedEnvironments[environment]['sqlServerEndpointSuffix'];
    var config = {  
      userName: credential.databaseLogin,
      password: credential.databaseLoginPassword,
      server: credential.sqlServerName + serverSuffix,
      options: {encrypt: true, database: credential.sqldbName}
    };
    var connection = new Connection(config);
    log.debug('Connecting to SQL server %s%s and database %s', credential.sqlServerName, serverSuffix, credential.sqldbName);
    connection.on('connect', function(err) {
      if(!err){
        log.debug('The SQL Database can be connected.');
        
        var request = new Request('CREATE TABLE testtable(aaa char(10))', function(err) {
          if (!err) {
              log.debug('The user can create a new table in the SQL Database.');
              next(statusCode.PASS);
          } else {
              log.error('The user can\'t create a new table in the SQL Database. Error: %j', error);
              next(statusCode.FAIL);
          }
          connection.close();
        });
        connection.execSql(request);
      }
      else {
        log.error('The SQL Database can not be connected. Error: %j', error);
        connection.close();
        next(statusCode.FAIL);
      }
    }); 
  }
}

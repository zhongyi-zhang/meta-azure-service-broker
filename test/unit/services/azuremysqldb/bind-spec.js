/*
  good instanceId : e2778b98-0b6b-11e6-9db3-000d3a002ed5
  test: 
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var sinon = require('sinon');
var cmdbind = require('../../../../lib/services/azuremysqldb/cmd-bind');
var mysqldbOperations = require('../../../../lib/services/azuremysqldb/client');
var azure = require('../helpers').azure;

var mysqldbOps = new mysqldbOperations(azure);

describe('MysqlDb - bind', function () {

    var cb;

    before(function () {

        var validParams = {
            instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            service_id: 'fb9bc99e-0aa9-11e6-8a8a-000d3a002ed5',
            plan_id: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
            parameters: {
                resourceGroup: 'sqldbResourceGroup',
                mysqlServerName: 'golive4',
                mysqldbName: 'sqldb'
            },
            provisioning_result: {
                'mysqlServerName': 'golive4',
                'administratorLogin': 'greg',
                'administratorLoginPassword': 'P@ssw0rd!'
            },
            azure: azure
        };

        cb = new cmdbind(validParams);
        sinon.stub(mysqldbOps, 'executeSql').yields(null);
    });

    after(function () {
        mysqldbOps.executeSql.restore();
    });

    describe('should create the user', function () {
        it('should not callback error', function (done) {
            cb.bind(mysqldbOps, function (err, result) {
                should.not.exist(err);
                should.exist(result.databaseLogin);
                should.exist(result.databaseLoginPassword);
                done();
            });
        });
    });
});

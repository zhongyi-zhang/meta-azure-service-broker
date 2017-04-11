/*
  good instanceId : e2778b98-0b6b-11e6-9db3-000d3a002ed5
  test: 
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var sinon = require('sinon');
var cmdUnbind = require('../../../../lib/services/azuremysqldb/cmd-unbind');
var mysqldbOperations = require('../../../../lib/services/azuremysqldb/client');
var azure = require('../helpers').azure;

var mysqldbOps = new mysqldbOperations(azure);

describe('MysqlDb - Unbind', function () {

    var cb;

    before(function () {

        var validParams = {
            instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            service_id: 'fb9bc99e-0aa9-11e6-8a8a-000d3a002ed5',
            plan_id: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
            parameters: {},
            binding_result: '{"databaseLogin":"asd"}',
            provisioning_result: '{}',
            azure: azure
        };

        cb = new cmdUnbind(validParams);
    });

    after(function () {
        mysqldbOps.executeSql.restore();
    });

    describe('delete the user', function () {
        sinon.stub(mysqldbOps, 'executeSql').yields(null);
        it('should not exist error', function (done) {
            cb.unbind(mysqldbOps, function (err, result) {
                should.not.exist(err);
                done();
            });
        });
    });
});

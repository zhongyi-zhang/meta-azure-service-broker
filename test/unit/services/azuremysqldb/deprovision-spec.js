/*
  good instanceId : e2778b98-0b6b-11e6-9db3-000d3a002ed5
  test: 
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var sinon = require('sinon');
var cmdDeprovision = require('../../../../lib/services/azuremysqldb/cmd-deprovision');
var mysqldbOperations = require('../../../../lib/services/azuremysqldb/client');
var azure = require('../helpers').azure;

var mysqldbOps = new mysqldbOperations(azure);

describe('MysqlDb - Deprovision', function () {

    var cd;

    before(function () {

        var validParams = {
            instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            service_id: 'fb9bc99e-0aa9-11e6-8a8a-000d3a002ed5',
            plan_id: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
            provisioning_result: '{}',
            parameters: {},
            azure: azure
        };

        cd = new cmdDeprovision(validParams);
        
        sinon.stub(mysqldbOps, 'executeSql').yields(null, true);
    });

    after(function () {
        mysqldbOps.executeSql.restore();
    });

    describe('Deprovision should return 200 ...', function () {
        it('returns 200 if no err', function (done) {
            cd.deprovision(mysqldbOps, function (err, result) {
                should.not.exist(err);
                result.state.should.equal('succeeded');
                result.description.should.equal('Deleted database');
                done();
            });
        });
    });
});

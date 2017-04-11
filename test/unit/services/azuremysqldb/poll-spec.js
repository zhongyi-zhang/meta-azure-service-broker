/*
  good instanceId : e2778b98-0b6b-11e6-9db3-000d3a002ed5
  test: 
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var sinon = require('sinon');
var cmdPoll = require('../../../../lib/services/azuremysqldb/cmd-poll');
var mysqldbOperations = require('../../../../lib/services/azuremysqldb/client');
var azure = require('../helpers').azure;
var msRestRequest = require('../../../../lib/common/msRestRequest');

var mockingHelper = require('../mockingHelper');
mockingHelper.backup();

var afterProvisionValidParams = {
    instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
    service_id: 'fb9bc99e-0aa9-11e6-8a8a-000d3a002ed5',
    plan_id: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
    organization_guid: '1                                   ',
    space_guid: '4                                   ',
    parameters: {
        mysqlServerName: 'golive4',
        mysqldbName: 'sqldb'
    },
    last_operation: 'provision',
    provisioning_result: {
        'provisionStage': 0,
        'resourceGroup':'sqldbResourceGroup',
        'administratorLogin':'xxxx',
        'administratorLoginPassword':'xxxxxxx',
    },
    azure: azure
};

var afterDeprovisionValidParams = {
    instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
    service_id: 'fb9bc99e-0aa9-11e6-8a8a-000d3a002ed5',
    plan_id: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
    organization_guid: '1                                   ',
    space_guid: '4                                   ',
    parameters: {
        mysqlServerName: 'golive4',
        mysqldbName: 'sqldb'
    },
    last_operation: 'deprovision',
    provisioning_result: {
        'provisionStage': 0,
        'resourceGroup': 'sqldbResourceGroup',
        'administratorLogin':'xxxx',
        'administratorLoginPassword':'xxxxxxx'
    },
    azure: azure
};

var mysqldbOps = new mysqldbOperations(azure);

describe('MysqlDb - Poll - polling database immediately after creation is started', function () {

    var cp;
    
    before(function () {
        cp = new cmdPoll(afterProvisionValidParams);
    });

    after(function () {
        mockingHelper.restore();
    });

    describe('Poll should return 200 immediately after starting to provision a server', function () {
        it('should interpret the 404 from GetServer as creating the server', function (done) {
            msRestRequest.GET = sinon.stub();
            msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/sqldbResourceGroup/providers/Microsoft.DBforMySQL/servers/golive4')
              .yields(null, {statusCode: 404});
            cp.poll(mysqldbOps, function (err, result) {
                should.not.exist(err);
                result.value.state.should.equal('in progress');
                result.value.description.should.equal('Creating server golive4.');
                done();
            });
        });
    });
    
    describe('Poll should return 200 immediately after starting to provision a server', function () {
        it('should interpret the 200 and not ready from GetServer as creating the server', function (done) {
            msRestRequest.GET = sinon.stub();
            msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/sqldbResourceGroup/providers/Microsoft.DBforMySQL/servers/golive4')
              .yields(null, {statusCode: 200}, '{"properties": {"userVisibleState": "initializing"} }');
            cp.poll(mysqldbOps, function (err, result) {
                should.not.exist(err);
                result.value.state.should.equal('in progress');
                result.value.description.should.equal('Creating server golive4.');
                done();
            });
        });
    });
});

describe('MysqlDb - Poll - polling Server after creation is complete', function () {

    var mysqldbOpsGetServerResult = {
        statusCode: 200,
        body: {
          properties: {
            'userVisibleState': 'Ready',
            'fullyQualifiedDomainName': 'fake-fqdn'
          } 
        }
    };

    beforeEach(function () {
        msRestRequest.GET = sinon.stub();
        msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/sqldbResourceGroup/providers/Microsoft.DBforMySQL/servers/golive4')
          .yields(null, mysqldbOpsGetServerResult, JSON.stringify(mysqldbOpsGetServerResult.body));

        sinon.stub(mysqldbOps, 'executeSql').yields(null);
    });

    afterEach(function () {
        mockingHelper.restore();
        mysqldbOps.executeSql.restore();
    });

    describe('Poll should ...', function () {
        it('return 200 if it is executed after sufficient time', function (done) {
            var cp = new cmdPoll(afterProvisionValidParams);
            cp.poll(mysqldbOps, function (err, result) {
                should.not.exist(err);
                result.body.administratorLogin.should.equal('xxxx');
                result.body.administratorLoginPassword.should.equal('xxxxxxx');
                result.value.state.should.equal('succeeded');
                result.value.description.should.equal('Created database sqldb on server golive4.');
                done();
            });
        });
    });

});

describe('MysqlDb - Poll - polling database after de-provision is complete', function () {

    var cp;

    before(function () {
        cp = new cmdPoll(afterDeprovisionValidParams);
        sinon.stub(mysqldbOps, 'executeSql').yields(null, []);
    });

    after(function () {
        mysqldbOps.executeSql.restore();
    });

    describe('Poll should return 200 after de-provisioning is complete', function () {
        it('should correctly interpret 404 as database is deleted', function (done) {
            cp.poll(mysqldbOps, function (err, result) {
                should.not.exist(err);
                result.value.state.should.equal('succeeded');
                result.value.description.should.equal('Database has been deleted.');
                done();
            });
        });
    });
});

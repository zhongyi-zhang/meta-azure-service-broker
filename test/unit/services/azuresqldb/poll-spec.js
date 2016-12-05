/*
  good instanceId : e2778b98-0b6b-11e6-9db3-000d3a002ed5
  test: 
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var _ = require('underscore');
var logule = require('logule');
var should = require('should');
var sinon = require('sinon');
var cmdPoll = require('../../../../lib/services/azuresqldb/cmd-poll');
var sqldbOperations = require('../../../../lib/services/azuresqldb/client');
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
        resourceGroup: 'sqldbResourceGroup',
        location: 'westus',
        sqlServerName: 'golive4',
        sqlServerParameters: {
            properties: {
                administratorLogin: 'xxxx',
                administratorLoginPassword: 'xxxxxxx',
                version: '12.0'
            }
        },
        sqldbName: 'sqldb',
        sqldbParameters: {
            properties: {
                collation: 'SQL_Latin1_General_CP1_CI_AS',
                maxSizeBytes: '2147483648',
                createMode: 'Default',
                edition: 'Basic',
                requestedServiceObjectiveName: 'Basic'
            }
        }
    },
    last_operation: 'provision',
    provisioning_result: "{\"operation\":\"CreateLogicalDatabase\",\"startTime\":\"/ Date(1467968057450 + 0000) / \",\"id\":\"subscriptions/743f6ed6-83a8-46f0-822d-ea93b953952d/resourceGroups/ sqldbResourceGroup / providers / Microsoft.Sql / servers / golive4 / databases / sqldb\",\"type\":\"Microsoft.Sql / servers / databases\",\"provisioningResult\":\"creating\",\"sqlServerName\":\"golive4\",\"sqldbName\":\"sqldb\",\"sqldbParameters\":{\"location\":\"westus\",\"properties\":{\"collation\":\"SQL_Latin1_General_CP1_CI_AS\",\"maxSizeBytes\":\"2147483648\",\"createMode\":\"Default\",\"edition\":\"Basic\",\"requestedServiceObjectiveName\":\"Basic\"}}}",
    azure: azure
};

var afterDeprovisionValidParams = {
    instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
    service_id: 'fb9bc99e-0aa9-11e6-8a8a-000d3a002ed5',
    plan_id: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
    organization_guid: '1                                   ',
    space_guid: '4                                   ',
    parameters: {
        resourceGroup: 'sqldbResourceGroup',
        location: 'westus',
        sqlServerName: 'golive4',
        sqlServerParameters: {
            properties: {
                administratorLogin: 'xxxx',
                administratorLoginPassword: 'xxxxxxx',
                version: '12.0'
            }
        },
        sqldbName: 'sqldb',
        sqldbParameters: {
            properties: {
                collation: 'SQL_Latin1_General_CP1_CI_AS',
                maxSizeBytes: '2147483648',
                createMode: 'Default',
                edition: 'Basic',
                requestedServiceObjectiveName: 'Basic'
            }
        }
    },
    last_operation: 'deprovision',
    provisioning_result: '{\"id\":\"/subscriptions/743f6ed6-83a8-46f0-822d-ea93b953952d/resourceGroups/sqldbResourceGroup/providers/Microsoft.Sql/servers/golive4/databases/sqldb\",\"name\":\"sqldb\",\"type\":\"Microsoft.Sql/servers/databases\",\"location\":\"West US\",\"kind\":\"v12.0,user\",\"properties\":{\"databaseId\":\"1e141874-5886-4077-a476-f2ecc4b0016d\",\"edition\":\"Basic\",\"status\":\"Online\",\"serviceLevelObjective\":\"Basic\",\"collation\":\"SQL_Latin1_General_CP1_CI_AS\",\"maxSizeBytes\":\"2147483648\",\"creationDate\":\"2016-07-09T13:39:44.4Z\",\"currentServiceObjectiveId\":\"dd6d99bb-f193-4ec1-86f2-43d3bccbc49c\",\"requestedServiceObjectiveId\":\"dd6d99bb-f193-4ec1-86f2-43d3bccbc49c\",\"requestedServiceObjectiveName\":null,\"defaultSecondaryLocation\":\"East US\",\"earliestRestoreDate\":\"2016-07-09T13:49:55.667Z\",\"elasticPoolName\":null,\"containmentState\":2},\"sqlServerName\":\"golive4\",\"administratorLogin\":\"xxxx\",\"administratorLoginPassword\":\"xxxxxxx\"}',
    azure: azure
};

var log = logule.init(module, 'SqlDb-Mocha');
var sqldbOps = new sqldbOperations(log, azure);

describe('SqlDb - Poll - polling database immediately after creation is started', function () {

    var cp;
    var sqldbOpsGetDatabaseResult = {
        statusCode: 404,
        value:
        {
            state: 'in progress',
            description: 'Creating logical database sqldb on logical server golive4.'
        }
    };

    before(function () {
        cp = new cmdPoll(log, afterProvisionValidParams);
        msRestRequest.GET = sinon.stub();
        msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/sqldbResourceGroup/providers/Microsoft.Sql/servers/golive4/databases/sqldb')
          .yields(null, sqldbOpsGetDatabaseResult);
    });

    after(function () {
        mockingHelper.restore();
    });

    describe('Poll should return 200 immediately after starting to provision a database', function () {
        it('should interpret the 404 from GetDatabase as creating the database', function (done) {
            cp.poll(sqldbOps, function (err, result) {
                should.not.exist(err);
                result.value.state.should.equal('in progress');
                result.value.description.should.equal('Creating logical database sqldb on logical server golive4.');
                done();
            });
        });
    });
});


describe('SqlDb - Poll - polling database after creation is complete', function () {

    var cp;
    var sqldbOpsGetDatabaseResult = {
        statusCode: 200,
        body: {
            id: '/subscriptions/743f6ed6-83a8-46f0-822d-ea93b953952d/resourceGroups/sqldbResourceGroup/providers/Microsoft.Sql/servers/golive4/databases/sqldb',
            name: 'sqldb',
            type: 'Microsoft.Sql/servers/databases',
            location: 'West US',
            kind: 'v12.0,user',
            properties: {
                databaseId: 'bf19fd8d-8b08-4b11-aceb-16dafee3c7cc',
                edition: 'Basic',
                status: 'Online',
                serviceLevelObjective: 'Basic',
                collation: 'SQL_Latin1_General_CP1_CI_AS',
                maxSizeBytes: '2147483648',
                creationDate: '2016-07-08T08:54:17.73Z',
                currentServiceObjectiveId: 'dd6d99bb-f193-4ec1-86f2-43d3bccbc49c',
                requestedServiceObjectiveId: 'dd6d99bb-f193-4ec1-86f2-43d3bccbc49c',
                requestedServiceObjectiveName: null,
                defaultSecondaryLocation: 'East US',
                earliestRestoreDate: '2016-07-08T09:05:03.543Z',
                elasticPoolName: null,
                containmentState: 2
            }
        }
    };

    before(function () {
        cp = new cmdPoll(log, afterProvisionValidParams);
        msRestRequest.GET = sinon.stub();
        msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/sqldbResourceGroup/providers/Microsoft.Sql/servers/golive4/databases/sqldb')
          .yields(null, sqldbOpsGetDatabaseResult, JSON.stringify(sqldbOpsGetDatabaseResult.body));
    });

    after(function () {
        mockingHelper.restore();
    });

    describe('Poll should return 200 if ...', function () {
        it('is executed after sufficient time', function (done) {
            cp.poll(sqldbOps, function (err, result) {
                should.not.exist(err);
                result.body.sqlServerName.should.equal('golive4');
                result.body.administratorLogin.should.equal('xxxx');
                result.body.administratorLoginPassword.should.equal('xxxxxxx');
                result.value.state.should.equal('succeeded');
                result.value.description.should.equal('Created logical database sqldb on logical server golive4.');
                done();
            });
        });
    });
});

describe('SqlDb - Poll - polling database after de-provision is complete', function () {

    var cp;

    sqldbOpsGetServerResult = {
        statusCode: 404,
        value:
        {
            state: 'succeeded',
            description: 'Server has been deleted.'
        }
    };

    before(function () {
        cp = new cmdPoll(log, afterDeprovisionValidParams);
        msRestRequest.GET = sinon.stub();
        msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/sqldbResourceGroup/providers/Microsoft.Sql/servers/golive4')
          .yields(null, {statusCode: 404});
    });

    after(function () {
        mockingHelper.restore();
    });

    describe('Poll should return 200 after de-provisioning is complete', function () {
        it('should correctly interpret 404 as server is deleted', function (done) {
            cp.poll(sqldbOps, function (err, result) {
                should.not.exist(err);
                result.value.state.should.equal('succeeded');
                result.value.description.should.equal('Server has been deleted.');
                done();
            });
        });
    });
});


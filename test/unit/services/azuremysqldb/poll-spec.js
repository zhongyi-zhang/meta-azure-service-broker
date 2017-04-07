/*
  good instanceId : e2778b98-0b6b-11e6-9db3-000d3a002ed5
  test: 
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var HttpStatus = require('http-status-codes');
var should = require('should');
var sinon = require('sinon');
var cmdPoll = require('../../../../lib/services/azuremysqldb/cmd-poll');
var sqldbOperations = require('../../../../lib/services/azuremysqldb/client');
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
        mysqlServerName: 'golive4',
        mysqlServerParameters: {
            'allowMysqlServerFirewallRules': [
                {
                  'ruleName': 'newrule',
                  'startIpAddress': '0.0.0.0',
                  'endIpAddress': '255.255.255.255'
                }
            ],
            properties: {
                administratorLogin: 'xxxx',
                administratorLoginPassword: 'xxxxxxx'
            }
        }
    },
    last_operation: 'provision',
    provisioning_result: '{"resourceGroup":"sqldbResourceGroup", "administratorLogin":"xxxx","administratorLoginPassword":"xxxxxxx","operation":"CreateLogicalDatabase","startTime":"/ Date(1467968057450 + 0000) / ","id":"subscriptions/743f6ed6-83a8-46f0-822d-ea93b953952d/resourceGroups/ sqldbResourceGroup / providers / Microsoft.DBforMySQL / servers / golive4 / databases / sqldb","type":"Microsoft.DBforMySQL / servers / databases","provisioningResult":"creating","mysqlServerName":"golive4","sqldbName":"sqldb","sqldbParameters":{"location":"westus","properties":{"collation":"SQL_Latin1_General_CP1_CI_AS","maxSizeBytes":"2147483648","createMode":"Default","edition":"Basic","requestedServiceObjectiveName":"Basic"}}}',
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
        mysqlServerName: 'golive4',
        mysqlServerParameters: {
            'allowMysqlServerFirewallRules': [
                {
                  'ruleName': 'newrule',
                  'startIpAddress': '0.0.0.0',
                  'endIpAddress': '255.255.255.255'
                }
            ],
            properties: {
                administratorLogin: 'xxxx',
                administratorLoginPassword: 'xxxxxxx'
            }
        }
    },
    last_operation: 'deprovision',
    provisioning_result: '{"resourceGroup":"sqldbResourceGroup", "id":"/subscriptions/743f6ed6-83a8-46f0-822d-ea93b953952d/resourceGroups/sqldbResourceGroup/providers/Microsoft.DBforMySQL/servers/golive4/databases/sqldb","name":"sqldb","type":"Microsoft.DBforMySQL/servers/databases","location":"West US","kind":"v12.0,user","properties":{"databaseId":"1e141874-5886-4077-a476-f2ecc4b0016d","edition":"Basic","status":"Online","serviceLevelObjective":"Basic","collation":"SQL_Latin1_General_CP1_CI_AS","maxSizeBytes":"2147483648","creationDate":"2016-07-09T13:39:44.4Z","currentServiceObjectiveId":"dd6d99bb-f193-4ec1-86f2-43d3bccbc49c","requestedServiceObjectiveId":"dd6d99bb-f193-4ec1-86f2-43d3bccbc49c","requestedServiceObjectiveName":null,"defaultSecondaryLocation":"East US","earliestRestoreDate":"2016-07-09T13:49:55.667Z","elasticPoolName":null,"containmentState":2},"mysqlServerName":"golive4","administratorLogin":"xxxx","administratorLoginPassword":"xxxxxxx"}',
    azure: azure
};

var sqldbOps = new sqldbOperations(azure);

describe('MySqlDb - Poll - polling server immediately after creation is started', function () {

    var cp;
    var sqldbOpsGetDatabaseResult = {
        statusCode: 404
    };

    before(function () {
        cp = new cmdPoll(afterProvisionValidParams);
        msRestRequest.GET = sinon.stub();
        msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/sqldbResourceGroup/providers/Microsoft.DBforMySQL/servers/golive4')
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
                result.value.description.should.equal('Creating logical server golive4.');
                done();
            });
        });
    });
});


describe('SqlDb - Poll - polling database after creation is complete', function () {

    var sqldbOpsGetDatabaseResult = {
        statusCode: 200,
        body: {
            name: 'mysql',
            properties: {
                userVisibleState: 'Ready'
            }
        }
    };

    beforeEach(function () {
        msRestRequest.GET = sinon.stub();
        msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/sqldbResourceGroup/providers/Microsoft.DBforMySQL/servers/golive4')
          .yields(null, sqldbOpsGetDatabaseResult, JSON.stringify(sqldbOpsGetDatabaseResult.body));
        msRestRequest.PUT = sinon.stub();
        // create firewall rule
        msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/sqldbResourceGroup/providers/Microsoft.DBforMySQL/servers/golive4/firewallRules/newrule')
          .yields(null, {statusCode: 200});
    });

    afterEach(function () {
        mockingHelper.restore();
    });

    describe('Poll should ...', function () {
        it('return 200 if it is executed after sufficient time', function (done) {
            var cp = new cmdPoll(afterProvisionValidParams);
            cp.poll(sqldbOps, function (err, result) {
                should.not.exist(err);
                result.body.mysqlServerName.should.equal('golive4');
                result.body.administratorLogin.should.equal('xxxx');
                result.body.administratorLoginPassword.should.equal('xxxxxxx');
                result.statusCode.should.equal(HttpStatus.OK);
                result.value.state.should.equal('succeeded');
                result.value.description.should.equal('Created logical server golive4.');
                done();
            });
        });
    });

});

describe('SqlDb - Poll - polling database after de-provision is complete', function () {

    var cp;

    before(function () {
        cp = new cmdPoll(afterDeprovisionValidParams);
        msRestRequest.GET = sinon.stub();
        msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/sqldbResourceGroup/providers/Microsoft.DBforMySQL/servers/golive4')
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


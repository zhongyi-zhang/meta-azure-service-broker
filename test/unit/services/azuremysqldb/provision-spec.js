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
var cmdProvision = require('../../../../lib/services/azuremysqldb/cmd-provision');
var mysqldbOperations = require('../../../../lib/services/azuremysqldb/client');
var azure = require('../helpers').azure;
var msRestRequest = require('../../../../lib/common/msRestRequest');

var mysqldbOps = new mysqldbOperations(azure);

var mockingHelper = require('../mockingHelper');
mockingHelper.backup();

describe('MysqlDb - Provision - PreConditions', function () {
    var params = {};
    var cp;

    describe('All the required parameters are provided', function () {
        before(function () {
            params = {
                instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
                plan_id: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
                parameters: {      // developer's input parameters file
                    resourceGroup: 'fake-resource-group-name',
                    location: 'westus',
                    mysqlServerName: 'fake-server-name',
                    mysqlServerParameters: {
                        properties: {
                            administratorLogin: 'fake-server-name',
                            administratorLoginPassword: 'c1oudc0w'
                        },
                        tags: {
                            foo: 'bar'
                        }
                    },
                    mysqldbName: 'fake-db-name'
                },
                azure: azure,
                privilege: {
                    'mysqldb': {
                        'allowToCreateMysqlServer': true
                    }
                },
                accountPool:{'sqldb':{}}
            };
            cp = new cmdProvision(params);
            
        });

        it('should succeed to validate the parameters', function (done) {
            (cp.getInvalidParams().length).should.equal(0);
            done();
        });
    });

    describe('parameters file is not provided', function () {

        before(function () {
            params = {
                plan_id: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
                instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
                azure: azure,
                privilege: {
                    'mysqldb': {
                        'allowToCreateMysqlServer': true
                    }
                },
                accountPool:{'mysqldb':{}}
            };
            cp = new cmdProvision(params);
        });

        it('should fail to validate the parameters', function (done) {
            (cp.getInvalidParams().length).should.equal(6);
            done();
        });
    });
});

describe('MySqlDb - Provision - Execution (allow to create server)', function () {
    var params = {};
    var cp;
    
    before(function () {
        params = {
            instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            plan_id: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
            parameters: {      // developer's input parameters file
                resourceGroup: 'fake-resource-group-name',
                location: 'westus',
                mysqlServerName: 'fake-server-name',
                mysqlServerParameters: {
                    allowMysqlServerFirewallRules: [{
                        ruleName: 'newrule',
                        startIpAddress: '0.0.0.0',
                        endIpAddress: '255.255.255.255'
                    }],
                    properties: {
                        administratorLogin: 'fake-server-name',
                        administratorLoginPassword: 'c1oudc0w'
                    }
                },
                mysqldbName: 'fake-db-name'
            },
            azure: azure,
            privilege: {
                'mysqldb': {
                    'allowToCreateMysqlServer': true
                }
            },
            accountPool:{'mysqldb':{}}
        };

        cp = new cmdProvision(params);
        
        
        msRestRequest.PUT = sinon.stub();
        msRestRequest.GET = sinon.stub();
        
        // create resource group
        msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name')
            .yields(null, {statusCode: 200});
        
        // create server
        msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name/providers/Microsoft.DBforMySQL/servers/fake-server-name')
            .yields(null, {statusCode: 202}, {properties: {fullyQualifiedDomainName: 'fake-fqdn'}});
    });

    after(function () {
        mockingHelper.restore();
    });
        
    describe('Server & Database that does not previously exist', function() {

        before(function () {
          msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name/providers/Microsoft.DBforMySQL/servers/fake-server-name')
              .yields(null, {statusCode: 404});
        });
    
        it('should not callback error', function (done) {
            cp.provision(mysqldbOps, function (err, result) {
                should.not.exist(err);
                should.exist(result.body.resourceGroup);
                should.exist(result.body.mysqlServerName);
                should.exist(result.body.mysqldbName);
                should.exist(result.body.administratorLogin);
                should.exist(result.body.administratorLoginPassword);
                (result.body.provisionStage).should.equal(0);
                done();
            });
        });
    });

    describe('Sql server exists, but sql database does not exist', function () {
    
        before(function () {
          msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name/providers/Microsoft.DBforMySQL/servers/fake-server-name')
              .yields(null,
                    {statusCode: HttpStatus.OK},
                    '{"properties": { "fullyQualifiedDomainName": "fake-fqdn"}}'
                );
          //get database
          sinon.stub(mysqldbOps, 'executeSql').yields(null, []);
        });
    
        after(function () {
            mysqldbOps.executeSql.restore();
        });
        
        it('should not callback error', function (done) {
    
            cp.provision(mysqldbOps, function (err, result) {
                should.not.exist(err);
                should.exist(result.body.resourceGroup);
                should.exist(result.body.mysqlServerName);
                should.exist(result.body.mysqldbName);
                should.exist(result.body.administratorLogin);
                should.exist(result.body.administratorLoginPassword);
                (result.body.provisionStage).should.equal(0);
                done();
            });
    
        });
    });

});

describe('MySqlDb - Provision - Execution (not allow to create server)', function () {
    var params = {};
    var cp;

    before(function () {
        params = {
            instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            plan_id: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
            parameters: {      // developer's input parameters file
                mysqlServerName: 'fake-server-name',
                mysqldbName: 'fake-db-name'
            },
            azure: azure,
            privilege: {
                'mysqldb': {
                    'allowToCreateMysqlServer': false
                }
            },
            accountPool:{
                'mysqldb': {
                    'fake-server-name': {
                        resourceGroup: 'fake-resource-group-name',
                        location: 'fake-location',
                        administratorLogin: 'fake-server-name',
                        administratorLoginPassword: 'c1oudc0w'
                    }
                }
            }
        };

        cp = new cmdProvision(params);
        
    });
    
    after(function () {
        mockingHelper.restore();
    });

    describe('Server & Database that does not previously exist', function() {

        before(function () {
            msRestRequest.PUT = sinon.stub();
            msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name')
                .yields(null, {statusCode: 200});
            msRestRequest.GET = sinon.stub();
            msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name/providers/Microsoft.DBforMySQL/servers/fake-server-name')
                .yields(null, {statusCode: 404});
        });
    
        it('should callback error that server not exist', function (done) {
            cp.provision(mysqldbOps, function (err, result) {
                should.exist(err);
                err.message.should.equal('The specified server does not exist but you do not have the privilege to create a new server.');
                done();
            });
        });
    });

    describe('Sql server exists, but sql database does not exist', function () {
    
        before(function () {
            msRestRequest.PUT = sinon.stub();
            msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name')
                .yields(null, {statusCode: 200});
            msRestRequest.GET = sinon.stub();
            msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name/providers/Microsoft.DBforMySQL/servers/fake-server-name')
                .yields(null,
                        {statusCode: HttpStatus.OK},
                        '{"properties": { "fullyQualifiedDomainName": "fake-fqdn"}}'
                );
            //get database
            sinon.stub(mysqldbOps, 'executeSql').yields(null, []);
        });
    
        after(function () {
            mysqldbOps.executeSql.restore();
        });
        
        it('should not callback error', function (done) {
    
            cp.provision(mysqldbOps, function (err, result) {
                should.not.exist(err);
                should.exist(result.body.resourceGroup);
                should.exist(result.body.mysqlServerName);
                should.exist(result.body.mysqldbName);
                should.exist(result.body.administratorLogin);
                should.exist(result.body.administratorLoginPassword);
                done();
            });
    
        });
    });

});

describe('MySqlDb - Provision - Firewall rules', function () {
    var params = {};
    var cp;

    describe('Parameter validation should succeed if ...', function () {
        before(function () {
            params = {
                instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
                plan_id: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
                parameters: {      // developer's input parameters file
                    resourceGroup: 'fake-resource-group-name',
                    location: 'westus',
                    mysqlServerName: 'fake-server-name',
                    mysqlServerParameters: {
                        allowMysqlServerFirewallRules: [{
                            ruleName: 'newrule',
                            startIpAddress: '0.0.0.0',
                            endIpAddress: '255.255.255.255'
                        }],
                        properties: {
                            administratorLogin: 'fake-server-name',
                            administratorLoginPassword: 'c1oudc0w'
                        }
                    },
                    mysqldbName: 'fake-db-name'
                },
                azure: azure,
                privilege: {
                    'mysqldb': {
                        'allowToCreateMysqlServer': true
                    }
                },
                accountPool:{mysql:{}}
            };
            cp = new cmdProvision(params);
            
        });

        it('correct firewall rule specs are given', function (done) {
            (cp.getInvalidParams().length).should.equal(0);
            done();
        });
    });
    
    describe('Incorrect firewall rule specs are given', function () {
        before(function () {
            params = {
                instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
                plan_id: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
                parameters: {      // developer's input parameters file
                    resourceGroup: 'fake-resource-group-name',
                    location: 'westus',
                    mysqlServerName: 'fake-server-name',
                    mysqlServerParameters: {
                        properties: {
                            administratorLogin: 'fake-server-name',
                            administratorLoginPassword: 'c1oudc0w'
                        }
                    },
                    mysqldbName: 'fake-db-name'
                },
                azure: azure,
                privilege: {
                    'mysqldb': {
                        'allowToCreateMysqlServer': true
                    }
                },
                accountPool:{mysql:{}}
            };
        });

        describe('no rule name', function () {
            before(function () {
                params.parameters.mysqlServerParameters.allowMysqlServerFirewallRules = [{
                    startIpAddress: '0.0.0.0',
                    endIpAddress: '255.255.255.255'
                }];
            });
            it('Parameter validation should fail', function (done) {
                cp = new cmdProvision(params);
                
                (cp.getInvalidParams())[0].should.equal('allowMysqlServerFirewallRules');
                done();
            });
        });

        describe('no start IP address', function () {
            before(function () {
                params.parameters.mysqlServerParameters.allowMysqlServerFirewallRules = [{
                    ruleName: 'new rule',
                    endIpAddress: '255.255.255.255'
                }];
            });
            it('Parameter validation should fail', function (done) {
                cp = new cmdProvision(params);
                
                (cp.getInvalidParams())[0].should.equal('allowMysqlServerFirewallRules');
                done();
            });
        });

        describe('no end IP address', function () {
            before(function () {
                params.parameters.mysqlServerParameters.allowMysqlServerFirewallRules = [{
                    ruleName: 'new rule',
                    startIpAddress: '0.0.0.0'
                }];
            });
            it('Parameter validation should fail', function (done) {
                cp = new cmdProvision(params);
                
                (cp.getInvalidParams())[0].should.equal('allowMysqlServerFirewallRules');
                done();
            });
        });
    });
});
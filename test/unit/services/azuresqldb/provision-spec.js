/*
  good instanceId : e2778b98-0b6b-11e6-9db3-000d3a002ed5
  test: 
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var _ = require('underscore');
var HttpStatus = require('http-status-codes');
var logule = require('logule');
var should = require('should');
var sinon = require('sinon');
var cmdProvision = require('../../../../lib/services/azuresqldb/cmd-provision');
var sqldbOperations = require('../../../../lib/services/azuresqldb/client');
var azure = require('../helpers').azure;
var msRestRequest = require('../../../../lib/common/msRestRequest');

var log = logule.init(module, 'SqlDb-Mocha');
var sqldbOps = new sqldbOperations(log, azure);

var mockingHelper = require('../mockingHelper');
mockingHelper.backup();

describe('SqlDb - Provision - PreConditions', function () {
    var params = {};
    var cp;

    describe('All the required parameters are provided', function () {
        before(function () {
            params = {
                instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
                plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
                parameters: {      // developer's input parameters file
                    resourceGroup: 'fake-resource-group-name',
                    location: 'westus',
                    sqlServerName: 'fake-server-name',
                    sqlServerParameters: {
                        properties: {
                            administratorLogin: 'fake-server-name',
                            administratorLoginPassword: 'c1oudc0w'
                        },
                        tags: {
                            foo: 'bar'
                        }
                    },
                    sqldbName: 'fake-db-name',
                    sqldbParameters: {
                        properties: {
                            collation: 'SQL_Latin1_General_CP1_CI_AS'
                        },
                        tags: {
                            foo: 'bar'
                        }
                    }
                },
                azure: azure,
                privilege: {
                    'sqldb': {
                        'allowToCreateSqlServer': true
                    }
                },
                accountPool:{'sqldb':{}}
            };
            cp = new cmdProvision(log, params);
            cp.fixupParameters();
        });

        it('should succeed to validate the parameters', function (done) {
            (cp.getInvalidParams().length).should.equal(0);
            done();
        });
    });

    describe('a depreciated parameter "sqlServerCreateIfNotExist" is provided', function () {
        before(function () {
            params = {
                instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
                plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
                parameters: {      // developer's input parameters file
                    resourceGroup: 'fake-resource-group-name',
                    location: 'westus',
                    sqlServerName: 'fake-server-name',
                    sqlServerCreateIfNotExist: true,
                    sqlServerParameters: {
                        properties: {
                            administratorLogin: 'fake-server-name',
                            administratorLoginPassword: 'c1oudc0w'
                        },
                        tags: {
                            foo: 'bar'
                        }
                    },
                    sqldbName: 'fake-db-name',
                    sqldbParameters: {
                        properties: {
                            collation: 'SQL_Latin1_General_CP1_CI_AS'
                        },
                        tags: {
                            foo: 'bar'
                        }
                    }
                },
                azure: azure,
                privilege: {
                    'sqldb': {
                        'allowToCreateSqlServer': true
                    }
                },
                accountPool:{sql:{}}
            };
            cp = new cmdProvision(log, params);
            cp.fixupParameters();
        });

        it('should fail to validate the parameters', function (done) {
            (cp.getInvalidParams())[0].should.equal("sqlServerCreateIfNotExist");
            done();
        });
    });

    describe('parameters file is not provided', function () {

        before(function () {
            params = {
                plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
                instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
                azure: azure,
                privilege: {
                    'sqldb': {
                        'allowToCreateSqlServer': true
                    }
                },
                accountPool:{'sqldb':{}}
            };
            cp = new cmdProvision(log, params);
        });

        it('should fail to validate the parameters', function (done) {
            (cp.getInvalidParams().length).should.not.equal(0);
            done();
        });
    });
});

describe('SqlDb - Provision - Execution (allow to create server)', function () {
    var params = {};
    var cp;
    
    before(function () {
        params = {
            instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
            parameters: {      // developer's input parameters file
                resourceGroup: 'fake-resource-group-name',
                location: 'westus',
                sqlServerName: 'fake-server-name',
                sqlServerParameters: {
                    allowSqlServerFirewallRules: [{
                        ruleName: 'newrule',
                        startIpAddress: '0.0.0.0',
                        endIpAddress: '255.255.255.255'
                    }],
                    properties: {
                        administratorLogin: 'fake-server-name',
                        administratorLoginPassword: 'c1oudc0w'
                    }
                },
                sqldbName: 'fake-db-name',
                sqldbParameters: {
                    properties: {
                        collation: 'SQL_Latin1_General_CP1_CI_AS'
                    }
                }
            },
            azure: azure,
            privilege: {
                'sqldb': {
                    'allowToCreateSqlServer': true
                }
            },
            accountPool:{'sqldb':{}}
        };

        cp = new cmdProvision(log, params);
        cp.fixupParameters();
        
        msRestRequest.PUT = sinon.stub();
        msRestRequest.GET = sinon.stub();
        
        // create resource group
        msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name')
            .yields(null, {statusCode: 200});  
        
        // create server
        msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name/providers/Microsoft.Sql/servers/fake-server-name')
            .yields(null, {statusCode: 201}, {properties: {fullyQualifiedDomainName: 'fake-fqdn'}});
        
        // create firewall rule
        msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name/providers/Microsoft.Sql/servers/fake-server-name/firewallRules/newrule')
            .yields(null, {statusCode: 200});
        
        // create db
        msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name/providers/Microsoft.Sql/servers/fake-server-name/databases/fake-db-name')
            .yields(null, {statusCode: 202}, {});
    });

    after(function () {
        mockingHelper.restore();
    });
        
    describe('Server & Database that does not previously exist', function() {

        before(function () {
          msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name/providers/Microsoft.Sql/servers/fake-server-name')
              .yields(null, {statusCode: 404});
          msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name/providers/Microsoft.Sql/servers/fake-server-name/databases/fake-db-name')
              .yields(null, {statusCode: 404});
        });
    
        it('should not callback error', function (done) {
            cp.provision(sqldbOps, function (err, result) {
                should.not.exist(err);
                should.exist(result.body.sqlServerName);
                should.exist(result.body.fullyQualifiedDomainName);
                should.exist(result.body.administratorLogin);
                should.exist(result.body.administratorLoginPassword);
                done();
            });
        });
    });

    describe('Sql server exists, but sql database does not exist', function () {
    
        before(function () {
          msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name/providers/Microsoft.Sql/servers/fake-server-name')
              .yields(null,
                    {statusCode: HttpStatus.OK},
                    '{"properties": { "fullyQualifiedDomainName": "fake-fqdn"}}'
                );
          msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name/providers/Microsoft.Sql/servers/fake-server-name/databases/fake-db-name')
              .yields(null, {statusCode: 404});
        });
    
        it('should not callback error', function (done) {
    
            cp.provision(sqldbOps, function (err, result) {
                should.not.exist(err);
                should.exist(result.body.sqlServerName);
                should.exist(result.body.fullyQualifiedDomainName);
                should.exist(result.body.administratorLogin);
                should.exist(result.body.administratorLoginPassword);
                done();
            });
    
        });
    });

});

describe('SqlDb - Provision - Execution (not allow to create server)', function () {
    var params = {};
    var cp;

    before(function () {
        params = {
            instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
            parameters: {      // developer's input parameters file
                sqlServerName: 'fake-server-name',
                sqldbName: 'fake-db-name',
                sqldbParameters: {
                    properties: {
                        collation: 'SQL_Latin1_General_CP1_CI_AS'
                    }
                }
            },
            azure: azure,
            privilege: {
                'sqldb': {
                    'allowToCreateSqlServer': false
                }
            },
            accountPool:{
                'sqldb': {
                    'fake-server-name': {
                        resourceGroup: 'fake-resource-group-name',
                        location: 'fake-location',
                        administratorLogin: 'fake-server-name',
                        administratorLoginPassword: 'c1oudc0w'
                    }
                }
            }
        };

        cp = new cmdProvision(log, params);
        cp.fixupParameters();
    });
    
    after(function () {
        mockingHelper.restore();
    });

    describe('Server & Database that does not previously exist', function() {

        before(function () {
            msRestRequest.GET = sinon.stub();
            msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name/providers/Microsoft.Sql/servers/fake-server-name')
                .yields(null, {statusCode: 404});
        });
    
        it('should callback error that server not exist', function (done) {
            cp.provision(sqldbOps, function (err, result) {
                should.exist(err);
                err.message.should.equal('The specified server does not exist but you do not have the privilege to create a new server.');
                done();
            });
        });
    });

    describe('Sql server exists, but sql database does not exist', function () {
    
        before(function () {
            msRestRequest.GET = sinon.stub();
            msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name/providers/Microsoft.Sql/servers/fake-server-name')
                .yields(null,
                        {statusCode: HttpStatus.OK},
                        '{"properties": { "fullyQualifiedDomainName": "fake-fqdn"}}'
                );
            msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name/providers/Microsoft.Sql/servers/fake-server-name/databases/fake-db-name')
                .yields(null, {statusCode: 404});
            msRestRequest.PUT = sinon.stub();
            msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name/providers/Microsoft.Sql/servers/fake-server-name/databases/fake-db-name')
                .yields(null, {statusCode: 202}, {});
        });
    
        it('should not callback error', function (done) {
    
            cp.provision(sqldbOps, function (err, result) {
                should.not.exist(err);
                should.exist(result.body.sqlServerName);
                should.exist(result.body.fullyQualifiedDomainName);
                should.exist(result.body.administratorLogin);
                should.exist(result.body.administratorLoginPassword);
                done();
            });
    
        });
    });

});

describe('SqlDb - Provision - Firewall rules', function () {
    var params = {};
    var cp;

    describe('Parameter validation should succeed if ...', function () {
        before(function () {
            params = {
                instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
                plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
                parameters: {      // developer's input parameters file
                    resourceGroup: 'fake-resource-group-name',
                    location: 'westus',
                    sqlServerName: 'fake-server-name',
                    sqlServerParameters: {
                        allowSqlServerFirewallRules: [{
                            ruleName: 'newrule',
                            startIpAddress: '0.0.0.0',
                            endIpAddress: '255.255.255.255'
                        }],
                        properties: {
                            administratorLogin: 'fake-server-name',
                            administratorLoginPassword: 'c1oudc0w'
                        }
                    },
                    sqldbName: 'fake-db-name',
                    sqldbParameters: {
                        properties: {
                            collation: 'SQL_Latin1_General_CP1_CI_AS'
                        }
                    }
                },
                azure: azure,
                privilege: {
                    'sqldb': {
                        'allowToCreateSqlServer': true
                    }
                },
                accountPool:{sql:{}}
            };
            cp = new cmdProvision(log, params);
            cp.fixupParameters();
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
                plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
                parameters: {      // developer's input parameters file
                    resourceGroup: 'fake-resource-group-name',
                    location: 'westus',
                    sqlServerName: 'fake-server-name',
                    sqlServerParameters: {
                        properties: {
                            administratorLogin: 'fake-server-name',
                            administratorLoginPassword: 'c1oudc0w'
                        }
                    },
                    sqldbName: 'fake-db-name',
                    sqldbParameters: {
                        properties: {
                            collation: 'SQL_Latin1_General_CP1_CI_AS'
                        }
                    }
                },
                azure: azure,
                privilege: {
                    'sqldb': {
                        'allowToCreateSqlServer': true
                    }
                },
                accountPool:{sql:{}}
            };
        });

        describe('no rule name', function () {
            before(function () {
                params.parameters.sqlServerParameters.allowSqlServerFirewallRules = [{
                    startIpAddress: '0.0.0.0',
                    endIpAddress: '255.255.255.255'
                }];
            });
            it('Parameter validation should fail', function (done) {
                cp = new cmdProvision(log, params);
                cp.fixupParameters();
                (cp.getInvalidParams())[0].should.equal('allowSqlServerFirewallRules');
                done();
            });
        });

        describe('no start IP address', function () {
            before(function () {
                params.parameters.sqlServerParameters.allowSqlServerFirewallRules = [{
                    ruleName: 'new rule',
                    endIpAddress: '255.255.255.255'
                }];
            });
            it('Parameter validation should fail', function (done) {
                cp = new cmdProvision(log, params);
                cp.fixupParameters();
                (cp.getInvalidParams())[0].should.equal('allowSqlServerFirewallRules');
                done();
            });
        });

        describe('no end IP address', function () {
            before(function () {
                params.parameters.sqlServerParameters.allowSqlServerFirewallRules = [{
                    ruleName: 'new rule',
                    startIpAddress: '0.0.0.0'
                }];
            });
            it('Parameter validation should fail', function (done) {
                cp = new cmdProvision(log, params);
                cp.fixupParameters();
                (cp.getInvalidParams())[0].should.equal('allowSqlServerFirewallRules');
                done();
            });
        });
    });
});
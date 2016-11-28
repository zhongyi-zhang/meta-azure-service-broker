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

var originGet = msRestRequest.GET;
var originPut = msRestRequest.PUT;

describe('SqlDb - Provision - PreConditions', function () {
    var validParams = {};
    var cp;

    before(function () {
        validParams = {
            instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
            parameters: {      // developer's input parameters file
                resourceGroup: 'sqldbResourceGroup',
                sqlServerName: 'azureuser',
                sqlServerCreateIfNotExist: true,
                sqlServerParameters: {
                    location: 'westus',
                    properties: {
                        administratorLogin: 'azureuser',
                        administratorLoginPassword: 'c1oudc0w'
                    },
                    tags: {
                        foo: 'bar'
                    }
                },
                sqldbName: 'azureuserSqlDb',
                sqldbParameters: {
                    properties: {
                        collation: 'SQL_Latin1_General_CP1_CI_AS'
                    },
                    tags: {
                        foo: 'bar'
                    }
                }
            },
            azure: azure
        };
        cp = new cmdProvision(log, validParams);
        cp.fixupParameters();
    });

    describe('Provision should succeed if ...', function () {
        it('all validators succeed', function (done) {
            (cp.allValidatorsSucceed()).should.equal(true);
            done();
        });
    });
});

describe('SqlDb - Provision - PreConditions', function () {
    var validParams = {};
    var cp;

    before(function () {
        validParams = {
            instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
            parameters: {      // developer's input parameters file
                resourceGroup: 'sqldbResourceGroup',
                location: 'westus',
                sqlServerName: 'azureuser',
                sqlServerCreateIfNotExist: true,
                sqlServerParameters: {
                    properties: {
                        administratorLogin: 'azureuser'
                    }
                },
                sqldbName: 'azureuserSqlDb',
                sqldbParameters: {
                    properties: {
                        collation: 'SQL_Latin1_General_CP1_CI_AS'
                    }
                }
            },
            azure: azure
        };
        cp = new cmdProvision(log, validParams);
        cp.fixupParameters();
    });

    describe('Provision should fail if ...', function () {
        it('administrator password is missing', function (done) {
            (cp.allValidatorsSucceed()).should.equal(false);
            done();
        });
    });
});

describe('SqlDb - Provision - PreConditions testing', function () {
    var validParams = {};
    var cp;

    before(function () {
        validParams = {
            instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
            parameters: {      // developer's input parameters file
                resourceGroup: 'sqldbResourceGroup',
                location: 'westus',
                sqlServerName: 'azureuser',
                sqlServerCreateIfNotExist: true,
                sqlServerParameters: {
                    properties: {
                        administratorLoginPassword: 'c1oudc0w'
                    }
                },
                sqldbName: 'azureuserSqlDb',
                sqldbParameters: {
                    properties: {
                        collation: 'SQL_Latin1_General_CP1_CI_AS'
                    }
                }
            },
            azure: azure
        };
        cp = new cmdProvision(log, validParams);
        cp.fixupParameters();
    });

    describe('Provision should fail if ...', function () {
        it('administrator login is missing', function (done) {
            (cp.allValidatorsSucceed()).should.equal(false);
            done();
        });
    });
});

describe('SqlDb - Provision - Invalid PreConditions - missing parameters file', function () {
    var validParams = {};
    var cp;

    before(function () {
        validParams = {
            plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
            instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            azure: azure
        };
        cp = new cmdProvision(log, validParams);
    });

    describe('Provision should fail if ...', function () {
        it('parameters file is not provided', function (done) {
            (cp.allValidatorsSucceed()).should.equal(false);
            done();
        });
    });
});

describe('SqlDb - Provision - Execution - server & Database that does not previously exist', function () {
    var validParams = {};
    var cp;
    
    before(function () {
        validParams = {
            instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
            parameters: {      // developer's input parameters file
                resourceGroup: 'sqldbResourceGroup',
                location: 'westus',
                sqlServerName: 'azureuser',
                sqlServerParameters: {
                    allowSqlServerFirewallRules: [{
                        ruleName: 'newrule',
                        startIpAddress: '0.0.0.0',
                        endIpAddress: '255.255.255.255'
                    }],
                    properties: {
                        administratorLogin: 'azureuser',
                        administratorLoginPassword: 'c1oudc0w'
                    }
                },
                sqldbName: 'azureuserSqlDb',
                sqldbParameters: {
                    properties: {
                        collation: 'SQL_Latin1_General_CP1_CI_AS'
                    }
                }
            },
            azure: azure,
            provisioning_result: '{\"provisioningState\":\"Creating\"}'
        };

        cp = new cmdProvision(log, validParams);
        cp.fixupParameters();
        
        msRestRequest.PUT = sinon.stub();
        msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/sqldbResourceGroup')
          .yields(null, {statusCode: 200});  

        msRestRequest.GET = sinon.stub();
        msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/sqldbResourceGroup/providers/Microsoft.Sql/servers/azureuser')
          .yields(null, {statusCode: 404});
        
        msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/sqldbResourceGroup/providers/Microsoft.Sql/servers/azureuser')
          .yields(null, {statusCode: 201});        
        
        msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/sqldbResourceGroup/providers/Microsoft.Sql/servers/azureuser/firewallRules/newrule')
          .yields(null, {statusCode: 200});
        
        msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/sqldbResourceGroup/providers/Microsoft.Sql/servers/azureuser/databases/azureuserSqlDb')
          .yields(null, {statusCode: 202});
    });

    after(function () {
        msRestRequest.GET = originGet;
        msRestRequest.PUT = originPut;
    });

    it('should not callback error', function (done) {
        cp.provision(sqldbOps, function (err, result) {
            should.not.exist(err);
            done();
        });
    });
});

describe('SqlDb - Provision - Execution - Basic plan, no sql server parameters, sql server exists', function () {
    var validParams = {};
    var cp;

    before(function () {
        validParams = {
            instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
            parameters: {      // developer's input parameters file
                resourceGroup: 'sqldbResourceGroup',
                sqlServerName: 'azureuser',
                sqldbName: 'azureuserSqlDb',
                sqldbParameters: {
                    properties: {
                        collation: 'SQL_Latin1_General_CP1_CI_AS'
                    }
                }
            },
            azure: azure,
            provisioning_result: '{\"provisioningState\":\"Creating\"}'
        };

        cp = new cmdProvision(log, validParams);
        cp.fixupParameters();
        
        msRestRequest.GET = sinon.stub();
        msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/sqldbResourceGroup/providers/Microsoft.Sql/servers/azureuser')
          .yields(null, {statusCode: 200});
    });

    after(function () {
        msRestRequest.GET = originGet;
    });

    it('should callback conflict error', function (done) {
        
        cp.provision(sqldbOps, function (err, result) {
            should.exist(err);
            err.statusCode.should.equal(409);
            done();
        });

    });
});

describe('SqlDb - Provision - Firewall rules', function () {
    var validParams = {};
    var cp;

    describe('Parameter validation should succeed if ...', function () {
        before(function () {
            validParams = {
                instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
                plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
                parameters: {      // developer's input parameters file
                    resourceGroup: 'sqldbResourceGroup',
                    location: 'westus',
                    sqlServerName: 'azureuser',
                    sqlServerParameters: {
                        allowSqlServerFirewallRules: [{
                            ruleName: 'newrule',
                            startIpAddress: '0.0.0.0',
                            endIpAddress: '255.255.255.255'
                        }],
                        properties: {
                            administratorLogin: 'azureuser',
                            administratorLoginPassword: 'c1oudc0w'
                        }
                    },
                    sqldbName: 'azureuserSqlDb',
                    sqldbParameters: {
                        properties: {
                            collation: 'SQL_Latin1_General_CP1_CI_AS'
                        }
                    }
                },
                azure: azure
            };
            cp = new cmdProvision(log, validParams);
            cp.fixupParameters();
        });

        it('correct firewall rule specs are given', function (done) {
            (cp.allValidatorsSucceed()).should.equal(true);
            done();
        });
    });

    describe('Parameter validation should fail if ...', function () {
        before(function () {
            validParams = {
                instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
                plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
                parameters: {      // developer's input parameters file
                    resourceGroup: 'sqldbResourceGroup',
                    location: 'westus',
                    sqlServerName: 'azureuser',                    
                    sqlServerParameters: {
                        allowSqlServerFirewallRules: [{
                            startIpAddress: '0.0.0.0',
                            endIpAddress: '255.255.255.255'
                        }],
                        properties: {
                            administratorLogin: 'azureuser',
                            administratorLoginPassword: 'c1oudc0w'
                        }
                    },
                    sqldbName: 'azureuserSqlDb',
                    sqldbParameters: {
                        properties: {
                            collation: 'SQL_Latin1_General_CP1_CI_AS'
                        }
                    }
                },
                azure: azure
            };
            cp = new cmdProvision(log, validParams);
            cp.fixupParameters();
        });

        it('incorrect firewall rule specs are given - no rule name', function (done) {
            (cp.allValidatorsSucceed()).should.equal(false);
            done();
        });
    });

    describe('Parameter validation should fail if ...', function () {
        before(function () {
            validParams = {
                instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
                plan_id: "3819fdfa-0aaa-11e6-86f4-000d3a002ed5",
                parameters: {      // developer's input parameters file
                    resourceGroup: 'sqldbResourceGroup',
                    location: 'westus',
                    sqlServerName: 'azureuser',
                    sqlServerParameters: {
                        allowSqlServerFirewallRules: [{
                            ruleName: 'newrule',
                            endIpAddress: '255.255.255.255'
                        }],
                        properties: {
                            administratorLogin: 'azureuser',
                            administratorLoginPassword: 'c1oudc0w'
                        }
                    },
                    sqldbName: 'azureuserSqlDb',
                    sqldbParameters: {
                        properties: {
                            collation: 'SQL_Latin1_General_CP1_CI_AS'
                        }
                    }
                },
                azure: azure
            };
            cp = new cmdProvision(log, validParams);
            cp.fixupParameters();
        });

        it('incorrect firewall rule specs are given - no start ip', function (done) {
            (cp.allValidatorsSucceed()).should.equal(false);
            done();
        });
    });
});

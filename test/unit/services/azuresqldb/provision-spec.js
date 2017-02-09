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
var resourceGroupClient = require('../../../../lib/common/resourceGroup-client');
var azure = require('../helpers').azure;

var log = logule.init(module, 'SqlDb-Mocha');
var sqldbOps = new sqldbOperations(log, azure);

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
                        ruleName: 'new rule',
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
    });

    after(function () {
        resourceGroupClient.checkExistence.restore();
        resourceGroupClient.createOrUpdate.restore();
        sqldbOps.createDatabase.restore();
        sqldbOps.createFirewallRule.restore();
        sqldbOps.getServer.restore();
        sqldbOps.createServer.restore();
        sqldbOps.getDatabase.restore();
    });

    it('should not callback error', function (done) {

        sinon.stub(resourceGroupClient, 'checkExistence').yields(null, false);
        sinon.stub(resourceGroupClient, 'createOrUpdate').yields(null, { provisioningState: 'Succeeded' });
        sinon.stub(sqldbOps, 'getServer').yields(null, { statusCode: HttpStatus.NOT_FOUND });
        sinon.stub(sqldbOps, 'createServer').yields(null, { statusCode: HttpStatus.OK });
        sinon.stub(sqldbOps, 'getDatabase').yields(null, { statusCode: HttpStatus.NOT_FOUND });
        sinon.stub(sqldbOps, 'createDatabase').yields(null, {body: {}});
        sinon.stub(sqldbOps, 'createFirewallRule').yields(null, { statusCode: HttpStatus.OK });
        cp.provision(sqldbOps, resourceGroupClient, function (err, result) {
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
    });

    after(function () {
        resourceGroupClient.checkExistence.restore();
        resourceGroupClient.createOrUpdate.restore();
        sqldbOps.createDatabase.restore();
        sqldbOps.getServer.restore();
    });

    it('should callback conflict error', function (done) {

        sinon.stub(resourceGroupClient, 'checkExistence').yields(null, false);
        sinon.stub(resourceGroupClient, 'createOrUpdate').yields(null, { provisioningState: 'Succeeded' });
        sinon.stub(sqldbOps, 'createDatabase').yields(null, {body: {}});
        sinon.stub(sqldbOps, 'getServer').yields(null, { statusCode: HttpStatus.OK });
        cp.provision(sqldbOps, resourceGroupClient, function (err, result) {
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
                            ruleName: 'new rule',
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
                            ruleName: 'new rule',
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



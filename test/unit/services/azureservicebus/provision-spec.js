/*
  good instanceId : b259c5e0-7442-46bc-970c-9912613077dd
  test: 
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var logule = require('logule');
var should = require('should');
var sinon = require('sinon');
var common = require('../../../../lib/common');
var azureservicebus = require('../../../../lib/services/azureservicebus/');
var utils = require('../../../../lib/services/azureservicebus/utils');
var azure = require('../helpers').azure;

var log = logule.init(module, 'ServiceBus-Mocha');

describe('ServiceBus', function() {

  describe('Provisioning', function() {

    before(function() {
      utils.init = sinon.stub();
    });

    describe('When no specific parameters are provided', function() {
      var validParams = {};

      before(function() {
        validParams = {
          instance_id: 'e77a25d2-f58c-11e5-b933-000d3a80e5f5',
          azure: azure,
        };
        sinon.stub(utils, 'checkNamespaceAvailability').yields(null);
        sinon.stub(utils, 'createResourceGroup').yields(null);
        sinon.stub(utils, 'createNamespace').yields(null, 'cloud-foundry-e77a25d2-f58c-11e5-b933-000d3a80e5f5', 'cfe77a25d2-f58c-11e5-b933-000d3a80e5f5');
      });

      after(function() {
        utils.checkNamespaceAvailability.restore();
        utils.createResourceGroup.restore();
        utils.createNamespace.restore();
      });

      it('should return missing parameter error', function(done) {
        azureservicebus.provision(log, validParams, function(
          err, reply, result) {
          err.should.have.property('description', 'The parameters ["resource_group_name","namespace_name","location","type","messaging_tier"] are missing.');
          done();
        });
      });
    });

    describe('When specific parameters are provided and but incompleted', function() {
      var validParams = {};

      before(function() {
        validParams = {
          instance_id: 'e77a25d2-f58c-11e5-b933-000d3a80e5f5',
          azure: azure,
          parameters: {
            resource_group_name: 'mysbtest',
            namespace_name: 'mysb',
            location: 'westus',
            messaging_tier: 'Standard'
          }
        };
        sinon.stub(utils, 'checkNamespaceAvailability').yields(null);
        sinon.stub(utils, 'createResourceGroup').yields(null);
        sinon.stub(utils, 'createNamespace').yields(null, 'mysbtest', 'mysb');
      });

      after(function() {
        utils.checkNamespaceAvailability.restore();
        utils.createResourceGroup.restore();
        utils.createNamespace.restore();
      });

      it('should return missing parameter error', function(done) {
        azureservicebus.provision(log, validParams, function(
          err, reply, result) {
          err.should.have.property('description', 'The parameters ["type"] are missing.');
          done();
        });
      });
    });

    describe('When specific parameters are provided and valid', function() {
      var validParams = {};

      before(function() {
        validParams = {
          instance_id: 'e77a25d2-f58c-11e5-b933-000d3a80e5f5',
          azure: azure,
          parameters: {
            resource_group_name: 'mysbtest',
            namespace_name: 'mysb',
            location: 'westus',
            type: 'Messaging',
            messaging_tier: 'Standard',
            tags: {
              foo: 'bar'
            }
          }
        };
        sinon.stub(utils, 'checkNamespaceAvailability').yields(null);
        sinon.stub(utils, 'createResourceGroup').yields(null);
        sinon.stub(utils, 'createNamespace').yields(null, 'mysbtest', 'mysb');
      });

      after(function() {
        utils.checkNamespaceAvailability.restore();
        utils.createResourceGroup.restore();
        utils.createNamespace.restore();
      });

      it('should create the namespace', function(done) {
        azureservicebus.provision(log, validParams, function(
          err, reply, result) {
          should.not.exist(err);
          var replyExpected = {
            statusCode: 202,
            code: 'Accepted',
            value: {}
          };
          reply.should.eql(replyExpected);
          var resultExpected = {
              'resourceGroupName': 'mysbtest',
              'namespaceName': 'mysb',
          };
          result.should.eql(resultExpected);

          done();
        });
      });
    });

  });
});

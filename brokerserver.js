'use strict';

var async = require('async');
var fs = require("fs");
var path = require("path");
var common = require('./lib/common');
var msRestRequest = require('./lib/common/msRestRequest');
var Broker = require('./lib/broker');

global.modules = {};

var config = common.getConfigurations();
var broker = new Broker(config);

msRestRequest.init(config.azure, broker.log);

var addListeners = function(serviceId, serviceModule) {
  broker.on('provision-' + serviceId, serviceModule.provision);
  broker.on('poll-' + serviceId, serviceModule.poll);
  broker.on('deprovision-' + serviceId, serviceModule.deprovision);
  broker.on('bind-' + serviceId, serviceModule.bind);
  broker.on('unbind-' + serviceId, serviceModule.unbind);
};

broker.log.info('Starting to collect the service offering and plans of each service module...');

var params = {};
params.azure = config.azure;

var servicesPath = "./lib/services"
var services = [];

fs.readdir(servicesPath, function(err, files) {
  if (err) {
    throw err;
  }

  files.map(function(file) {
    return path.join(servicesPath, file);
  }).filter(function(file) {
    return fs.statSync(file).isDirectory();
  }).forEach(function(file) {
    var serviceModule = require('./' + file);
    serviceModule.catalog(broker.log, params, function(err, service) {
      if (err) {
        throw err;
      } else {
        broker.log.info('Adding listeners for the service %s...', service.name);
        addListeners(service.id, serviceModule);
        services.push(service);
        global.modules[service.id] = serviceModule;
      }
    });
  });
});

broker.on('catalog', function(callback) {
  var reply = {};
  reply.services = services;
  callback(reply);
});

module.exports = broker;

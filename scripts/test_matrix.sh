#!/bin/bash

function get_service {
  case "$1" in
    sqldb)
      service="sqldb"
      ;;
    rediscache)
      service="rediscache"
      ;;
    documentdb)
      service="documentdb"
      ;;
    cosmosdb)
      service="cosmosdb"
      ;;
    storage)
      service="storage"
      ;;
    servicebus)
      service="servicebus"
      ;;
    eventhubs)
      service="eventhubs"
      ;;
    mysqldb)
      service="mysqldb"
      ;;
    postgresqldb)
      service="postgresqldb"
      ;;
    *)
      ;;
  esac
}

function get_plan {
  case "$1" in
    sqldb)
      plan="basic"
      ;;
    mysqldb)
      plan="basic100"
      ;;
    postgresqldb)
      plan="basic100"
      ;;
    *)
      plan="standard"
      ;;
  esac
}

function get_config {
  case "$1" in
    sqldb)
      config='{
        "resourceGroup": "'$resourceGroupName'",
        "location": "'$location'",
        "sqlServerName": "sqlserver-'$(cat /proc/sys/kernel/random/uuid)'",
        "sqlServerParameters": {
            "allowSqlServerFirewallRules": [
                {
                  "ruleName": "all",
                  "startIpAddress": "0.0.0.0",
                  "endIpAddress": "255.255.255.255"
                }
            ],
            "properties": {
                "administratorLogin": "azureuser",
                "administratorLoginPassword": "Password1234"
            }
        },
        "sqldbName": "sqldb-'$(cat /proc/sys/kernel/random/uuid)'",
        "sqldbParameters": {
            "properties": {
                "collation": "SQL_Latin1_General_CP1_CI_AS"
            }
        }
      }'
      ;;
    rediscache)
      config='{
        "resourceGroup": "'$resourceGroupName'",
        "location": "'$location'",
        "cacheName": "redis-'$(cat /proc/sys/kernel/random/uuid)'",
        "parameters": {
          "enableNonSslPort": false,
          "sku": {
            "name": "Basic",
            "family": "C",
            "capacity": 0
          }
        }
      }'
      ;;
    documentdb)
      config='{
        "resourceGroup": "'$resourceGroupName'",
        "location": "'$location'",
        "docDbAccountName": "'$(cat /proc/sys/kernel/random/uuid)'",
        "docDbName": "docdb-'$(cat /proc/sys/kernel/random/uuid)'"
      }'
      ;;
    cosmosdb)
      config='{
        "resourceGroup": "'$resourceGroupName'",
        "location": "'$location'",
        "docDbAccountName": "'$(cat /proc/sys/kernel/random/uuid)'",
        "docDbName": "docdb-'$(cat /proc/sys/kernel/random/uuid)'",
        "kind": "DocumentDB"
      }'
      ;;
    storage)
      config='{
        "resourceGroup": "'$resourceGroupName'",
        "location": "'$location'",
        "storageAccountName": "storage'$(cat /dev/urandom | tr -dc "a-z0-9" | fold -w 16 | head -n 1)'",
        "accountType": "Standard_LRS"
      }' 
      ;;
    servicebus)
      config='{
        "resourceGroup": "'$resourceGroupName'",
        "location": "'$location'",
        "namespaceName": "servicebus-'$(cat /proc/sys/kernel/random/uuid)'"
      }'
      ;;
    eventhubs)
      config='{
        "resourceGroup": "'$resourceGroupName'",
        "location": "'$location'",
        "namespaceName": "servicebus-'$(cat /proc/sys/kernel/random/uuid)'",
        "eventHubProperties": {
          "messageRetentionInDays": 1,
          "partitionCount": 2
        }
      }'
      ;;
    mysqldb)
      config='{
        "resourceGroup": "'$resourceGroupName'",
        "location": "'$location'",
        "mysqlServerName": "mysql'$(cat /proc/sys/kernel/random/uuid)'",
        "mysqlServerParameters": {
            "allowMysqlServerFirewallRules": [
                {
                  "ruleName": "all",
                  "startIpAddress": "0.0.0.0",
                  "endIpAddress": "255.255.255.255"
                }
            ],
            "properties": {
                "version": "5.6",
                "sslEnforcement": "Disabled",
                "storageMB": 51200,
                "administratorLogin": "azureuser",
                "administratorLoginPassword": "Password1234"
            }
        },
        "mysqlDatabaseName": "mysql'$(cat /dev/urandom | tr -dc "a-z0-9" | fold -w 10 | head -n 1)'"
      }'
      ;;
    postgresqldb)
      config='{
        "resourceGroup": "'$resourceGroupName'",
        "location": "'$location'",
        "postgresqlServerName": "pgsql'$(cat /proc/sys/kernel/random/uuid)'",
        "postgresqlServerParameters": {
            "allowPostgresqlServerFirewallRules": [
                {
                  "ruleName": "all",
                  "startIpAddress": "0.0.0.0",
                  "endIpAddress": "255.255.255.255"
                }
            ],
            "properties": {
                "version": "9.6",
                "sslEnforcement": "Disabled",
                "storageMB": 51200,
                "administratorLogin": "azureuser",
                "administratorLoginPassword": "Password1234"
            }
        },
        "postgresqlDatabaseName": "pgsql'$(cat /dev/urandom | tr -dc "a-z0-9" | fold -w 10 | head -n 1)'"
      }'
      ;;
    *)
      ;;
  esac
}
#!/bin/bash

# Please ensure no cf service running before testing

#jobs:
#  1.Create instances for a service
#  2.Delete/Create instances for a service
#  3.Delete instances for a service
#  4.Back to 1 to test another service

services_to_test="sqldb rediscache documentdb storage servicebus"
tmp=.tmp
threads=1
location=westus

resourceGroupName=cloud-foundry-$(cat /proc/sys/kernel/random/uuid)
echo resource group for test: $resourceGroupName

function wait_tasks_done {
  echo wait tasks done...
  while true; do
    stat=`cf services`
    if [[ $stat != *FAILED* ]]; then
      if [[ $stat != *progress* ]]; then
        break
      fi
    fi
    sleep 5
  done
}

function make_config {
  case "$1" in
    sqldb)
      config='{
        "resourceGroup": "'$resourceGroupName'",
        "location": "'$location'",
        "sqlServerName": "sqlserver-'$(cat /proc/sys/kernel/random/uuid)'",
        "sqlServerCreateIfNotExist": true,
        "sqlServerParameters": {
            "allowSqlServerFirewallRule": {
                "ruleName": "new rule",
                "startIpAddress": "0.0.0.0",
                "endIpAddress": "255.255.255.255"
            },
            "location": "'$location'",
            "properties": {
                "administratorLogin": "azureuser",
                "administratorLoginPassword": "Password1234"
            }
        },
        "sqldbName": "sqldb-'$(cat /proc/sys/kernel/random/uuid)'",
        "sqldbParameters": {
            "location": "'$location'",
            "properties": {
                "collation": "SQL_Latin1_General_CP1_CI_AS"
            }
        }
      }'
      ;;
    rediscache)
      config='{
        "resourceGroup": "'$resourceGroupName'",
        "cacheName": "redis-'$(cat /proc/sys/kernel/random/uuid)'",
        "parameters": {
          "location": "'$location'",
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
        "docDbName": "docdb-'$(cat /proc/sys/kernel/random/uuid)'",
        "location": "'$location'"
      }'
      ;;
    storage)
      config='{
        "resource_group_name": "'$resourceGroupName'",
        "storage_account_name": "storage'$(cat /dev/urandom | tr -dc "a-z0-9" | fold -w 16 | head -n 1)'",
        "location": "'$location'",
        "account_type": "Standard_LRS"
      }' 
      ;;
    servicebus)
      config='{
        "resource_group_name": "'$resourceGroupName'",
        "namespace_name": "servicebus-'$(cat /proc/sys/kernel/random/uuid)'",
        "location": "'$location'",
        "type": "Messaging",
        "messaging_tier": "Standard"
      }'
      ;;
    *)
      ;;
esac
}

function make_plan {
  if [[ $1 == sqldb || $1 == rediscache ]]; then
    plan="basic"
  else
    plan="standard"
  fi
}

for service in $services_to_test; do
  echo testing $service ......

  #create service instances
  rm $tmp
  pids=""
  i=0
  while [ $i -lt $threads ]; do
    {
      make_config $service 
      make_plan $service
      result=`cf create-service azure-$service $plan $service$i -c "$config"`
      if [[ $result == *OK* ]]; then
        echo "OK" >>$tmp
      else
        echo ERR: $result
      fi
    } &
    pids="$pids $!"
    let ++i
  done
  
  wait $pids
  create_requests=$(grep -o 'OK' <<< $(<$tmp) | wc -l)
  echo $create_requests/$threads $service creating requests sent successfully.
  
  wait_tasks_done
  succs=$(grep -o 'succeeded' <<< "$stat" | wc -l)
  echo $succs/$create_requests $service service instances created successfully.
  
  #delete/create service instances
  rm $tmp
  pids=""
  i=0
  while [  $i -lt $threads ]; do
    {
      result=`cf delete-service $service$i -f`
      if [[ $result == *OK* ]]; then
        if [[ $result != *exist* ]]; then
          echo "DELETED" >>$tmp
        fi
      else
        echo ERR: $result
      fi
    } &
    pids="$pids $!"
    {
      make_config $service
      make_plan $service
      result=`cf create-service azure-$service $plan $service$i/2 -c "$config"`
      if [[ $result == *OK* ]]; then
        echo "OK" >>$tmp
      else
        echo ERR: $result
      fi
    } &
    pids="$pids $!"
    let ++i
  done
  
  wait $pids
  delete_requests=$(grep -o 'DELETED' <<< $(<$tmp) | wc -l)
  echo $delete_requests/$create_requests $service deleting requests sent successfully.
  create_requests=$(grep -o 'OK' <<< $(<$tmp) | wc -l)
  echo $create_requests/$threads $service creating requests sent successfully.

  wait_tasks_done

  #delete service instances
  rm $tmp
  pids=""
  i=0
  while [  $i -lt $threads ]; do
    {
      result=`cf delete-service $service$i/2 -f`
      if [[ $result == *OK* ]]; then
        if [[ $result != *"does not exist"* ]]; then
          echo "DELETED" >>$tmp
        fi
      else
        echo ERR: $result
      fi
    } &
    pids="$pids $!"
    let ++i
  done

  wait $pids
  delete_requests=$(grep -o 'DELETED' <<< $(<$tmp) | wc -l)
  echo $delete_requests/$create_requests $service deleting requests sent successfully.

  wait_tasks_done
done

rm $tmp

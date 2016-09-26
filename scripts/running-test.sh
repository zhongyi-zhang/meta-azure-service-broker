#!/bin/bash

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

resourceGroupName=cloud-foundry-$(cat /proc/sys/kernel/random/uuid)
echo resource group for test: $resourceGroupName
location=westus
service=storageblob
plan=standard
config='{
  "resource_group_name": "'$resourceGroupName'",
  "storage_account_name": "storage'$(cat /dev/urandom | tr -dc "a-z0-9" | fold -w 16 | head -n 1)'",
  "container_name": "mycontainer",
  "location": "'$location'",
  "account_type": "Standard_LRS"
}'

random_string=$(cat /dev/urandom | tr -dc "a-z0-9" | fold -w 16 | head -n 1)
cf create-service azure-$service $plan $service$random_string -c "$config"

wait_tasks_done

cf delete-service $service$random_string -f

wait_tasks_done

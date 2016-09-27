#!/bin/bash

get_random_string() {
  eval ${1}=$(cat /dev/urandom | tr -dc 'a-z0-9' | fold -w $2 | head -n 1)
}

wait_tasks_done() {
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

gourpSuffix=
get_random_string "gourpSuffix" 16
resourceGroupName=cloud-foundry-$gourpSuffix
echo resource group for test: $resourceGroupName
location=westus
service=storageblob
plan=standard
accountSuffix=
get_random_string "accountSuffix" 16
config='{
  "resource_group_name": "'$resourceGroupName'",
  "storage_account_name": "cfsa'$accountSuffix'",
  "container_name": "mycontainer",
  "location": "'$location'",
  "account_type": "Standard_LRS"
}'

instanceSuffix=
get_random_string "instanceSuffix" 16
cf create-service azure-$service $plan $service$instanceSuffix -c "$config"

wait_tasks_done

cf delete-service $service$instanceSuffix -f

wait_tasks_done

#!/bin/bash

# Please ensure no cf service is running before testing

# A resource group for test need to be manully deleted after testing.

#jobs:
#  1.Create instances
#  2.Delete instances

cases_to_test="sqldb rediscache documentdb storage eventhubs servicebus cosmosdb mysqldb postgresqldb"
tmp=.tmp
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

. test_matrix.sh

#create service instances
rm $tmp
pids=""
for case in $cases_to_test; do
  echo creating $case ......
  {
    get_service $case
    get_plan $case    
    get_config $case 
    result=`cf create-service azure-$service $plan $case -c "$config"`
    if [[ $result == *OK* ]]; then
      echo "OK" >>$tmp
    else
      echo ERR: $result
    fi
  } &
  pids="$pids $!"
done
  
wait $pids
create_requests=$(grep -o 'OK' <<< $(<$tmp) | wc -l)
echo $create_requests creating requests sent successfully.

wait_tasks_done
cf services | grep "failed"
succs=$(grep -o 'succeeded' <<< "$stat" | wc -l)
echo $succs/$create_requests service instances created successfully.
  
#delete service instances
rm $tmp
pids=""
i=0
for case in $cases_to_test; do
  {
    result=`cf delete-service $case -f`
    if [[ $result == *OK* ]]; then
      if [[ $result != *exist* ]]; then
        echo "OK" >>$tmp
      fi
    else
      echo ERR: $result
    fi
  } &
  pids="$pids $!"
  let ++i
done
  
wait $pids
delete_requests=$(grep -o 'OK' <<< $(<$tmp) | wc -l)
echo $delete_requests/$create_requests deleting requests sent successfully.

wait_tasks_done

rm $tmp

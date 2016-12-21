#!/bin/bash
case $1 in
  stop)
    docker stop mongo
    docker rm mongo
  ;;
  build)
    docker build . --tag madrid-traffic-data
  ;;
  publish)
    docker build . --tag madrid-traffic-data:latest
    docker login
    docker push azazeln28/madrid-traffic-data
  ;;
  start)
    if [[ ! -d $(pwd)/db ]]; then
      mkdir -p db
    fi

    docker run --name mongo -v $(pwd)/db:/data/db -v $(pwd):/data/extras -d madrid-traffic-data
    if [[ $? != 0 ]]; then
      docker stop mongo
      docker rm mongo
    else
      docker exec -i -t mongo bash
    fi
  ;;
esac


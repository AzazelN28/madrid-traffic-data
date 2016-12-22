#!/bin/bash
case $1 in
  stop)
    docker stop mongo
    docker rm mongo
  ;;
  build)
    docker build . --tag azazeln28/madrid-traffic-data:latest
  ;;
  publish)
    docker build . --tag azazeln28/madrid-traffic-data:latest
    docker login
    docker push azazeln28/madrid-traffic-data
  ;;
  feed)
    if [[ ! -d $(pwd)/db ]]; then
      mkdir -p db
    fi

    docker run --name madrid-traffic-mongo -v $(pwd)/db:/data/db -v $(pwd):/data/extras -d azazeln28/madrid-traffic-data
    if [[ $? != 0 ]]; then
      docker stop madrid-traffic-mongo
      docker rm madrid-traffic-mongo
    else
      docker exec -i -t madrid-traffic-mongo bash
    fi
  ;;
  start)
    if [[ ! -d $(pwd)/db ]]; then
      mkdir -p db
    fi

    docker run --name madrid-traffic-mongo -d azazeln28/madrid-traffic-data
    if [[ $? != 0 ]]; then
      docker stop madrid-traffic-mongo
      docker rm madrid-traffic-mongo
    else
      docker exec -i -t madrid-traffic-mongo bash
    fi
  ;;
esac


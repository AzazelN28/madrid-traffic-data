FROM mongo:latest

RUN apt-get update && apt-get install unzip

ENTRYPOINT ["/entrypoint.sh"]
EXPOSE 27017
CMD ["mongod"]

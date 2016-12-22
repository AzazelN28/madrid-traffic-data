FROM mongo:latest

COPY db/* /data/db/
RUN rm -rf /data/db/mongod.lock

ENTRYPOINT ["/entrypoint.sh"]
EXPOSE 27017
CMD ["mongod"]

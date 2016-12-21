FROM mongo:latest

COPY db/* /data/db/

ENTRYPOINT ["/entrypoint.sh"]
EXPOSE 27017
CMD ["mongod"]

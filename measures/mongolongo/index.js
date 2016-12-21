const cluster = require("cluster");
const path = require("path");
const fs = require("fs");
const os = require("os");
const CPUS = Math.round(os.cpus().length * 0.5);

const colors = {
  RED: "\x1B[0;31m",
  GREEN: "\x1B[0;32m",
  YELLOW: "\x1B[0;33m",
  BLUE: "\x1B[0;34m",
  MAGENTA: "\x1B[0;35m",
  CYAN: "\x1B[0;36m",
  GRAY: "\x1B[0;37m",
  RESET: "\x1B[0m"
};

const [,,infile,host] = process.argv;
if (cluster.isMaster) {

  console.log(`Abriendo ${colors.CYAN}${infile}${colors.RESET}`);
  fs.stat(infile, (err, stat) => {
    if (err && err.code === "ENOENT") {
      console.error(`No se pudo abrir ${colors.CYAN}${infile}${colors.RESET}`);
      process.exit(1);
    }
    if (stat.isFile() && stat.size > 0) {
      const CHUNK_SIZE_PER_CPU = Math.round(stat.size / CPUS);
      const fd = fs.openSync(infile, "r");
      const offsets = [];
      let startOffset = 0;
      for (let cpu = 1; cpu < CPUS; cpu++) {
        const endOffset = cpu * CHUNK_SIZE_PER_CPU;
        let buffer = Buffer.allocUnsafe(512);
        let bytesRead = 0;
        let index = -1;
        while (index < 0) {
          bytesRead = fs.readSync(fd, buffer, 0, 512, endOffset);
          if (bytesRead < 512) {
            index = bytesRead;
          } else {
            index = buffer.indexOf("\r\n");
          }
        }
        const preciseEndOffset = endOffset + index;
        offsets.push([startOffset, preciseEndOffset]);
        startOffset = preciseEndOffset;
      }
      offsets.push([startOffset, stat.size]);
      console.log(offsets.length);
      fs.closeSync(fd);
      const workers = [];
      for (let index = 0; index < offsets.length; index++) {
        const offset = offsets[index];
        const [start,end] = offset;
        workers.push(cluster.fork({
          FILE_INDEX: index,
          FILE_NAME: infile,
          FILE_START: start,
          FILE_END: end,
          FILE_CHUNK_SIZE: end - start
        }));
      }

      function onExit(worker) {
        return new Promise((resolve,reject) => {
          worker.on("exit", (worker,code,signal) => {
            console.log(`Proceso ${worker} terminó`);
            if (code != 0) {
              return reject();
            }
            return resolve();
          });
        });
      }

      Promise.all(workers.map((worker) => {
        return onExit(worker);
      })).then(() => {
        process.exit(0);
      });

    } else {
      console.error(`No es un archivo o tiene 0 bytes`);
      process.exit(1);
    }
  });

} else {

  const mongoose = require("mongoose");

  mongoose.Promise = global.Promise;
  mongoose.connect(`mongodb://${host}/madrid-traffic`).then(() => {

    const MeasurePointSchema = new mongoose.Schema({
      id: Number,
      created: Date,
      device: String,
      kind: Number,
      type: Number,
      intensity: Number,
      occupancy: Number,
      load: Number,
      average: Number,
      error: String,
      period: Number
    });

    const MeasurePoint = mongoose.model("measurePoint", MeasurePointSchema);

    let saved = 0;
    let errored = 0;
    const {FILE_NAME,FILE_INDEX,FILE_START,FILE_END,FILE_CHUNK_SIZE} = process.env;
    console.log(`Proceso ${colors.CYAN}${process.pid}${colors.RESET} ${FILE_NAME} ${FILE_START} ${FILE_END}`);
    fs.open(FILE_NAME, "r", (err, fd) => {
      console.log(`${process.pid}: ${FILE_NAME} abierto`);
      const buffer = Buffer.allocUnsafe(parseInt(FILE_CHUNK_SIZE,10));
      console.log(`${process.pid}: Reservando ${FILE_CHUNK_SIZE}`);
      fs.read(fd, buffer, 0, buffer.length, parseInt(FILE_START, 10), (err, bytesRead, buffer) => {
        const data = buffer.toString("utf-8");
        const rows = data
          .split("\r\n")
          .map((line) => line.split(";"))
          .filter((line,index) => {
            if (FILE_INDEX === 0 && index === 0) {
              return false;
            }
            return line.length > 1;
          })
          .map((line) => {
            const [id,created,device,kind,type,intensity,occupancy,load,average,error,period] = line;
            return {
              id: parseInt(id, 10),
              created: new Date(created),
              device,
              kind,
              type,
              intensity,
              occupancy,
              load,
              average,
              error,
              period
            };
          })
          .forEach((row) => {
            console.log(`\x1B[${FILE_INDEX};0H\x1B[2K${saved}\x1B[${FILE_INDEX};10H${errored}`);
            MeasurePoint.create(row).then(() => {
              saved++;
            }).catch((err) => {
              errored++;
            });
          });

        fs.close(fd, (err) => {
          if (err) {
            console.error(`${process.pid}: No se pudo cerrar ${colors.CYAN}${FILE_NAME}${colors.RESET} correctamente`);
          }
          console.log(`${process.pid}: Cerrado ${colors.CYAN}${FILE_NAME}${colors.RESET}`);
          process.exit(0);
        });
      });
    });

  });

}

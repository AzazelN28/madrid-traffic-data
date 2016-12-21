const {MongoClient} = require("mongodb");
const fs = require("fs");
const iconv = require("iconv-lite");
const readline = require("readline");
const [,,file,host] = process.argv;

function areUndefined(...values) {
  for (let value of values) {
    if (typeof value === "undefined") {
      return true;
    }
  }
  return false;
}

function asString(value) {
  if (value.indexOf('"') >= 0) {
    return value.replace(/"/g,"");
  }
  return value;
}

function asDate(value) {
  return new Date(asString(value));
}

function asFloat(value) {
  return parseFloat(asString(value));
}

function asInt(value) {
  return parseInt(asString(value),10);
}

MongoClient.connect(`mongodb://${host}/madrid-traffic`, function(err, db) {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  let inserted = 0;
  let errored = 0;
  let numOfColumns = 0;

  setInterval(() => {
    process.stdout.write(`\x1B[8;4H;\x1B[2KInsertados: \x1B[0;32m${inserted}\x1B[0m`);
    process.stdout.write(`\x1B[9;4H;\x1B[2KFallidos: \x1B[0;31m${errored}\x1B[0m`);
  }, 1000);

  const measurePoints = db.collection("measurePoints");

  const lineReader = readline.createInterface({
    input: fs.createReadStream(file, { encoding: "utf-8" })
  });

  lineReader.on("close", () => {
    db.close(function() {
      console.log("\x1B[11;0H\x1B[2KTerminado");
      process.exit(0);
    });
  });

  lineReader.on("line", (line) => {
    if (!numOfColumns) {
      numOfColumns = line.split(";").length;
      return;
    }

    const columns = line.split(";");
    if (columns.length <= 1) {
      return;
    }

    let doc;
    if (numOfColumns === 11) {
      const [id,created,device,kind,type,intensity,occupancy,load,average,error,period] = columns;
      if (areUndefined(id,created,device,kind,type,intensity,occupancy,load,average,error,period)) {
        errored++;
        return;
      }

      doc = {
        id: asInt(id),
        created: asDate(created),
        device: asString(device),
        kind: asString(kind),
        type: asString(type),
        intensity: asInt(intensity),
        occupancy: asInt(occupancy),
        load: asInt(load),
        average: asInt(average),
        error: asString(error),
        period: asInt(period)
      };
    } else if(numOfColumns === 10) {
      const [id,created,device,kind,intensity,occupancy,load,average,error,period] = columns;
      if (areUndefined(id,created,device,kind,intensity,occupancy,load,average,error,period)) {
        errored++;
        return;
      }

      doc = {
        id: asInt(id),
        created: asDate(created),
        device: asString(device),
        kind: asString(kind),
        intensity: asInt(intensity),
        occupancy: asInt(occupancy),
        load: asInt(load),
        average: asInt(average),
        error: asString(error),
        period: asInt(period)
      };
    }

    measurePoints.insertOne(doc, { w: 1 }, (err, result) => {
      if (err) {
        errored++;
      } else {
        inserted++;
      }
    });

  });

});

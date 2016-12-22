const fs = require("fs");
const readline = require("readline");
const [,,year,month] = process.argv;

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

function loadLocations(file) {
  return JSON.parse(fs.readFileSync(file, { encoding: "utf-8" }));
}

function pack(year, month) {

  const locations = loadLocations("locations.json");

  let inserted = 0;
  let errored = 0;
  let ignored = 0;

  let numOfColumns = 0;
  let start = null;

  const inputFile = `../data/${month}-${year}.csv`;
  const outputFile = `../data/${month}-${year}.bin`;

  const output = fs.createWriteStream(outputFile, { encoding: "utf-8" });
  const buffer = Buffer.alloc(16);
  function writeEntry(id,value,date) {
    const location = locations.find((item) => item.id == id);
    if (location && location.location) {
      const [lat,lng] = location.location.coordinates;
      const time = date.getTime() - start.getTime();

      buffer.fill(0);

      buffer.writeFloatBE(lat);
      buffer.writeFloatBE(lng);
      buffer.writeFloatBE(value);
      buffer.writeFloatBE(time);

      output.write(buffer);

      console.log(`${lat} ${lng} ${value} ${time}`);

      inserted++;
    } else {
      ignored++;
    }
  }

  const lineReader = readline.createInterface({
    input: fs.createReadStream(inputFile, { encoding: "utf-8" })
  });

  lineReader.on("close", () => {
    output.end();
    process.exit(0);
  });

  lineReader.on("line", (line) => {
    if (!numOfColumns) {
      numOfColumns = line.split(";").length;
      return;
    }

    const columns = line.split(";");
    if (columns.length <= 1) {
      ignored++;
      return;
    }

    if (numOfColumns === 11) {
      const [id,created,device,kind,type,intensity,occupancy,load,average,error,period] = columns;
      if (areUndefined(id,created,device,kind,type,intensity,occupancy,load,average,error,period)) {
        errored++;
        return;
      }

      if (start === null) {
        start = asDate(created);
      }

      writeEntry(id,asInt(load),asDate(created));
    } else if(numOfColumns === 10) {
      const [id,created,device,kind,intensity,occupancy,load,average,error,period] = columns;
      if (areUndefined(id,created,device,kind,intensity,occupancy,load,average,error,period)) {
        errored++;
        return;
      }

      if (start === null) {
        start = asDate(created);
      }

      writeEntry(id,asInt(load),asDate(created));
    }

    //console.log(`\x1B[0;0H\x1B[2K\x1B[0;32m${inserted} \x1B[0;31m${errored} \x1B[0;33m${ignored}\x1B[0m`);
  });

}

pack(year,month);

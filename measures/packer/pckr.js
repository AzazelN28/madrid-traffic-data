const locations = require("./locations");
const chalk = require("chalk");
const path = require("path");
const fs = require("fs");
const rl = require("readline");
const argv = require("minimist")(process.argv.slice(2));

if (!argv["i"] && !argv["in"]) {
  showUsage();
}

const PI_180 = Math.PI / 180;
const PI_4 = Math.PI * 4;

function latLongToXY(out, lat, lng) {
  const sin = Math.sin(lat * PI_180);
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (PI_4)) * 256;
  const x = ((long + 180) / 360) * 256;
  out[0] = x;
  out[1] = y;
  return out;
}

function longitudeToX(value) {
  if (lng > 180) {
    return 256 * (lng / 360 - 0.5);
  }
  return 256 * (lng / 360 + 0.5);
}

function latitudeToY(value) {
  return 128 * (1 - Math.log(Math.tan((0.25 + value / 360) * Math.PI)) / Math.PI);
}

function showUsage() {
  process.stdout.write(`
Uso: ${path.basename(process.argv[1])} -i <csv> -o <bin> -l <lines> -r

Opciones
  -i, --in=FILE     Archivo CSV
  -o, --out=FILE    Archivo de salida (por defecto será el nombre de entrada acabado en .bin)
  -r, --resume      Indica si continúa con un archivo inacabado en el punto en el que se dejó
  -l, --lines       Indica el número de líneas a procesar

Hecho con ${chalk.bold.red("♥")} por ${chalk.bold.red("ROJO 2")} (http://rojo2.com)\n`);
  process.exit(1);
}

/**
 * Muestra el cursor de la consola.
 */
function showCursor() {
  process.stdout.write("\x1B[?25h");
}

/**
 * Oculta el cursor de la consola.
 */
function hideCursor() {
  process.stdout.write("\x1B[?25l");
}

/**
 * Muestra el progreso.
 */
function showStats(stats) {
  process.stdout.write(`\x1B[sNúmero de líneas procesadas: ${chalk.cyan(stats.lines)} Ok: ${chalk.green(stats.ok)} Fallidas: ${chalk.red(stats.wrong)}\x1B[0m\x1B[u`);
}

/**
 * Cuando el proceso termina volvemos a mostrar el cursor.
 */
process.on("exit", () => {
  showCursor();
});

/**
 * Obtiene el nombre por defecto de la consola.
 */
function getOutputFile(file) {
  return `${path.basename(file, ".csv")}.bin`;
}

const DateRegExp = /^"?([0-9]{4})-([0-9]{2})-([0-9]{2}) ([0-9]{2}):([0-9]{2}):([0-9]{2})"?$/;
const FloatRegExp = /^(-?[0-9]+(?:\.[0-9]+)?)$/;
const IntegerRegExp = /^(-?[0-9]+)$/;
const NaturalRegExp = /^([0-9]+)$/;

const inputFile = argv["in"];
const outputFile = argv["out"] || getOutputFile(argv["in"]);
const totalLines = argv["l"] || argv["lines"] || 0;

const initialDate = new Date(2013,6,1,0,0,0);
const timeFrame = 60000; // minutos

const undefinedLocations = new Set();

/**
 * Esta función lee un archivo CSV y por cada línea llama a una función
 * y cuándo termina llama a otra.
 */
function csv(fileName, progress, complete, totalLines = 0) {
  const reader = rl.createInterface({
    input: fs.createReadStream(fileName)
  });
  let lines = 0;
  reader.on("line", (line) => {
    if (totalLines > 0 && lines == totalLines) {
      reader.close();
    } else {
      lines++;
      progress(line.split(";").map((column) => {
        if (FloatRegExp.test(column)) {
          return parseFloat(column);
        } else if (DateRegExp.test(column)) {
          const [,year,month,day,hours,minutes,seconds] = column.match(DateRegExp);
          return new Date(
            parseInt(year, 10),
            parseInt(month, 10) - 1,
            parseInt(day, 10),
            parseInt(hours, 10),
            parseInt(minutes, 10),
            parseInt(seconds, 10)
          );
        }
        return column;
      }));
    }
  });
  reader.on("close", () => {
    complete();
  });
}

/**
 * Esta función se encarga de convertir un archivo CSV en
 * un archivo binario.
 *
 * @param {string} csvfile
 * @param {string} binfile
 * @param {Function} transform
 * @param {Function} complete
 */
function csv2bin(csvfile, binfile, transform, complete, totalLines = 0) {
  const stream = fs.createWriteStream(binfile);
  const buffer = Buffer.alloc(36);
  const stats = {
    lines: 0,
    wrong: 0,
    ok: 0
  };
  hideCursor();
  csv(csvfile, (columns) => {
    if (stats.lines > 0) {
      buffer.fill(0);
      const result = transform(buffer, ...columns);
      if (result) {
        stats.ok++;
      } else {
        stats.wrong++;
      }
      stream.write(buffer);
    }
    stats.lines++;
    showStats(stats);
  }, () => {
    stream.end();
    complete();
  }, totalLines);
}

/**
 * Realizamos la conversión.
 */
csv2bin(inputFile, outputFile, (buffer, ...columns) => {
  const [id,date,deviceId,deviceType,intensity,occupancy,load,averageSpeed,error,integrationPeriod] = columns;
  const location = locations.findById(id);
  if (location) {
    const [lat,lng] = location.location.coordinates;
    buffer.writeUInt32BE(id, 0);

    buffer.writeFloatBE(lat, 4);
    buffer.writeFloatBE(lng, 8);
    buffer.writeFloatBE((date.getTime() - initialDate.getTime()) / timeFrame, 12);

    buffer.writeFloatBE(intensity, 16);
    buffer.writeFloatBE(occupancy, 20);
    buffer.writeFloatBE(load, 24);
    buffer.writeFloatBE(averageSpeed, 28);

    buffer.writeFloatBE(integrationPeriod, 32);
    return true;
  } else {
    undefinedLocations.add(id);
    return false;
  }
}, () => {
  if (undefinedLocations.size > 0) {
    process.stdout.write("\nLocalizaciones no encontradas");
    for (let undefinedLocation of undefinedLocations) {
      process.stdout.write(`${undefinedLocation}\n`);
    }
  }
}, totalLines);

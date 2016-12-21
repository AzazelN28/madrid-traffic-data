/**
 * Este archivo convierte pmed.csv en un JSON
 * más legible y con más sentido.
 */
const fs = require("fs");
const cp = require("child_process");
const iconv = require("iconv-lite");

function insert(str, pos, chr) {
  return str.slice(0, pos) + chr + str.slice(pos);
}

console.log(
  JSON.stringify(
    iconv.decode(fs.readFileSync("pmed.csv"), "iso-8859-1")
      .split("\r\n")
      .map((line) => line.split(";"))
      .filter((line,index) => line.length > 1 && index > 0)
      .map((row) => {
        const [idelem,tipo_elem,identif,nombre,st_x,st_y] = row;
        const x = parseFloat(insert(st_x.replace(/\./g,""), 6, "."));
        const y = parseFloat(insert(st_y.replace(/\./g,""), 7, "."));
        const command = `cs2cs -f '%.10f' +init=epsg:3042 +to +init=epsg:4326 << EOF\n${x} ${y} 0.0\n`;
        const output = cp.execSync(command, { encoding: "utf-8" });
        const [fullMatch, lat, lng] = output.match(/(-?[0-9]+(?:\.[0-9]+)?)\s(-?[0-9]+(?:\.[0-9]+)?)\s(-?[0-9]+(?:\.[0-9]+)?)/);
        return {
          id: parseInt(idelem),
          type: tipo_elem,
          device: identif,
          description: nombre,
          utm: {
            x,
            y,
          },
          location: {
            lat: parseFloat(lat),
            lng: parseFloat(lng)
          }
        };
      }),
    null,
    "  "
  )
);

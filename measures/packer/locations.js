const locations = require("./locations.json");

module.exports = {
  findById(id) {
    return locations.find((location) => location.id === id);
  },
  findByDeviceId(device) {
    return locations.find((location) => location.device === device);
  },
  list() {
    return locations;
  },
  getBounds() {
    const bounds = {
      max: [],
      min: []
    };

    const latitudes = locations.map((current) => {
      return current.location.coordinates[0];
    });

    const longitudes = locations.map((current) => {
      return current.location.coordinates[1];
    });

    return {
      min: [
        Math.min(...latitudes),
        Math.min(...longitudes)
      ],
      max: [
        Math.max(...latitudes),
        Math.max(...longitudes)
      ]
    };
    return bounds;
  }
};

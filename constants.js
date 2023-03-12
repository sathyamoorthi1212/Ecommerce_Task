var Path = require("path");

module.exports = {
  path: {
    productImagePath: "/img/",
  },
  server: {
    port: 8080,
    uri: "http://localhost:8080",
  },
  database: {
    host: "localhost",
    port: 27017,
    dbname: "Ecommerce",
  },
  status: {
    active: 1,
    inactive: 2,
    deleted: 3,
  },
};

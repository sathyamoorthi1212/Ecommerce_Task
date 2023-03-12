const mongoose = require("mongoose");
const colors = require("colors");
const _C = require("../config/constants");

getConnection = async () => {
  try {
    await mongoose.connect(
      `mongodb://${_C.database.host}:${_C.database.port}/${_C.database.dbname}`
    );

    console.log("Connection with database succeeded.".blue);
  } catch (err) {
    console.log("Connection failed.", err);
  }
};

getConnection();

module.exports = { mongoose };

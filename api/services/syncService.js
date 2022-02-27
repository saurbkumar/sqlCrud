/**
 * Any service/process want's to run before app start
 */
const model = require('../models/model');

module.exports = {
  start: start,
  stop: stop
};
async function start() {
  // create table and constrain
  await model.start();
}
async function stop() {
  await model.close();
}

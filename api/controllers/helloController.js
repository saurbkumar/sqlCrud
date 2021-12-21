const service = require('../service/helloService');
const logger = console;
module.exports = {
  getHello: getHello,
  getHelloId: getHelloId
};

// eslint-disable-next-line no-unused-vars
async function getHello(req, res) {
  try {
    const result = await service.getHello(req.query.name);
    return res.json(result);
  } catch (error) {
    logger.error(`getHello: Error while getHello: ${error}`);
  }
}
async function getHelloId(req, res) {
  return res.send('this is getHelloId ' + req.query.name);
}

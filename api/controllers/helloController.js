module.exports = {
  getHello: getHello,
  getHelloId: getHelloId
};

async function getHello(req, res) {
  return res.send('this is working ' + req.query.name);
}
async function getHelloId(req, res) {
  return res.send('this is getHelloId ' + req.query.name);
}

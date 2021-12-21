module.exports = {
  getHello: getHello,
  getHelloId: getHelloId
};

async function getHello(name) {
  return { name: name };
}
async function getHelloId(req, res) {
  return res.send('this is getHelloId ' + req.query.name);
}

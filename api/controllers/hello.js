module.exports = {
  hello: hello,
  hello1: hello1,
};

async function hello(req, res) {
  return res.send("this is working " + req.query.name);
}
async function hello1(req, res) {
  return res.send("this is working " + req.query.name);
}

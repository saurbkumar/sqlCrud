const express = require("express");
const app = express();
const swaggerUi = require("swagger-ui-express");
const cors = require("cors");
const swaggerDocument = require("./api/swagger/swagger.json");
const helloController = require("./api/controllers/hello");
const port = 3000;

app.use(cors());
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(function (req, res, next) {
  console.log("Time: %d", Date.now());
  next();
});
// app.get("/hello", (req, res) => {
//   res.send("Hello World!");
// });

// read swagger file and attach all path
for (const [path, value] of Object.entries(swaggerDocument.paths)) {
  const controllerId = value.controllerId;
  for (const [method, methodAttr] of Object.entries(value)) {
    const operation = methodAttr.operationId;
    const basePath = "/v1"; // hard coded, later read through config
    let pathPattern = [];
    path.split("/").forEach((element) => {
      if (element.length) {
        if (element.endsWith("}") && element.startsWith("{")) {
          pathPattern.push(`:${element.slice(1, -1)}`);
        } else {
          pathPattern.push(element);
        }
      }
    });
    console.log(pathPattern.join("/"));
  }
}
app.get("/v1/hello", helloController.hello);
app.get("/v1/hello2/:id1/obj/:id2/obj2", helloController.hello1);

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

const app = require('../app').app;
const supertest = require('supertest');
const shortId = require('../api/helpers/shortId');
const logger = require('../logger');
logger('unittest.log').switchToFile();
require('should');
const config = require('config');
const v1BasePath = config.App.v1Path;

describe('HelloService', function () {
  let request;
  let port = Math.floor(Math.random() * 10000);
  before(function () {
    request = supertest.agent(app).host(`http://localhost:${port}`).set({
      'X-Correlation-Id': shortId.generate(),
      'Content-Type': 'application/json'
    });
  });
  describe('GetHello', async function () {
    it('GetNameAndAge', async function () {
      const res = await request
        .get(v1BasePath + '/hello?name=20&age=20')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200);
      res.body.should.have.property;
      res.body.should.have.property('name', '20');
      res.body.should.have.property('age', 20);
    });

    it('GetNameWithoutAge', async function () {
      const res = await request
        .get(v1BasePath + '/hello?name=20')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200);
      res.body.should.have.property('name', '20');
    });

    it('FailGetWithoutName', async function () {
      await request
        .get(v1BasePath + '/hello?age=20')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(400);
    });
    it('FailAdditionalParameter', async function () {
      await request
        .get(v1BasePath + '/hello?name=20&unknown=test')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(400);
    });
  });
});

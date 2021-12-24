const app = require('../app').app;
const supertest = require('supertest');
const shortId = require('../api/helpers/shortId');
const logger = require('../logger');
logger('unittest.log').switchToFile();
require('should');

describe('GET /user', function () {
  let request;
  let port = Math.floor(Math.random() * 10000);
  before(function () {
    request = supertest.agent(app).host(`http://localhost:${port}`).set({
      'X-Correlation-Id': shortId.generate(),
      'Content-Type': 'application/json'
    });
  });
  it('responds with json', async function () {
    const res = await request
      .get('/v1/hello-service/hello?name=20')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);
    res.body.should.have.property;
    res.body.should.have.property('name', '20');
  });
});

const app = require('../app').app;
const request = require('supertest');
let server = 1;
require('should');
/**
 * 1. configure port
 * 2. just use request, no need to pass app again
 * 3. send correlation for every request
 */

describe('GET /user', function () {
  before(function () {
    // runs once before the first test in this block
  });
  it('responds with json', async function () {
    const res = await request(app)
      .get('/v1/hello-service/hello?name=20')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);
    res.body.should.have.property;
    res.body.should.have.property('name', '20');
  });
});

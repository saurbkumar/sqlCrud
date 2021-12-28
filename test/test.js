const App = require('../app');
const supertest = require('supertest');
const shortId = require('../api/helpers/shortId');
const logger = require('../logger');
logger('unittest.log').switchToFile();
require('should');
const config = require('config');
const v1BasePath = config.App.v1Path;

describe('UserService', async function () {
  let request;
  let port = Math.floor(Math.random() * 10000);
  before(async function () {
    request = supertest.agent(App.app).host(`http://localhost:${port}`).set({
      'X-Correlation-Id': shortId.generate(),
      'Content-Type': 'application/json'
    });
    // initialize middle ware - DB connect
    await App.start();
  });

  after(async function () {
    await App.stop();
  });

  afterEach(async function () {
    // delete all resources
    await request
      .delete(v1BasePath + '/users')
      .set('Accept', 'application/json')
      .expect(200);
  });

  function createReq() {
    return {
      name: `name${Math.floor(Math.random() * 10000)}`,
      age: Math.floor(Math.random() * 100),
      address: `Address ${Math.floor(Math.random() * 10000)}`
    };
  }
  describe('CreateUpdateDelete', async function () {
    it('FailAdditionalQueryParameter', async function () {
      await request
        .get(v1BasePath + '/users?skip=20&unknown=test')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(400);
    });

    it('FailGetUserRandomId', async function () {
      // get all users
      let users = await request
        .get(v1BasePath + '/users')
        .set('Accept', 'application/json')
        .expect(200);

      users.body.should.have.property('count', 0);
      users.body.should.have.property('values');
      users.body.values.length.should.be.eql(0);

      await request
        .get(v1BasePath + '/users/' + 'randomId')
        .set('Accept', 'application/json')
        .expect(404);
    });

    it('FailDeleteUserRandomId', async function () {
      const req = createReq();
      const res = await request
        .post(v1BasePath + '/users')
        .set('Accept', 'application/json')
        .send(req)
        .expect(200);
      res.body.should.have.property('name', req.name);
      res.body.should.have.property('age', req.age);
      res.body.should.have.property('address', req.address);
      res.body.should.have.property('id');
      const userId = res.body.id;

      await request
        .delete(v1BasePath + '/users/' + 'randomId')
        .set('Accept', 'application/json')
        .expect(404);
      // get user again and check
      await request
        .get(v1BasePath + '/users/' + userId)
        .set('Accept', 'application/json')
        .expect(200);
    });

    it('getUser', async function () {
      // get all users
      let users = await request
        .get(v1BasePath + '/users')
        .set('Accept', 'application/json')
        .expect(200);

      users.body.should.have.property('count', 0);
      users.body.should.have.property('values');
      users.body.values.length.should.be.eql(0);

      const req = createReq();
      const res = await request
        .post(v1BasePath + '/users')
        .set('Accept', 'application/json')
        .send(req)
        .expect(200);
      res.body.should.have.property('name', req.name);
      res.body.should.have.property('age', req.age);
      res.body.should.have.property('address', req.address);
      res.body.should.have.property('id');
      const userId = res.body.id;

      // get user and check properties
      let user = await request
        .get(v1BasePath + '/users/' + userId)
        .set('Accept', 'application/json')
        .send(req)
        .expect(200);
      user.body.should.have.property('name', req.name);
      user.body.should.have.property('age', req.age);
      user.body.should.have.property('address', req.address);
      user.body.should.have.property('id', userId);
    });

    it('createUser', async function () {
      const req = createReq();
      const res = await request
        .post(v1BasePath + '/users')
        .set('Accept', 'application/json')
        .send(req)
        .expect(200);
      res.body.should.have.property('name', req.name);
      res.body.should.have.property('age', req.age);
      res.body.should.have.property('address', req.address);
      res.body.should.have.property('id');
      const userId = res.body.id;
      // get user and check properties
      const user = await request
        .get(v1BasePath + '/users/' + userId)
        .set('Accept', 'application/json')
        .send(req)
        .expect(200);
      user.body.should.have.property('name', req.name);
      user.body.should.have.property('age', req.age);
      user.body.should.have.property('address', req.address);
      user.body.should.have.property('id', userId);
    });
  });
});

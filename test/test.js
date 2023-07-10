const config = require('config');
require('should');
const sinon = require('sinon');
const querystring = require('querystring');
const util = require('util');
// modify config for unit test
config.Database = config.Unittest.Database;

const App = require('../app');
const supertest = require('supertest');
const shortId = require('../api/helpers/shortId');
const logger = require('../logger');
logger('unittest.log').switchToFile();

const v1BasePath = '/v1/user-service';

const queryHelper = require('../api/helpers/queryHelper');
const healthModel = require('../api/models/healthModel');
const healthService = require('../api/services/healthService');

describe('UserService', async function () {
  let request;
  let port = Math.floor(Math.random() * 10000);
  before(async function () {
    // initialize middleware - DB connect
    await App.start(config.Database);
    request = supertest.agent(App.app).host(`http://localhost:${port}`).set({
      'X-Correlation-Id': shortId.generate(),
      'Content-Type': 'application/json',
      Accept: 'application/json'
    });

    // delete all resources
    await request.delete(v1BasePath + '/users').expect(200);
  });

  after(async function () {
    this.timeout(4000);
    await App.stop();
  });

  afterEach(async function () {
    // delete all resources
    await request.delete(v1BasePath + '/users').expect(200);
  });

  function createReq(count, index) {
    if (count != undefined && index != undefined) {
      return {
        name: `name${count - index}`,
        age: index,
        address: `Address${index}`,
        country: 'USA',
        isActive: index % 2 == 0,
        metadata: { prop1: 'randomValue1', prop2: 'randomValue2' }
      };
    } else {
      return {
        name: `name${Math.floor(Math.random() * 10000)}`,
        age: Math.floor(Math.random() * 100),
        address: `Address ${Math.floor(Math.random() * 10000)}`,
        country: 'USA',
        isActive: false,
        metadata: { prop1: 'randomValue1', prop2: 'randomValue2' }
      };
    }
  }

  function encodeGetParams(p) {
    return Object.entries(p)
      .map((kv) => kv.map(encodeURIComponent).join('='))
      .join('&');
  }

  async function bulkCreateUsers(count) {
    // create n users
    let promises = [];
    for (let index = 0; index < count; index++) {
      const promise = request
        .post(v1BasePath + '/users')
        .send(createReq(count, index))
        .expect(200);
      promises.push(promise);
    }
    // resolve all promises
    await Promise.all(promises);
  }

  function createHealthComponentFunction(
    mockLiveComponents,
    mockReadyComponent
  ) {
    return {
      getLiveComponents: function () {
        return mockLiveComponents;
      },
      getReadyComponents: function () {
        return mockReadyComponent;
      }
    };
  }

  function dummyMockLiveComp() {
    return [];
  }

  function dummyMockReadyComp() {
    return [];
  }

  function mockReadyComp(serivceName, status) {
    async function someServiceReadyMock() {
      return {
        status: status,
        message: `service ${
          status ? '' : 'not'
        } connected, current service state ${status}`
      };
    }
    return [[serivceName, someServiceReadyMock]];
  }

  function mockLiveComp(serviceName, status) {
    async function someServiceLiveMock() {
      return status;
    }

    return [[serviceName, someServiceLiveMock]];
  }

  function checkData(res, field, targetValues) {
    // gather all vales
    const data = new Set(res.body.value.map((user) => user[`${field}`]));
    // check all value
    for (let val of targetValues) {
      data.has(val).should.eql(true);
    }
    data.size.should.eql(targetValues.length);
  }

  describe('AppHealthTest', async function () {
    it('FailReadyCheckWhenDependentComponentFails', async function () {
      let componentStub = sinon.stub(healthModel, 'getComponents');
      // sinon mock
      componentStub.returns(
        createHealthComponentFunction(
          dummyMockLiveComp(),
          mockReadyComp('service1', false)
        )
      );
      let res = await request.get(v1BasePath + '/app/ready').expect(503);

      res.body.should.have.property('status', 'App is not healthy');
      res.body.should.have.property('components');
      res.body.components.length.should.be.eql(1);

      // clear
      healthService.clearHealthComponents(); // need to reset the reference

      // fail ready when one component pass and other fail
      const readyMockComponents = [
        ...mockReadyComp('service1', false),
        ...mockReadyComp('service2', true)
      ];
      // sinon mock
      componentStub.returns(
        createHealthComponentFunction(dummyMockLiveComp(), readyMockComponents)
      );
      res = await request.get(v1BasePath + '/app/ready').expect(503);
      res.body.should.have.property('status', 'App is not healthy');
      res.body.should.have.property('components');
      res.body.components.length.should.be.eql(2);
      // clear
      healthService.clearHealthComponents(); // need to reset the reference
      componentStub.restore();
    });

    it('PassReadyCheckNoDependency', async function () {
      let componentStub = sinon.stub(healthModel, 'getComponents');
      // sinon mock
      componentStub.returns(
        createHealthComponentFunction(dummyMockLiveComp(), dummyMockReadyComp())
      );
      let res = await request.get(v1BasePath + '/app/ready').expect(200);

      res.body.should.have.property('status', 'App is healthy');
      res.body.should.have.property('components');
      res.body.components.length.should.be.eql(0);
      // clear
      healthService.clearHealthComponents(); // need to reset the reference
      componentStub.restore();
    });

    it('PassReadyCheckWhenAllDependencyPass', async function () {
      let componentStub = sinon.stub(healthModel, 'getComponents');
      const readyMockComponents = [
        ...mockReadyComp('service1', true),
        ...mockReadyComp('service2', true)
      ];
      // sinon mock
      componentStub.returns(
        createHealthComponentFunction(dummyMockLiveComp(), readyMockComponents)
      );
      let res = await request.get(v1BasePath + '/app/ready').expect(200);
      res.body.should.have.property('status', 'App is healthy');
      res.body.should.have.property('components');
      res.body.components.length.should.be.eql(2);
      // clear
      healthService.clearHealthComponents(); // need to reset the reference
      componentStub.restore();
    });

    it('FailLiveCheckWhenDependentComponentFails', async function () {
      let componentStub = sinon.stub(healthModel, 'getComponents');
      // sinon mock
      componentStub.returns(
        createHealthComponentFunction(
          mockLiveComp('service1', false),
          dummyMockReadyComp()
        )
      );
      await request.get(v1BasePath + '/app/live').expect(503);

      // clear
      healthService.clearHealthComponents(); // need to reset the reference

      // fail live when one component pass and other fail
      const liveMockComponents = [
        ...mockLiveComp('service1', false),
        ...mockLiveComp('service2', true)
      ];
      // sinon mock
      componentStub.returns(
        createHealthComponentFunction(liveMockComponents, dummyMockReadyComp())
      );
      await request.get(v1BasePath + '/app/live').expect(503);
      // clear
      healthService.clearHealthComponents(); // need to reset the reference
      componentStub.restore();
    });

    it('PassLiveCheckNoDependency', async function () {
      let componentStub = sinon.stub(healthModel, 'getComponents');
      // sinon mock
      componentStub.returns(
        createHealthComponentFunction(dummyMockLiveComp(), dummyMockReadyComp())
      );
      let res = await request.get(v1BasePath + '/app/live').expect(200);

      res.body.should.have.property('status', 'ok');
      // clear
      healthService.clearHealthComponents(); // need to reset the reference
      componentStub.restore();
    });

    it('PassLiveCheckWhenAllDependencyPass', async function () {
      let componentStub = sinon.stub(healthModel, 'getComponents');
      const liveMockComponents = [
        ...mockLiveComp('service1', true),
        ...mockLiveComp('service2', true)
      ];
      // sinon mock
      componentStub.returns(
        createHealthComponentFunction(liveMockComponents, dummyMockReadyComp())
      );
      await request.get(v1BasePath + '/app/live').expect(200);
      // clear
      healthService.clearHealthComponents(); // need to reset the reference
      componentStub.restore();
    });
  });

  describe('CreateUpdateDelete', async function () {
    describe('GetUsers', async function () {
      it('FailAdditionalQueryParameter', async function () {
        await request
          .get(v1BasePath + '/users?skip=20&unknown=test')
          .expect(400);
      });

      it('FailGetUserRandomId', async function () {
        // get all users
        let users = await request.get(v1BasePath + '/users').expect(200);

        users.body.should.have.property('count', 0);
        users.body.should.have.property('value');
        users.body.value.length.should.be.eql(0);

        await request.get(v1BasePath + '/users/' + 'randomId').expect(404);
      });

      it('FailGetUserTooLongUserId', async function () {
        // get all users
        let users = await request.get(v1BasePath + '/users').expect(200);

        users.body.should.have.property('count', 0);
        users.body.should.have.property('value');
        users.body.value.length.should.be.eql(0);

        await request
          .get(v1BasePath + '/users/' + 'thisIsReallyLongUserIsMaxIs12')
          .expect(400);
      });

      it('getUser', async function () {
        // get all users
        let users = await request
          .get(v1BasePath + '/users')

          .expect(200);

        users.body.should.have.property('count', 0);
        users.body.should.have.property('value');
        users.body.value.length.should.be.eql(0);

        const req = createReq();
        const res = await request
          .post(v1BasePath + '/users')
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
          .send(req)
          .expect(200);
        user.body.should.have.property('name', req.name);
        user.body.should.have.property('age', req.age);
        user.body.should.have.property('address', req.address);
        user.body.should.have.property('id', userId);
      });

      it('getAllUsers', async function () {
        // get all users
        let users = await request.get(v1BasePath + '/users').expect(200);

        users.body.should.have.property('count', 0);
        users.body.should.have.property('value');
        users.body.value.length.should.be.eql(0);
        const count = 3;
        await bulkCreateUsers(count);
        // get user and check properties
        users = await request.get(v1BasePath + '/users').expect(200);

        users.body.should.have.property('count', count);
        users.body.should.have.property('value');
        users.body.value.length.should.be.eql(count);
      });
    });

    describe('CreateUser', async function () {
      it('FailCreateNoName', async function () {
        const req = createReq();
        delete req.name;
        await request
          .post(v1BasePath + '/users')
          .send(req)
          .expect(400);

        let users = await request.get(v1BasePath + '/users').expect(200);

        users.body.should.have.property('count', 0);
        users.body.should.have.property('value');
        users.body.value.length.should.be.eql(0);
      });

      it('FailCreateInvalidName', async function () {
        const req = createReq();
        req.name = '$*name';
        await request
          .post(v1BasePath + '/users')
          .send(req)
          .expect(400);

        let users = await request.get(v1BasePath + '/users').expect(200);

        users.body.should.have.property('count', 0);
        users.body.should.have.property('value');
        users.body.value.length.should.be.eql(0);
      });

      it('FailCreateNoAddress', async function () {
        const req = createReq();
        delete req.address;
        await request
          .post(v1BasePath + '/users')
          .send(req)
          .expect(400);

        let users = await request.get(v1BasePath + '/users').expect(200);

        users.body.should.have.property('count', 0);
        users.body.should.have.property('value');
        users.body.value.length.should.be.eql(0);
      });

      it('FailCreateRandomAddress', async function () {
        const req = createReq();
        req.address = '$%Address';
        await request
          .post(v1BasePath + '/users')
          .send(req)
          .expect(400);

        let users = await request.get(v1BasePath + '/users').expect(200);

        users.body.should.have.property('count', 0);
        users.body.should.have.property('value');
        users.body.value.length.should.be.eql(0);
      });

      it('FailCreateNoAge', async function () {
        const req = createReq();
        delete req.age;
        await request
          .post(v1BasePath + '/users')
          .send(req)
          .expect(400);

        let users = await request.get(v1BasePath + '/users').expect(200);

        users.body.should.have.property('count', 0);
        users.body.should.have.property('value');
        users.body.value.length.should.be.eql(0);
      });

      it('FailCreateRandomAge', async function () {
        const req = createReq();
        req.age = -1; // min age is 0
        await request
          .post(v1BasePath + '/users')
          .send(req)
          .expect(400);
        req.age = 151; //max age is 150
        await request
          .post(v1BasePath + '/users')
          .send(req)
          .expect(400);

        req.age = '150'; // age should be a string
        await request
          .post(v1BasePath + '/users')
          .send(req)
          .expect(400);

        let users = await request.get(v1BasePath + '/users').expect(200);

        users.body.should.have.property('count', 0);
        users.body.should.have.property('value');
        users.body.value.length.should.be.eql(0);
      });

      it('FailCreateBadIsActive', async function () {
        const req = createReq();
        req.isActive = 'false'; // it should be boolean
        await request
          .post(v1BasePath + '/users')
          .send(req)
          .expect(400);

        req.isActive = 'asd'; // it should be boolean
        await request
          .post(v1BasePath + '/users')
          .send(req)
          .expect(400);

        req.isActive = '*'; // it should be boolean
        await request
          .post(v1BasePath + '/users')
          .send(req)
          .expect(400);

        let users = await request.get(v1BasePath + '/users').expect(200);

        users.body.should.have.property('count', 0);
        users.body.should.have.property('value');
        users.body.value.length.should.be.eql(0);
      });

      it('createUser', async function () {
        const req = createReq();
        const res = await request
          .post(v1BasePath + '/users')
          .send(req)
          .expect(200);
        res.body.should.have.property('name', req.name);
        res.body.should.have.property('age', req.age);
        res.body.should.have.property('address', req.address);
        res.body.should.have.property('country', req.country);
        res.body.should.have.property('metadata', req.metadata);
        res.body.should.have.property('isActive', req.isActive);
        res.body.should.have.property('id');
        const userId = res.body.id;
        // get user and check properties
        const user = await request
          .get(v1BasePath + '/users/' + userId)
          .send(req)
          .expect(200);
        user.body.should.have.property('name', req.name);
        user.body.should.have.property('age', req.age);
        user.body.should.have.property('address', req.address);
        user.body.should.have.property('id', userId);
        user.body.should.have.property('country', req.country);
        user.body.should.have.property('metadata', req.metadata);
        user.body.should.have.property('isActive', req.isActive);
      });

      it('createUserWithoutRequiredParameters', async function () {
        const req = createReq();
        delete req.country;
        delete req.isActive;
        delete req.metadata;
        const res = await request
          .post(v1BasePath + '/users')
          .send(req)
          .expect(200);
        res.body.should.have.property('name', req.name);
        res.body.should.have.property('age', req.age);
        res.body.should.have.property('id');
        const userId = res.body.id;
        // get user and check properties
        const user = await request
          .get(v1BasePath + '/users/' + userId)
          .send(req)
          .expect(200);
        user.body.should.have.property('name', req.name);
        user.body.should.have.property('age', req.age);
        user.body.should.have.property('id', userId);
      });
    });

    describe('UpdateUser', async function () {
      it('FailUpdateRandomUser', async function () {
        const req = createReq();
        await request
          .post(v1BasePath + '/users')
          .send(req)
          .expect(200);

        const userNamePatchReq = {
          name: 'someRandomName'
        };
        await request
          .patch(v1BasePath + '/users/' + 'randomUserId')
          .send(userNamePatchReq)
          .expect(404);
      });

      it('FailUpdateTooLongUserId', async function () {
        const userNamePatchReq = {
          name: 'someRandomName'
        };
        await request
          .patch(v1BasePath + '/users/' + 'thisIsReallyLongUserIsMaxIs12')
          .send(userNamePatchReq)
          .expect(400);
      });

      it('UpdateUser', async function () {
        const req = createReq();
        const res = await request
          .post(v1BasePath + '/users')
          .send(req)
          .expect(200);
        const userId = res.body.id;

        // update name
        const userNamePatchReq = {
          name: 'someRandomName'
        };
        await request
          .patch(v1BasePath + '/users/' + userId)
          .send(userNamePatchReq)
          .expect(200);
        // get user and check name
        let user = await request
          .get(v1BasePath + '/users/' + userId)
          .expect(200);
        user.body.should.have.property('name', userNamePatchReq.name);
        user.body.should.have.property('age', req.age);
        user.body.should.have.property('address', req.address);
        user.body.should.have.property('id', userId);

        // update age
        const userAgePatchReq = {
          age: 12
        };
        await request
          .patch(v1BasePath + '/users/' + userId)
          .send(userAgePatchReq)
          .expect(200);
        // get user and check age
        user = await request.get(v1BasePath + '/users/' + userId).expect(200);
        user.body.should.have.property('name', userNamePatchReq.name);
        user.body.should.have.property('age', userAgePatchReq.age);
        user.body.should.have.property('address', req.address);
        user.body.should.have.property('id', userId);

        // update address
        const updateAddressPatchReq = {
          address: 'some Address'
        };
        await request
          .patch(v1BasePath + '/users/' + userId)
          .send(updateAddressPatchReq)
          .expect(200);
        // get user and check address
        user = await request.get(v1BasePath + '/users/' + userId).expect(200);
        user.body.should.have.property('name', userNamePatchReq.name);
        user.body.should.have.property('age', userAgePatchReq.age);
        user.body.should.have.property(
          'address',
          updateAddressPatchReq.address
        );
        user.body.should.have.property('id', userId);
      });
    });

    describe('DeleteUsers', async function () {
      it('FailDeleteUserRandomId', async function () {
        const req = createReq();
        const res = await request
          .post(v1BasePath + '/users')
          .send(req)
          .expect(200);
        res.body.should.have.property('name', req.name);
        res.body.should.have.property('age', req.age);
        res.body.should.have.property('address', req.address);
        res.body.should.have.property('id');
        const userId = res.body.id;

        await request.delete(v1BasePath + '/users/' + 'randomId').expect(404);
        // get user again and check
        await request.get(v1BasePath + '/users/' + userId).expect(200);
      });

      it('FailDeleteLongUserId', async function () {
        const req = createReq();
        const res = await request
          .post(v1BasePath + '/users')
          .send(req)
          .expect(200);
        res.body.should.have.property('name', req.name);
        res.body.should.have.property('age', req.age);
        res.body.should.have.property('address', req.address);
        res.body.should.have.property('id');
        const userId = res.body.id;

        await request
          .delete(v1BasePath + '/users/' + 'thisIsReallyLongUserIsMaxIs12')
          .expect(400);
        // get user again and check
        await request.get(v1BasePath + '/users/' + userId).expect(200);
      });

      it('DeleteUser', async function () {
        const req = createReq();
        let res = await request
          .post(v1BasePath + '/users')
          .send(req)
          .expect(200);
        res.body.should.have.property('name', req.name);
        res.body.should.have.property('age', req.age);
        res.body.should.have.property('address', req.address);
        res.body.should.have.property('id');
        const userId = res.body.id;

        await request.delete(v1BasePath + '/users/' + userId).expect(204);
        // get user and fail
        await request.get(v1BasePath + '/users/' + userId).expect(404);
        // get all users
        res = await request.get(v1BasePath + '/users').expect(200);
        res.body.should.have.property('count', 0);
        res.body.should.have.property('value');
        res.body.value.length.should.be.eql(0);
      });

      it('DeleteAllUsers', async function () {
        const count = 3;
        await bulkCreateUsers(count);

        let res = await request.get(v1BasePath + '/users').expect(200);
        res.body.should.have.property('count', count);
        res.body.should.have.property('value');
        res.body.value.length.should.be.eql(count);
        // delete all users
        res = await request.delete(v1BasePath + '/users').expect(200);
        res.body.should.have.property('count', count);

        // get all user and check the count
        res = await request.get(v1BasePath + '/users').expect(200);
        res.body.should.have.property('count', 0);
        res.body.should.have.property('value');
        res.body.value.length.should.be.eql(0);
      });
    });
  });

  describe('Pagination', async function () {
    it('FailPaginateBadPaginationData', async function () {
      // create bulk users
      const count = 20;
      const skip = 8000; // to large
      const top = 1000; // to large
      await bulkCreateUsers(count);
      // get only top 10
      await request.get(v1BasePath + `/users?$top=${top}`).expect(400);

      // apply skip
      await request.get(v1BasePath + `/users?$skip=${skip}`).expect(400);
    });

    it('PaginateUsers', async function () {
      // create bulk users
      const count = 20;
      const skip = 8;
      const top = 10;
      await bulkCreateUsers(count);
      // get only top 10
      let res = await request
        .get(v1BasePath + `/users?$top=${top}`)
        .expect(200);
      res.body.should.have.property('count', count);
      res.body.should.have.property('value');
      res.body.value.should.have.length(top);

      // apply skip
      res = await request
        .get(v1BasePath + `/users?$top=${top}&$skip=${skip}`)
        .expect(200);
      res.body.should.have.property('count', count);
      res.body.should.have.property('value');
      res.body.value.should.have.length(top);

      // apply skip
      res = await request
        .get(v1BasePath + `/users?$top=13&$skip=7`)
        .expect(200);
      res.body.should.have.property('count', count);
      res.body.should.have.property('value');
      res.body.value.should.have.length(13);

      // apply skip
      res = await request
        .get(v1BasePath + `/users?$top=20&$skip=21`)
        .expect(200);
      res.body.should.have.property('count', count);
      res.body.should.have.property('value');
      res.body.value.should.have.length(0);
    });

    it('FailSortUsersBadParameter', async function () {
      // create bulk users
      const count = 20;
      await bulkCreateUsers(count);
      let params = {
        $sortBy: '(age', // only +/- is allowed
        $top: count
      };
      await request
        .get(v1BasePath + '/users?' + encodeGetParams(params))
        .expect(400);

      params = {
        $sortBy: '-upfatedAt', // this field is not allowed
        $top: count
      };

      await request
        .get(v1BasePath + '/users?' + encodeGetParams(params))
        .expect(400);
    });

    it('PassSortUsersWithAdditionalSpaces', async function () {
      // create bulk users
      const count = 20;
      await bulkCreateUsers(count);
      let params = {
        $sortBy: ' +age ',
        $top: count
      };
      await request
        .get(v1BasePath + '/users?' + encodeGetParams(params))
        .expect(200);

      params = {
        $sortBy: ' +age  +name ',
        $top: count
      };

      await request
        .get(v1BasePath + '/users?' + encodeGetParams(params))
        .expect(200);
    });

    it('SortUsers', async function () {
      // create bulk users
      const count = 20;
      await bulkCreateUsers(count);
      let params = {
        $sortBy: '+age',
        $top: count
      };
      let res = await request
        .get(v1BasePath + '/users?' + encodeGetParams(params))
        .expect(200);
      res.body.should.have.property('count', count);
      res.body.should.have.property('value');
      for (let index = 0; index < count; index++) {
        res.body.value[index].age.should.be.eql(index);
      }

      params = {
        $sortBy: '-age',
        $top: count
      };

      res = await request
        .get(v1BasePath + '/users?' + encodeGetParams(params))
        .expect(200);
      res.body.should.have.property('count', count);
      res.body.should.have.property('value');

      for (let index = count - 1; index >= count; index--) {
        res.body.value[index].age.should.be.eql(index);
      }

      // use skip also
      params = {
        $sortBy: '+age',
        $top: count,
        $skip: 10
      };
      res = await request
        .get(v1BasePath + '/users?' + encodeGetParams(params))
        .expect(200);
      res.body.should.have.property('count', count);
      res.body.should.have.property('value');

      for (let index = 0; index < 10; index++) {
        res.body.value[index].age.should.be.eql(index + 10);
      }
    });
  });

  describe('ProjectionTest', async function () {
    it('ProjectionTestFailBadQuery', async function () {
      // create a users
      const count = 4;
      await bulkCreateUsers(count);
      // query users
      let params = {
        $projection: `age -createdAt` // nedd - at the beginning
      };

      await request
        .get(v1BasePath + '/users?' + encodeGetParams(params))
        .expect(400);
      params = {
        $projection: `+age -createdAt` // + and - both not allowed together
      };

      await request
        .get(v1BasePath + '/users?' + encodeGetParams(params))
        .expect(400);

      await request
        .get(v1BasePath + '/users?' + encodeGetParams(params))
        .expect(400);
      params = {
        $projection: `+aaaage ` // randome field not allowed
      };

      await request
        .get(v1BasePath + '/users?' + encodeGetParams(params))
        .expect(400);
    });

    it('ProjectionTest', async function () {
      // create a users
      const count = 4;
      await bulkCreateUsers(count);
      // query users
      let params = {
        $projection: `-age -createdAt`,
        $top: count
      };

      let res = await request
        .get(v1BasePath + '/users?' + encodeGetParams(params))
        .expect(200);
      res.body.should.have.property('count', count);
      res.body.should.have.property('value');
      res.body.value.length.should.eql(count);
      res.body.value.forEach((user) => {
        user.should.not.have.property('age');
        user.should.not.have.property('createdAt');
        user.should.have.property('name');
        user.should.have.property('address');
        user.should.have.property('id');
        user.should.have.property('updatedAt');
      });

      // use random projection parameter
      params = {
        $projection: `-age -createdAt`,
        $top: count
      };

      res = await request
        .get(v1BasePath + '/users?' + encodeGetParams(params))
        .expect(200);
      res.body.should.have.property('count', count);
      res.body.should.have.property('value');
      res.body.value.length.should.eql(count);
      res.body.value.forEach((user) => {
        user.should.not.have.property('age');
        user.should.not.have.property('createdAt');
        user.should.have.property('name');
        user.should.have.property('address');
        user.should.have.property('id');
        user.should.have.property('updatedAt');
      });

      // use random projection parameter
      params = {
        $projection: `+age   +name`,
        $top: count
      };

      res = await request
        .get(v1BasePath + '/users?' + encodeGetParams(params))
        .expect(200);
      res.body.should.have.property('count', count);
      res.body.should.have.property('value');
      res.body.value.length.should.eql(count);
      res.body.value.forEach((user) => {
        user.should.have.property('age');
        user.should.have.property('name');
        user.should.have.property('id');
        user.should.not.have.property('createdAt');
        user.should.not.have.property('address');
        user.should.not.have.property('updatedAt');
      });
    });

    it('PassProjectionWithAdditionalSpacesTest', async function () {
      // create a users
      const count = 4;
      await bulkCreateUsers(count);
      // query users
      let params = {
        $projection: ` -age   -createdAt `,
        $top: count
      };

      let res = await request
        .get(v1BasePath + '/users?' + encodeGetParams(params))
        .expect(200);
      res.body.should.have.property('count', count);
      res.body.should.have.property('value');
      res.body.value.length.should.eql(count);
      res.body.value.forEach((user) => {
        user.should.not.have.property('age');
        user.should.not.have.property('createdAt');
        user.should.have.property('name');
        user.should.have.property('address');
        user.should.have.property('id');
        user.should.have.property('updatedAt');
      });
    });
  });

  describe('FilterTest', async function () {
    it('FilterGetTestFailBadQuery', async function () {
      // create bulk users
      const count = 20;
      await bulkCreateUsers(count);

      // query users
      let params = {
        $filter: `createdAt >= '2022sdfZ'`,
        $top: count // created at is not a valid timestamp
      };
      await request
        .get(v1BasePath + '/users?' + encodeGetParams(params))
        .expect(400);

      params = {
        $filter: ``, // it should have some value, blank is not allowed
        $top: count
      };
      await request
        .get(v1BasePath + '/users?' + encodeGetParams(params))
        .expect(400);

      params = {
        $filter: `isActive = 'True'`, // it should be either true or false not anything else
        $top: count
      };
      await request
        .get(v1BasePath + '/users?' + encodeGetParams(params))
        .expect(400);
    });

    it('FilterGetTest', async function () {
      // create bulk users
      const count = 20;
      await bulkCreateUsers(count);

      // query users
      let params = {
        $filter: `age >= '10'`,
        $top: count // get all users for the given query
      };

      let res = await request
        .get(v1BasePath + '/users?' + encodeGetParams(params))
        .expect(200);
      res.body.should.have.property('count', 10); // only 10 record should match the above criteria
      res.body.should.have.property('value');
      checkData(res, 'age', [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);

      params = {
        $filter: `age >= '2' and (address IN ('Address11', 'Address12', 'Address14') or name IN ('name17', 'name16'))`,
        $top: count // get all users for the given query
      };
      res = await request
        .get(v1BasePath + '/users?' + encodeGetParams(params))
        .expect(200);
      res.body.should.have.property('count', 5);
      res.body.should.have.property('value');
      checkData(res, 'age', [3, 4, 11, 12, 14]);

      params = {
        $filter: `age >= '2' and (address IN ('Address11', 'Address12', 'Address14') or name IN ('name17', 'name16')) and isActive = 'true'`,
        $top: count // get all users for the given query
      };
      res = await request
        .get(v1BasePath + '/users?' + encodeGetParams(params))
        .expect(200);
      res.body.should.have.property('count', 3);
      res.body.should.have.property('value');
      checkData(res, 'age', [4, 12, 14]);
    });

    it('FilterDateFieldTest', async function () {
      this.timeout(1000);
      // create 4 different users in 4 different point in time and query

      // user1
      let res = await request
        .post(v1BasePath + '/users')
        .send(createReq())
        .expect(200);
      res.body.should.have.property('id');
      const userId1 = res.body.id;

      await new Promise((r) => setTimeout(r, 2000)); // sleep for a while to create enough time gap

      // user2
      res = await request
        .post(v1BasePath + '/users')
        .send(createReq())
        .expect(200);
      res.body.should.have.property('id');
      const userId2 = res.body.id;
      const userId2CreatedAt = res.body.createdAt;

      await new Promise((r) => setTimeout(r, 2000)); // sleep for a while to create enough time gap

      // user3
      res = await request
        .post(v1BasePath + '/users')
        .send(createReq())
        .expect(200);
      res.body.should.have.property('id');

      await new Promise((r) => setTimeout(r, 2000)); // sleep for a while to create enough time gap

      // user4
      res = await request
        .post(v1BasePath + '/users')
        .send(createReq())
        .expect(200);
      res.body.should.have.property('id');

      // query users
      let params = {
        $filter: `createdAt <= '${userId2CreatedAt}'`,
        $top: 10 // get all users for the given query
      };

      res = await request
        .get(v1BasePath + '/users?' + encodeGetParams(params))
        .expect(200);
      const allIds1 = res.body.value.map((element) => element.id);
      allIds1.length.should.eql(2);
      allIds1.includes(userId1).should.eql(true);
      allIds1.includes(userId2).should.eql(true);
    });

    it('FilterDeleteTestFailBadQuery', async function () {
      // create bulk users
      const count = 20;
      await bulkCreateUsers(count);

      // delete users
      let params = {
        $filter: `` // fail as filter can not be blank
      };
      await request
        .delete(v1BasePath + '/users?' + encodeGetParams(params))
        .expect(400);
    });

    it('FilterDeleteTest', async function () {
      // create bulk users
      const count = 20;
      await bulkCreateUsers(count);

      // delete users
      let params = {
        $filter: `age >= '2' and (address IN ('Address11', 'Address12', 'Address14') or name IN ('name17', 'name16'))`
      };
      let res = await request
        .delete(v1BasePath + '/users?' + encodeGetParams(params))
        .expect(200);
      res.body.should.have.property('count', 5);

      // get the users using the above same query and it should return 0
      params = {
        $filter: `age >= '2' and (address IN ('Address11', 'Address12', 'Address14') or name IN ('name17', 'name16'))`,
        $top: count // get all users for the given query
      };
      res = await request
        .get(v1BasePath + '/users?' + encodeGetParams(params))
        .expect(200);
      res.body.should.have.property('count', 0);
      res.body.should.have.property('value');
      res.body.value.length.should.eql(0);
      // other users and check if the remaining users exist
      params = {
        $top: count // get all users for the given query
      };
      res = await request
        .get(v1BasePath + '/users?' + encodeGetParams(params))
        .expect(200);
      res.body.should.have.property('count', 15);
      res.body.should.have.property('value');
      res.body.value.length.should.eql(15);
      checkData(
        res,
        'age',
        [0, 1, 2, 5, 6, 7, 8, 9, 10, 13, 15, 16, 17, 18, 19]
      );
    });
  });

  describe('QueryParser', async function () {
    function testParserLanguage(expression) {
      let parsedExpression;
      try {
        parsedExpression = queryHelper.transformQuery(expression);
      } catch (error) {
        parsedExpression = '';
      }
      return parsedExpression;
    }

    it('AliasTest', async function () {
      // 'name','age','address','country',
      const eqlQuery1 = testParserLanguage(`name eq 'dd'`);
      const eqlQuery2 = testParserLanguage(`name = 'dd'`);
      eqlQuery1.should.eql(eqlQuery2);

      const greaterQuery1 = testParserLanguage(`name > 'dd'`);
      const greaterQuery2 = testParserLanguage(`name gt 'dd'`);
      greaterQuery1.should.eql(greaterQuery2);

      const greaterEqlQuery1 = testParserLanguage(`name >= 'dd'`);
      const greaterEqlQuery2 = testParserLanguage(`name gte 'dd'`);
      greaterEqlQuery1.should.eql(greaterEqlQuery2);

      const lessThenQuery1 = testParserLanguage(`name < 'dd'`);
      const lessThenQuery2 = testParserLanguage(`name lt 'dd'`);
      lessThenQuery1.should.eql(lessThenQuery2);

      const lessThenEqlQuery1 = testParserLanguage(`name <= 'dd'`);
      const lessThenEqlQuery2 = testParserLanguage(`name lte 'dd'`);
      lessThenEqlQuery1.should.eql(lessThenEqlQuery2);

      const notEqlQuery1 = testParserLanguage(`name != 'dd'`);
      const notEqlQuery2 = testParserLanguage(`name ne 'dd'`);
      notEqlQuery1.should.eql(notEqlQuery2);

      const inQuery1 = testParserLanguage(`name in ('dd')`);
      const inQuery2 = testParserLanguage(`name IN ('dd')`);
      inQuery1.should.eql(inQuery2);

      const notInQuery1 = testParserLanguage(`name not in ('dd')`);
      const notInQuery2 = testParserLanguage(`name NOT IN ('dd')`);
      const notInQuery3 = testParserLanguage(`name nin ('dd')`);
      notInQuery1.should.eql(notInQuery2);
      notInQuery3.should.eql(notInQuery2);
    });

    it('QueryLanguageErrorTest', async function () {
      testParserLanguage(`name = dd'`).should.eql(''); // not a proper syntax, '' needed
      testParserLanguage(`name & 'dd'`).should.eql(''); // not a proper operator
      testParserLanguage(`name IN 'dd'`).should.eql(''); // after in, () needed
      testParserLanguage(`name = '*'`).should.eql(''); // * is not allowed
      testParserLanguage(`name = 'd' OR `).should.eql(''); // after boolean clause another expression needed
      testParserLanguage(`randomField not in ('dd')`).should.eql(''); // after boolean clause another expression needed
      testParserLanguage(`age not in ('dd')`).should.eql(''); // age is of type integer ( query hooks mapping )
      testParserLanguage(`age not in ('2'`).should.eql(''); // ")" is missing
    });
  });

  describe('PaginationLinksTest', async function () {
    const _checkURL = function (expectedURL, actualURL) {
      let [expectedBasePath, expectedQueryParam] = expectedURL.split('?');
      let [actualBasePath, actualQueryParam] = actualURL.split('?');
      expectedBasePath.should.eql(actualBasePath);
      let expectedQueryParamMap = querystring.parse(expectedQueryParam);
      let actualQueryParamMap = querystring.parse(actualQueryParam);
      const isQueryParamEqual = util.isDeepStrictEqual(
        expectedQueryParamMap,
        actualQueryParamMap
      );
      isQueryParamEqual.should.eql(true);
    };
    it('CheckPaginationLinkObjects', async function () {
      // top is 10 and skip is 0 in the url
      let url =
        'http://localhost:3000/v1/user-service/users?%24top=10&%24skip=0&%24filter=age%20%3E%20%2710%27&%24sortBy=%2Bage%20%20%20%2Bname&%24projection=-name%20%20%20-age';
      let links = queryHelper.generatePaginationLinks(url, 30);

      links.should.have.propertyByPath('first', 'href');
      _checkURL(links.first.href, url);

      links.should.have.propertyByPath('last', 'href');
      _checkURL(
        links.last.href,
        'http://localhost:3000/v1/user-service/users?%24top=10&%24skip=20&%24filter=age%20%3E%20%2710%27&%24sortBy=%2Bage%20%20%20%2Bname&%24projection=-name%20%20%20-age'
      );

      links.should.have.propertyByPath('previous', 'href');
      _checkURL(
        links.previous.href,
        'http://localhost:3000/v1/user-service/users?%24top=10&%24skip=0&%24filter=age%20%3E%20%2710%27&%24sortBy=%2Bage%20%20%20%2Bname&%24projection=-name%20%20%20-age'
      );

      links.should.have.propertyByPath('next', 'href');
      _checkURL(
        links.next.href,
        'http://localhost:3000/v1/user-service/users?%24top=10&%24skip=10&%24filter=age%20%3E%20%2710%27&%24sortBy=%2Bage%20%20%20%2Bname&%24projection=-name%20%20%20-age'
      );

      // check next pagination links
      const nextLink = links.next.href;
      const lastLink = links.last.href;
      links = queryHelper.generatePaginationLinks(nextLink, 30);

      links.should.have.propertyByPath('first', 'href');
      _checkURL(links.first.href, url);

      links.should.have.propertyByPath('last', 'href');
      _checkURL(
        links.last.href,
        'http://localhost:3000/v1/user-service/users?%24top=10&%24skip=20&%24filter=age%20%3E%20%2710%27&%24sortBy=%2Bage%20%20%20%2Bname&%24projection=-name%20%20%20-age'
      );

      links.should.have.propertyByPath('previous', 'href');
      _checkURL(links.previous.href, url);

      links.should.have.propertyByPath('next', 'href');
      _checkURL(links.next.href, lastLink);
    });
  });
});

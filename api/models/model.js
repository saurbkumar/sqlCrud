const memoryCacheModel = require('../models/memoryCacheModel');
const dbModel = require('../models/sqlModel');

module.exports = {
  getUser: getUser,
  createUser: createUser,
  updateUser: updateUser,
  deleteUser: deleteUser,
  getUsers: getUsers,
  deleteUsers: deleteUsers,
  start: dbModel.start,
  close: dbModel.close
};

async function getUser(id) {
  let result = memoryCacheModel.getObject(id);
  if (!result) {
    result = await dbModel.getUser(id);
    if (result) memoryCacheModel.createObject(id, dbModel.copy(result));
  }
  return result;
}

async function createUser(user) {
  const result = await dbModel.createUser(user);
  memoryCacheModel.createObject(result.get('id'), dbModel.copy(result));
  return result;
}

async function updateUser(id, user) {
  const result = await dbModel.updateUser(id, user);
  if (result) memoryCacheModel.updateObject(id, dbModel.copy(result));
  return result;
}

async function deleteUser(id) {
  memoryCacheModel.deleteObject(id);
  return dbModel.deleteUser(id);
}
async function getUsers(top, skip, filter, sortBy, projection) {
  let result = dbModel.getUsers(top, skip, filter, sortBy, projection);
  return result;
}

async function deleteUsers(filter) {
  memoryCacheModel.clear();
  return dbModel.deleteUsers(filter);
}

const model = require('../model/model');
module.exports = {
  getUser: getUser,
  createUser: createUser,
  updateUser: updateUser,
  deleteUser: deleteUser,
  getUsers: getUsers,
  deleteUsers: deleteUsers
};

async function getUser(id) {
  return await model.getUser(id);
}

async function createUser(user) {
  return await model.createUser(user);
}

async function updateUser(id, user) {
  return await model.updateUser(id, user);
}
async function deleteUser(id) {
  return await model.deleteUser(id);
}

async function getUsers(top, skip) {
  return await model.getUsers(top, skip);
}

async function deleteUsers() {
  return await model.deleteUsers();
}

const logger = require('../../logger')(__filename);
const SQLHelper = require('../helpers/mysqlHelper');
const shortId = require('../helpers/shortId');
const User = SQLHelper.sequelize.define(
  'User',
  {
    id: {
      type: SQLHelper.dataTypes.STRING,
      primaryKey: true,
      defaultValue: shortId.generate
    },
    name: { type: SQLHelper.dataTypes.STRING, allowNull: false },
    age: { type: SQLHelper.dataTypes.SMALLINT, allowNull: false },
    address: { type: SQLHelper.dataTypes.STRING, allowNull: false },
    country: { type: SQLHelper.dataTypes.STRING, allowNull: true }
  },
  { timestamps: true, version: true }
);

module.exports = {
  getUser: getUser,
  createUser: createUser,
  updateUser: updateUser,
  deleteUser: deleteUser,
  getUsers: getUsers,
  deleteUsers: deleteUsers,
  start: User, // warning : apart from init, do not use for anything else
  close: SQLHelper.close
};

async function getUser(id) {
  return await User.findByPk(id);
}

async function createUser(user) {
  const userData = await User.create({
    name: user.name,
    age: user.age,
    address: user.address
  });
  logger.debug(`createUser: creating user: ${JSON.stringify(user)}`);
  return userData;
}

async function updateUser(id, user) {
  let result = await User.findByPk(id);
  if (!result) {
    logger.error(`updateUser: userId ${id} not found`);
    return null;
  }
  if (user.age) result.age = user.age;
  if (user.address) result.address = user.address;
  if (user.name) result.name = user.name;
  logger.debug(`updateUser: updated user: ${JSON.stringify(user)}`);
  await result.save();
  return user;
}

async function deleteUser(id) {
  let result = await User.destroy({ where: { id: id } });
  if (result != 1) {
    logger.error(`deleteUser: userId ${id} not found`);
    return false;
  }
  return true;
}
async function getUsers(top, skip) {
  const result = await User.findAndCountAll({
    where: {},
    limit: top,
    offset: skip
  });
  return {
    count: result.count,
    values: result.rows
  };
}

async function deleteUsers() {
  let result = await User.destroy({ where: {} });
  return { count: result };
}

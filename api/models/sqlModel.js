const config = require('config');

const logger = require('../../logger')(__filename);
const { DataTypes } = require('sequelize');
const sqlHelper = require('../helpers/mysqlHelper');
const shortId = require('../helpers/shortId');
const sequelize = sqlHelper.connect(config.Database);
const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: shortId.generate
    },
    name: { type: DataTypes.STRING, allowNull: false },
    age: { type: DataTypes.SMALLINT, allowNull: false },
    address: { type: DataTypes.STRING, allowNull: false },
    country: { type: DataTypes.STRING, allowNull: true }
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
  copy: copy,
  start: start,
  close: close
};

async function start() {
  // create table if not exist
  await User.sync();
}

async function close() {
  // close connection
  await sequelize.close();
}

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
  return await result.save();
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

function copy(dbObj) {
  return dbObj.dataValues;
}

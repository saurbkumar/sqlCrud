const config = require('config');

const logger = require('../../logger')(__filename);
const { DataTypes } = require('sequelize');
const sqlHelper = require('../helpers/sqlHelper');
const shortId = require('../helpers/shortId');
const queryHelper = require('../helpers/sqlQueryHelper');

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
    country: { type: DataTypes.STRING, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: true },
    metadata: {
      type: DataTypes.STRING,
      allowNull: true,
      get: function () {
        return JSON.parse(this.getDataValue('metadata'));
      },
      set: function (value) {
        return this.setDataValue('metadata', JSON.stringify(value));
      }
    }
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
    address: user.address,
    country: user.country,
    isActive: user.isActive || false,
    metadata: user.metadata || {}
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
  if (user.isActive != undefined) result.isActive = user.isActive;
  if (user.metadata) result.metadata = user.metadata;
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
async function getUsers(top, skip, filter, sortBy, projection) {
  const sortConfig = queryHelper.transformSortBy(sortBy);
  const filterConfig = queryHelper.transformQuery(filter);
  const projectionConfig = queryHelper.transformProjection(projection);

  let sqlDataQuery = `SELECT ${projectionConfig} from Users ${filterConfig} ${sortConfig} LIMIT ${top} OFFSET ${skip}`;
  logger.info(`getUsers: getting users, query: ${sqlDataQuery}`);
  const data = await sequelize.query(sqlDataQuery, {
    type: 'SELECT'
  });
  let sqlCountQuery = `SELECT COUNT(*) as count from Users ${filterConfig}`;
  const count = await sequelize.query(sqlCountQuery, {
    type: 'SELECT'
  });
  // fix metadata
  data.forEach((element) => {
    try {
      element.metadata = JSON.parse(element.metadata);
    } catch (error) {
      element.metadata = {};
      // log it
    }
  });
  return {
    count: count[0].count,
    value: data
  };
}

async function deleteUsers(filter) {
  const filterConfig = queryHelper.transformQuery(filter);
  let sqlDataQuery = `DELETE from Users ${filterConfig}`;
  const result = await sequelize.query(sqlDataQuery);
  return { count: result[0].affectedRows };
}

function copy(dbObj) {
  return dbObj.dataValues;
}

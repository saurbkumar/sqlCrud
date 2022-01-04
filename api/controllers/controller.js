const service = require('../service/service');
const logger = require('../../logger')(__filename);
module.exports = {
  getUser: getUser,
  createUser: createUser,
  updateUser: updateUser,
  deleteUser: deleteUser,
  getUsers: getUsers,
  deleteUsers: deleteUsers
};

async function getUser(req, res) {
  try {
    const result = await service.getUser(req.params.id);
    if (!result) return res.status(404).send({ message: 'Not Found' });
    return res.json(result);
  } catch (error) /* istanbul ignore next */ {
    logger.error(`getUsers: Error while getUser: ${error}`);
    return res.status(error.statusCode || 500).send({
      message: error.message || 'Internal Server Error',
      statusCode: error.statusCode || 500
    });
  }
}

async function createUser(req, res) {
  try {
    const result = await service.createUser(req.body);
    return res.json(result);
  } catch (error) /* istanbul ignore next */ {
    logger.error(`createUser: Error while creating user: ${error}`);
    return res.status(error.statusCode || 500).send({
      message: error.message || 'Internal Server Error',
      statusCode: error.statusCode || 500
    });
  }
}

async function updateUser(req, res) {
  try {
    const result = await service.updateUser(req.params.id, req.body);
    if (!result) return res.status(404).send({ message: 'Not Found' });
    return res.json(result);
  } catch (error) /* istanbul ignore next */ {
    logger.error(`updateUser: Error while updating user: ${error}`);
    return res.status(error.statusCode || 500).send({
      message: error.message || 'Internal Server Error',
      statusCode: error.statusCode || 500
    });
  }
}

async function deleteUser(req, res) {
  try {
    const result = await service.deleteUser(req.params.id);
    if (!result) return res.status(404).send({ message: 'Not Found' });
    return res.status(204).send();
  } catch (error) /* istanbul ignore next */ {
    logger.error(`deleteUser: Error while removing user: ${error}`);
    return res.status(error.statusCode || 500).send({
      message: error.message || 'Internal Server Error',
      statusCode: error.statusCode || 500
    });
  }
}

async function getUsers(req, res) {
  try {
    const result = await service.getUsers(req.query.$top, req.query.$skip);
    return res.json(result);
  } catch (error) /* istanbul ignore next */ {
    logger.error(`getUsers: Error while getUsers: ${error}`);
    return res.status(error.statusCode || 500).send({
      message: error.message || 'Internal Server Error',
      statusCode: error.statusCode || 500
    });
  }
}

async function deleteUsers(req, res) {
  try {
    const result = await service.deleteUsers();
    return res.json(result);
  } catch (error) /* istanbul ignore next */ {
    logger.error(`createUser: Error while getUsers: ${error}`);
    return res.status(error.statusCode || 500).send({
      message: error.message || 'Internal Server Error',
      statusCode: error.statusCode || 500
    });
  }
}

const service = require('../services/service');
const logger = require('../../logger')(__filename);

const middlewares = require('../helpers/middlewares');
const queryHelper = require('../helpers/paginationHelper');

module.exports = {
  getUser: middlewares.controllerMiddleware(getUser),
  createUser: middlewares.controllerMiddleware(createUser),
  updateUser: middlewares.controllerMiddleware(updateUser),
  deleteUser: middlewares.controllerMiddleware(deleteUser),
  getUsers: middlewares.controllerMiddleware(getUsers),
  deleteUsers: middlewares.controllerMiddleware(deleteUsers)
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
    let fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    let result = await service.getUsers(
      req.query.$top,
      req.query.$skip,
      req.query.$filter,
      req.query.$sortBy,
      req.query.$projection
    );
    const links = queryHelper.generatePaginationLinks(fullUrl, result.count);
    result = { ...result, ...links };
    return res.json(result);
  } catch (error) /* istanbul ignore next */ {
    logger.error(`getUsers: Error while getting users: ${error}`);
    return res.status(error.statusCode || 500).send({
      message: error.message || 'Internal Server Error',
      statusCode: error.statusCode || 500
    });
  }
}

async function deleteUsers(req, res) {
  try {
    const result = await service.deleteUsers(req.query.$filter);
    return res.json(result);
  } catch (error) /* istanbul ignore next */ {
    logger.error(`createUser: Error while deleting users: ${error.toString()}`);
    return res.status(error.statusCode || 500).send({
      message: error.message || 'Internal Server Error',
      statusCode: error.statusCode || 500
    });
  }
}

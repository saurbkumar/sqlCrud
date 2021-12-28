const { customAlphabet } = require('nanoid/non-secure'); // faster

const nanoid = customAlphabet(
  '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  10
);

module.exports = {
  generate: nanoid
};

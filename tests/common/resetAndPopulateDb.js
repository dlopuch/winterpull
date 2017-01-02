const resetDb = require('../../scripts/resetDb');
const populateDb = require('../../scripts/populateDb');

module.exports = function() {
  return resetDb()
  .then(() => populateDb(true))
  .then(() => console.log('DB reset and populated!'));
};

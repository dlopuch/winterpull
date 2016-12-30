const resetDb = require('../../scripts/resetDb');
const populateDb = require('../../scripts/populateDb');

// Better require naming
global.requireApp = name => require(__dirname + '/../../' + name);

// Don't clutter output
process.env.SKIP_ENDPOINT_LOGGING = (process.env.SKIP_ENDPOINT_LOGGING === undefined ? true : process.env.SKIP_ENDPOINT_LOGGING);

before('DB is cleared', function() {
  return resetDb()
  .then(() => populateDb())
  .then(() => console.log('\nDB reset and populated!\n\n'));
});

require('./login');
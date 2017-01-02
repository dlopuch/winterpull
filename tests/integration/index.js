

// Better require naming
global.requireApp = name => require(__dirname + '/../../' + name);

// Don't clutter output
process.env.SKIP_ENDPOINT_LOGGING = (process.env.SKIP_ENDPOINT_LOGGING === undefined ? true : process.env.SKIP_ENDPOINT_LOGGING);

require('./model/testStay');
require('./business/testStaysBusiness');

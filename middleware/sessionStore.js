const session = require('express-session');
const dynamodb = requireApp('models/dynamodb');
const DynamoDBStore = require('connect-dynamodb')({ session });


const dynamoDbSessionStoreOpts = {
  session: session,
  client: dynamodb,
  table: 'Sessions'
};

module.exports = session({
  store: new DynamoDBStore(dynamoDbSessionStoreOpts),
  secret: process.env.SESSION_STORE_SECRET || function() { throw new Error('Missing env var SESSION_STORE_SECRET'); }(),
  resave: true,
  saveUninitialized: true,

  // TODO: also consider:
  // cookie.secure: requires https
});
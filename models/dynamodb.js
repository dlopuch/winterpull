const AWS = require("aws-sdk");

if (!process.env.DYNAMODB_ENDPOINT) {
  throw new Error('ERROR: Missing environment.  Try to source env.local');
}

AWS.config.update({
  region: process.env.DYNAMODB_REGION,
  endpoint: process.env.DYNAMODB_ENDPOINT,
});

module.exports = new AWS.DynamoDB();

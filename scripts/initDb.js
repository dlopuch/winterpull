"use strict";

const AWS = require("aws-sdk");

if (!process.env.DYNAMODB_ENDPOINT) {
  console.error('ERROR: Missing environment.  source env.local');
  process.exit(1);
}

AWS.config.update({
  region: process.env.DYNAMODB_REGION,
  endpoint: process.env.DYNAMODB_ENDPOINT,
});

var dynamodb = new AWS.DynamoDB();

const VERBOSE = require.main === module;


var createTableSessionsParams = {
  TableName : "Sessions",
  KeySchema: [
    { AttributeName: "id", KeyType: "HASH"},  //Partition key
  ],
  AttributeDefinitions: [
    { AttributeName: "id", AttributeType: "S" },
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 1,
    WriteCapacityUnits: 1
  }
};

var createTablePeopleParams = {
  TableName : "Users",
  KeySchema: [
    { AttributeName: "userId", KeyType: "HASH"},  //Partition key
  ],
  AttributeDefinitions: [
    { AttributeName: "userId", AttributeType: "S" }
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 1,
    WriteCapacityUnits: 1
  }
};

var createTableStayParams = {
  TableName : "Stays",
  KeySchema: [
    { AttributeName: "stayDate", KeyType: "HASH"},  //Partition key
    { AttributeName: "userId", KeyType: "RANGE" }  //Sort key
  ],
  AttributeDefinitions: [
    { AttributeName: "stayDate", AttributeType: "N" },
    { AttributeName: "userId", AttributeType: "S" }
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 1,
    WriteCapacityUnits: 1
  }
};

var createTableCarStayParams = {
  TableName : "Car_Stays",
  KeySchema: [
    { AttributeName: "stayDate", KeyType: "HASH"},  //Partition key
    { AttributeName: "userId", KeyType: "RANGE" }  //Sort key
  ],
  AttributeDefinitions: [
    { AttributeName: "stayDate", AttributeType: "N" },
    { AttributeName: "userId", AttributeType: "S" }
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 1,
    WriteCapacityUnits: 1
  }
};

var createTableGuestTabParams = {
  TableName : "Guest_Tabs",
  KeySchema: [
    { AttributeName: "userId", KeyType: "HASH"},  //Partition key
    { AttributeName: "visitCheckin", KeyType: "RANGE" }  //Sort key
  ],
  AttributeDefinitions: [
    { AttributeName: "userId", AttributeType: "S" },
    { AttributeName: "visitCheckin", AttributeType: "N" }
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 1,
    WriteCapacityUnits: 1
  }
};

function promiseCreateTable(params) {
  return new Promise((resolve, reject) => {
    dynamodb.createTable(params, function(error, data) {
      if (error) {
        let e = new Error(`ERROR: Unable to create table '${params.TableName}': ${JSON.stringify(error, null, 2)}`);
        e.error = error;
        return reject(e)
      }
      console.log(`\nCreated table ${params.TableName}. ${ !VERBOSE ? '' : `Table description JSON: ${JSON.stringify(data, null, 2)}`}`);
      resolve(data);
    });
  });
}

function doScript() {
  return promiseCreateTable(createTableSessionsParams)
  .then(() => promiseCreateTable(createTablePeopleParams))
  .then(() => promiseCreateTable(createTableStayParams))
  .then(() => promiseCreateTable(createTableCarStayParams))
  .then(() => promiseCreateTable(createTableGuestTabParams));
}

module.exports = doScript;

// execute if called directly
if (require.main === module) {
  doScript();
}

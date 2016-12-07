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

var createTablePeopleParams = {
  TableName : "People",
  KeySchema: [
    { AttributeName: "person_id", KeyType: "HASH"},  //Partition key
  ],
  AttributeDefinitions: [
    { AttributeName: "person_id", AttributeType: "S" }
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 1,
    WriteCapacityUnits: 1
  }
};

var createTableStayParams = {
  TableName : "Stay",
  KeySchema: [
    { AttributeName: "stay_date", KeyType: "HASH"},  //Partition key
    { AttributeName: "person_id", KeyType: "RANGE" }  //Sort key
  ],
  AttributeDefinitions: [
    { AttributeName: "stay_date", AttributeType: "N" },
    { AttributeName: "person_id", AttributeType: "S" }
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 1,
    WriteCapacityUnits: 1
  }
};

var createTableCarStayParams = {
  TableName : "Car_Stay",
  KeySchema: [
    { AttributeName: "stay_date", KeyType: "HASH"},  //Partition key
    { AttributeName: "person_id", KeyType: "RANGE" }  //Sort key
  ],
  AttributeDefinitions: [
    { AttributeName: "stay_date", AttributeType: "N" },
    { AttributeName: "person_id", AttributeType: "S" }
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 1,
    WriteCapacityUnits: 1
  }
};

var createTableGuestTabParams = {
  TableName : "Guest_Tab",
  KeySchema: [
    { AttributeName: "person_id", KeyType: "HASH"},  //Partition key
    { AttributeName: "visit_checkin", KeyType: "RANGE" }  //Sort key
  ],
  AttributeDefinitions: [
    { AttributeName: "person_id", AttributeType: "S" },
    { AttributeName: "visit_checkin", AttributeType: "N" }
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
      console.log(`\nCreated table ${params.TableName}. Table description JSON: ${JSON.stringify(data, null, 2)}`);
      resolve(data);
    });
  });
}

promiseCreateTable(createTablePeopleParams)
.then(() => promiseCreateTable(createTableStayParams))
.then(() => promiseCreateTable(createTableCarStayParams))
.then(() => promiseCreateTable(createTableGuestTabParams));

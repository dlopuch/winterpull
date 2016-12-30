"use strict";

const dynamoDb = require('../models/dynamodb');
const initDb = require('./initDb');


const VERBOSE = require.main === module;
const TABLE_NAMES = ['Sessions', 'Users', 'Stays', 'Car_Stays', 'Guest_Tabs'];


function promiseDeleteTable(tableName) {
  return new Promise((resolve, reject) => {
    dynamoDb.deleteTable({ TableName: tableName }, function(error, data) {
      if (error) {
        let e = new Error(`ERROR: Unable to delete table '${tableName}': ${JSON.stringify(error, null, 2)}`);
        e.error = error;
        return reject(error);
      }
      console.log(`\nDeleted table ${tableName}. ${!VERBOSE ? '' : `Results: ${JSON.stringify(data, null, 2)}`}`);
      resolve(data);
    });
  });
}

function waitUntilTableDeleted(tableName) {
  return new Promise((resolve, reject) => {
    dynamoDb.describeTable({ TableName: tableName }, function(error, data) {
      if (error && error.code === 'ResourceNotFoundException') {
        return resolve();
      }

      if (error) {
        return reject(error);
      }

      console.log(`...waiting for deletion on table ${tableName}`);
      return waitUntilTableDeleted(tableName);
    });
  });
}

function waitUntilTableCreated(tableName) {
  return new Promise((resolve, reject) => {
    dynamoDb.describeTable({ TableName: tableName }, function(error, data) {
      if (error && error.code === 'ResourceNotFoundException') {
        console.log(`...waiting for table creation on: ${tableName}`);
        return waitUntilTableCreated(tableName);
      }

      if (error) {
        return reject(error);
      }

      if (data && data.Table.TableStatus !== 'ACTIVE') {
        console.log(`...waiting for table creation to finish on: ${tableName} (current status: ${data.Table.TableStatus})`);
        return waitUntilTableCreated(tableName);
      }

      return resolve(tableName);
    });
  });
}

function deleteTable(tableName) {
  return promiseDeleteTable(tableName).then(() => waitUntilTableDeleted(tableName));
}


function doScript() {
  console.log('\n============================\n== Deleting tables!\n============================');
  return TABLE_NAMES
  .reduce((promiseChain, tableName) => promiseChain.then(() => deleteTable(tableName)), Promise.resolve())
  .then(() => console.log('\n============================\n== Now recreating tables!\n============================'))
  .then(() => initDb())
  .then(() => TABLE_NAMES
    .reduce((promiseChain, tableName) => promiseChain.then(() => waitUntilTableCreated(tableName)), Promise.resolve())
  )
}

module.exports = doScript;

// execute if called directly
if (require.main === module) {
  doScript();
}

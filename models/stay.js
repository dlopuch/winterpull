"use strict";

const dynamodb = require('./dynamodb');

const STAY_TABLE = 'Stay';

function validateYear(year) {
  if (!(year > 1970 && year < 3000)) {
    throw new Error('Year must be 4 digits');
  }
}

function validateMonth(month) {
  if (!(month > 0 && month <= 12)) {
    throw new Error('Month must be 2 valid digits (January is 01)');
  }
}

function validateDay(day) {
  if (!(day > 0 && day <= 31)) {
    throw new Error('Day must be 1-31');
  }
}

function mapDynamoDbRecord(dynamoRecord) {
  return {
    stayDate: parseInt(dynamoRecord.stay_date.N, 10),
    personId: dynamoRecord.person_id.S,
    something: dynamoRecord.something.S
  };
}

/**
 * Gets all the Stays for a given year and month
 * @param {number} year
 * @param {number} month january is 01
 * @returns {Promise.<Object>}
 */
exports.getMonthStays = function(year, month) {
  return new Promise((resolve, reject) => {
    try {
      validateYear(year);
      validateMonth(month);
    } catch (e) {
      return reject(e);
    }

    let params = {
      TableName: STAY_TABLE,
      FilterExpression: 'stay_date >= :start_date AND stay_date < :end_date',
      ExpressionAttributeValues: {
        ':start_date': {N: '' + Math.floor(year) + Math.floor(month) + '00'}, // note string coercion, eg '2016' + 12 = '201612'
        ':end_date'  : {N: '' + Math.floor(year) + Math.floor(month + 1) + '00'}
      },
      ReturnConsumedCapacity: 'TOTAL', // optional (NONE | TOTAL | INDEXES)
    };
    dynamodb.scan(params, function(err, data) {
      if (err) reject(err); // an error occurred
      else resolve(data); // successful response
    });
  })
  .then(stays => stays.Items.map(mapDynamoDbRecord));
};

/**
 *
 * @param {number} year
 * @param {number} month Calendar month, January is 01
 * @param {number} day Calendar day, first day is 01
 * @param {string} personId Person email
 * @param {Object} stayObj Stay JSON
 * @return {Promise.<Object>}
 */
exports.createStay = function(year, month, day, personId, stayObj) {
  return new Promise((resolve, reject) => {
    try {
      validateYear(year);
      validateMonth(month);
      validateDay(day);
    } catch (e) {
      return reject(e);
    }

    if (month < 10) month = '0' + month;
    if (day < 10) day = '0' + day;

    stayObj.stay_date = '' + year + month + day; // note string coercion -- '2016' + 01
    stayObj.person_id = personId;

    dynamodb.put(
      {
        TableName: STAY_TABLE,
        Item: stayObj
      },
      function(error, data) {
        if (error) reject(error);
        else resolve(data);
      }
    );
  })
};

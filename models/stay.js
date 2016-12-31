"use strict";

const dynamodb = require('./dynamodb');
const dateUtils = requireApp('utils/dateUtils');

const STAY_TABLE = 'Stays';

function validateYear(year) {
  year = parseInt(year, 10);
  if (!(year > 1970 && year < 3000)) {
    throw new Error('Year must be 4 digits');
  }
  return year;
}

function validateMonth(month) {
  month = parseInt(month, 10);
  if (!(month > 0 && month <= 12)) {
    throw new Error('Month must be 2 valid digits (January is 01)');
  }
  return month;
}

function validateDay(day) {
  day = parseInt(day, 10);
  if (!(day > 0 && day <= 31)) {
    throw new Error('Day must be 1-31');
  }
  return day;
}

const stringifyYear = (year) => Math.floor(year);
const stringifyMonth = (month) => (month < 10) ? '0' + Math.floor(month) : '' + Math.floor(month);
const stringifyDay = (day) => (day < 10) ? '0' + Math.floor(day) : '' + Math.floor(day);

const msDateToIsoDate = (msDateStr) => (new Date(Date(msDateStr))).toISOString();

function deserializeDynamoDbRecord(dynamoRecord) {
  return {
    stayDate: parseInt(dynamoRecord.stayDate.N, 10),
    userId: dynamoRecord.userId.S,
    dateCreated: msDateToIsoDate(dynamoRecord.dateCreated.N),
    dateUpdated: msDateToIsoDate(dynamoRecord.dateUpdated.N),
    isHost: dynamoRecord.isHost.BOOL,
    hostId: dynamoRecord.hostId.S === 'n/a' ? null : dynamoRecord.hostId.S,
    //something: dynamoRecord.something.S
  };
}


/**
 * Looks up stays based off some criteria.
 *
 * If full date specified, lookups are more efficient (full PK used)
 *
 * @param {number} [stayQuery.y] Year to look up by, 4-digits
 * @param {number} [stayQuery.m] Calendar month to look up by (January is 01)
 * @param {number} [stayQuery.d] Calendar day to look up by (first of the month is 01)
 * @param {string} [stayQuery.userId] User ID to look up by
 * @return {Promise.<Array(Stay)>} Returns list of Stays
 */
exports.getStays = function(stayQuery) {
  return new Promise((resolve, reject) => {
    let filters = [];
    let attributeValues = {};
    let haveFullPk = false;

    // FILTER: userId
    if (stayQuery.userId) {
      filters.push('userId = :userId');
      attributeValues[':userId'] = { S: stayQuery.userId };
    }


    // FILTER: partial dates
    let year = !stayQuery.y ? null : validateYear(stayQuery.y);
    let month = !stayQuery.m ? null : validateMonth(stayQuery.m);
    let day = !stayQuery.d ? null : validateDay(stayQuery.d);

    let startDate;
    let endDate;
    if (year !== null) {
      if (month === null) {
        startDate = stringifyYear(year) + '0000';
        endDate = stringifyYear(year + 1) + '0000';
      } else if (day === null) {
        startDate = stringifyYear(year) + stringifyMonth(month) + '00';
        endDate   = stringifyYear(year) + stringifyMonth(month + 1) + '00';
      } else {
        startDate = stringifyYear(year) + stringifyMonth(month) + stringifyDay(day);
        haveFullPk = true;
      }
    }

    if (haveFullPk) {
      // We can lookup by PK
      filters.push('stayDate = :stayDate');
      attributeValues[':stayDate'] = { N: startDate };

    } else if (startDate) {
      filters.push('stayDate >= :startDate AND stayDate < :endDate');
      attributeValues[':startDate'] = { N: startDate };
      attributeValues[':endDate']   = { N: endDate };
    }


    if (!filters.length) {
      return reject(new Error('Must specify either date or user filters!'));
    }


    // Use PK lookup if we can
    if (haveFullPk) {
      let params = {
        TableName: STAY_TABLE,
        KeyConditionExpression: filters.join(' AND '),
        ExpressionAttributeValues: attributeValues,
      };
      dynamodb.query(params, function(err, data) {
        if (err) reject(err); // an error occurred
        else resolve(data); // successful response
      });

    // Otherwise, do a table scan
    } else {
      let params = {
        TableName: STAY_TABLE,
        FilterExpression: filters.join(' AND '),
        ExpressionAttributeValues: attributeValues,
        ReturnConsumedCapacity: 'TOTAL', // optional (NONE | TOTAL | INDEXES)
      };
      dynamodb.scan(params, function(err, data) {
        if (err) reject(err); // an error occurred
        else resolve(data); // successful response
      });
    }

  })
  .then(stays => stays.Items.map(deserializeDynamoDbRecord));
};

/**
 *
 * @param {number} year
 * @param {number} month Calendar month, January is 01
 * @param {number} day Calendar day, first day is 01
 * @param {Object} stayReq Stay JSON
 * @return {Promise.<Object>}
 */
exports.createStay = function(year, month, day, stayReq) {
  return new Promise((resolve, reject) => {
    validateYear(year);
    validateMonth(month);
    validateDay(day);

    let stayObj = {
      stayDate: { N: '' + year + stringifyMonth(month) + stringifyDay(day) },
      userId: { S: stayReq.userId },
      dateCreated: { N: '' + Date.now() },
      dateUpdated: { N: '' + Date.now() },

      // Whitelist specific remaining attributes
      hostId: { S: stayReq.hostId || 'n/a' },
      isHost: { BOOL: !!stayReq.isHost },
    };

    dynamodb.putItem(
      {
        TableName: STAY_TABLE,
        Item: stayObj,
        ReturnValues: 'ALL_OLD',
      },
      function(error, data) {
        if (error) reject(error);
        else resolve(data);
      }
    );
  })
};

/**
 * Counts how many guest-nights a host has had, optionally up to and including a specific date
 * @param {string} hostUserId The host's userId
 * @param {object} beforeDate Counts all guest-nights of the specified host before this date
 * @return {Promise.<Number>} The number of guest-nights
 */
exports.countHostGuestNights = function(hostUserId, beforeDate) {
  return new Promise((resolve, reject) => {
    let params = {
      TableName: STAY_TABLE,
      FilterExpression: `hostId = :hostId ${!beforeDate ? '' : 'AND stayDate < :beforeDate'}`,
      ExpressionAttributeValues: {
        ':hostId': { S: hostUserId },
        ':beforeDate': { N: dateUtils.toDynamoDate(beforeDate) },
      },
      Select: 'COUNT',
      ConsistentRead: true,
    };

    dynamodb.scan(params, function(error, data) {
      if (error) reject(error);
      else resolve(data.Count);
    });
  });
};

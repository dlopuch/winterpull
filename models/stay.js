"use strict";

const _ = require('lodash');
const moment = require('moment');

const dynamodb = require('./dynamodb');
const dateUtils = requireApp('utils/dateUtils');

const STAY_TABLE = 'Stays';

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
 * @param {number} [stayQuery.numDays] How many days to include in the query
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
    let startDate;
    let endDate;
    if (stayQuery.y) {
      if (stayQuery.numDays > 31) {
        stayQuery.numDays = 31;
      }

      startDate = dateUtils.toDynamoDate(stayQuery);

      if (stayQuery.m && stayQuery.d && !stayQuery.numDays) {
        haveFullPk = true;
      } else {

        let endQuery = _.clone(stayQuery);
        if (!endQuery.m) {
          endQuery.y += 1;
          endQuery.m = 1;
          endQuery.d = 1;
        } else if (!endQuery.d && !endQuery.numDays) {
          endQuery.m += 1;
          endQuery.d = 1;
        } else if (!endQuery.d) {
          endQuery.d = endQuery.numDays + 1;
        } else if (endQuery.numDays) {
          endQuery.d += endQuery.numDays;
          // note: conversion to moment will do date-arithmitic on date rollover (eg jan 38 --> feb 7)
        } else {
          endQuery.d += 1;
        }
        endDate = dateUtils.toDynamoDate(
          moment()
          .year(endQuery.y)
          .month(endQuery.m - 1) //moment 0-indexes months >:o
          .date(endQuery.d)
        );
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

    let stayObj = {
      stayDate: { N: dateUtils.toDynamoDate({ y: year, m: month, d: day }) },
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
        else resolve(true);
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

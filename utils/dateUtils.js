"use strict";

const moment = require('moment');

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

/**
 * Converts any kind of date to the standardized dynamodb record date
 * @param {number | string | Date | moment | object} date Some date representation
 * @return {string} dynamo record date, like '20170101'
 */
exports.toDynamoDate = function(date) {
  let dateQuery;

  // If it is a string of correct length and there's no non-0-9 characters, assume it already is a dynamo date
  if (typeof date === 'string' && date.length === 8 && !/[^0-9]/.exec(date)) {
    return date;
  }

  // A number with 8 characters assume is already a dynamo date
  if (typeof date === 'number' && ('' + date).length === 8) {
    return '' + date;
  }

  if (typeof date === 'number' || typeof date === 'string') {
    let dateMoment = moment.parseZone(date);
    dateQuery = {
      y: dateMoment.year(),
      m: dateMoment.month() + 1, // months are zero-indexed, dates are not
      d: dateMoment.date(),
    }
  } else if (date instanceof Date || date instanceof moment) {
    let dateMoment = moment(date);
    dateQuery = {
      y: dateMoment.year(),
      m: dateMoment.month() + 1, // months are zero-indexed, dates are not
      d: dateMoment.date(),
    }
  } else if (typeof date === 'object' && date.y) {
    dateQuery = date;
  }

  if (!dateQuery) {
    throw new Error('Unexpected date input: ' + JSON.stringify(date));
  }


  let year = !dateQuery.y ? null : validateYear(dateQuery.y);
  let month = !dateQuery.m ? null : validateMonth(dateQuery.m);
  let day = !dateQuery.d ? null : validateDay(dateQuery.d);

  if (!year) {
    throw new Error('Date missing year -- need to include at least a year');
  }

  if (!month) {
    return stringifyYear(year) + '0000';
  } else if (!day) {
    return stringifyYear(year) + stringifyMonth(month) + '00';
  } else {
    return stringifyYear(year) + stringifyMonth(month) + stringifyDay(day);
  }
};

exports.moment2DateQuery = function(date) {
  date = moment(date); // don't mutate
  return {
    y: date.year(),
    m: date.month() + 1, // months are 0-indexed
    d: date.date(),
  };
};

/**
 * Gets the wednesday prior to a given day.
 * @param {Date | moment | object} date A day to get previous wednesday
 * @param {boolean} [inPST] True to set timezone as PST (-8:00)
 * @return {moment} The previous wednesday, 00:00:00 UTC (if no inPST) or 00:00:00-08:00 (if inPST)
 */
exports.getPreviousWednesday = function(date, inPST) {
  if (date instanceof Date || date instanceof moment) {
    date = moment(date);
  } else if (typeof date === 'object' && date.y && date.m && date.d) {
    date = moment.parseZone(`${date.y}-${date.m}-${date.d}-Z`, 'YYYY-M-D-Z');
  } else {
    throw new Error(`Unsupported date: ${JSON.stringify(date, null, 2)}`);
  }

  let dow = date.day(); // sunday 0, saturday 6

  let offsetToWed = dow > 3 ? dow - 3 : dow + 7 - 3; // 3 is wednesday

  let wednesday = date.subtract(offsetToWed, 'd').startOf('day');

  if (inPST) {
    wednesday.utcOffset('-08:00');
  }

  return wednesday;
};

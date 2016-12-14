"use strict";

const _ = require('lodash');
const bcrypt = require('bcrypt');
const dynamodb = require('./dynamodb');

const USER_TABLE = 'Users';
const BCRYPT_SALT_ROUNDS = 10;

/**
 * Convert dynamoDB user into a user model record
 * @param {Object} dynamoUser dynamodb result
 * @param {boolean} [useFull] Opt-in to get full data.  Usually this data shouldn't make it back to frontend
 * @return {Object} user object
 */
function deserializeDynamoDbRecord(dynamoUser, useFull) {
  let user = {
    userId: dynamoUser.userId.S,
    name: dynamoUser.name.S,
    isHost: dynamoUser.isHost.BOOL,
    isAdmin: dynamoUser.isAdmin.BOOL,
  };

  if (useFull) {
    user._password = dynamoUser.password.S;
    user._inviteCode = dynamoUser.inviteCode.S;
    user._inviterUserId = dynamoUser.inviterUserId.S;
  }

  return user;
}

/**
 * Gets a user from the DB
 * @param {string} userId User email
 * @param {boolean} [getFull] True to get full internal attributes -- should NEVER be returned to frontend.
 * @return {Promise.<User>}
 */
exports.getUser = function(userId, getFull) {
  return new Promise((resolve, reject) => {
    if (!userId) {
      return reject(new Error('Missing userId!'));
    }

    let params = {
      TableName: USER_TABLE,
      Key: {
        userId: { S: userId }
      },
      ConsistentRead: false,
      ReturnConsumedCapacity: 'TOTAL'
    };
    dynamodb.getItem(params, function(error, data) {
      if (error) return reject(error);

      if (!data || !data.Item) {
        let e = new Error('User not found');
        e.code = 'UserNotFound';
        e.status = 400;
        return reject(e);
      }

      resolve(deserializeDynamoDbRecord(data.Item, getFull));
    });
  });
};

/**
 * Checks if a user has the correct password
 * @param {string} userId
 * @param {string} password
 * @return {Promise.<Boolean>}
 */
exports.validatePassword = function(userId, password) {
  return exports.getUser(userId, true)
  .then(
    user => bcrypt.compare('' + password, user._password),
    error => {
      if (error.code === 'UserNotFound') return false;
      return Promise.reject(error);
    }
  );
};


exports.createUser = function(inviterUser, newUserObj) {
  let newUserParams;

  return new Promise((resolve, reject) => {
    if (newUserObj.isHost && !inviterUser.isAdmin) {
      return reject(new Error('Only admins can create new hosts'));
    }
    if (newUserObj.isAdmin && !inviterUser.isAdmin) {
      return reject(new Error('Only admins can create new admins'));
    }
    if (!newUserObj.userId) {
      return reject(new Error('userId required'));
    }
    if (!newUserObj.password) {
      return reject(new Error('password required'));
    }
    if (!newUserObj.name) {
      return reject(new Error('name required'));
    }
    if (!newUserObj.inviteCode) {
      return reject(new Error('invite code required')); // TODO: auto-gen?
    }

    newUserParams = {
      isHost: { BOOL: !!newUserObj.isHost },
      isAdmin: { BOOL: !!newUserObj.isAdmin },
      userId: { S: newUserObj.userId },
      name: { S: newUserObj.name },
      inviteCode: { S: newUserObj.inviteCode },
      inviterUserId: { S: inviterUser.userId },
    };

    resolve(newUserParams);
  })
  // Now bcrypt-ify the pw:
  .then(() => bcrypt.hash('' + newUserObj.password, BCRYPT_SALT_ROUNDS))
  .then(passwordHash => new Promise((resolve, reject) => {
    newUserParams.password = { S: passwordHash };
    dynamodb.putItem(
      {
        TableName: USER_TABLE,
        Item: newUserParams,
        Expected: {
          userId: {
            Exists: false,
          },
        },
      }, function(error, data) {
        if (error && error.code === 'ConditionalCheckFailedException') {
          return reject(new Error('User already exists!'));
        }
        if (error) return reject(error);

        resolve(data);
      }
    );
  }));
};

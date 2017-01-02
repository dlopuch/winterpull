"use strict";

const dynamoDb = require('../models/dynamodb');

const userModel = require('../models/user');

const SEED_SCRIPT_INVITER = { userId: 'Seed script', isAdmin: true };


function doScript(silent) {
  let console = global.console;
  if (silent) {
    console = { log: function() {} }
  }

  console.log('\n============================\n== Seeding Users\n============================');

  return userModel.createUser(
    SEED_SCRIPT_INVITER,
    { userId: 'dolores@hosts.com',
      password: 'm@ze',
      name: 'Dolores',
      isHost: true,
      isAdmin: false,
      inviteCode: 'seed'
    }
  )
  .then(() => userModel.createUser(
    SEED_SCRIPT_INVITER,
    { userId: 'bernard@hosts.com',
      password: 'm@ze',
      name: 'Bernard',
      isHost: true,
      isAdmin: true,
      inviteCode: 'seed'
    }
  ))
  .then(() => userModel.createUser(
    SEED_SCRIPT_INVITER,
    { userId: 'william@guests.com',
      password: 'ilikeblack',
      name: 'William',
      isHost: false,
      isAdmin: false,
      inviteCode: 'seed'
    }
  ))
  .then(() => userModel.createUser(
    SEED_SCRIPT_INVITER,
    { userId: 'guest2@guests.com',
      password: 'guestyMcGuestface',
      name: 'Guesty 2',
      isHost: false,
      isAdmin: false,
      inviteCode: 'seed'
    }
  ))
  .then(() => userModel.createUser(
    SEED_SCRIPT_INVITER,
    { userId: 'guest3@guests.com',
      password: 'guestyMcGuestface',
      name: 'Guesty 3',
      isHost: false,
      isAdmin: false,
      inviteCode: 'seed'
    }
  ))
  .then(() => console.log('Users created'))
}

module.exports = doScript;

// execute if called directly
if (require.main === module) {
  doScript();
}



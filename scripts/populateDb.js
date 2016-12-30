"use strict";

const dynamoDb = require('../models/dynamodb');

const userModel = require('../models/user');

const SEED_SCRIPT_INVITER = { userId: 'Seed script', isAdmin: true };


function doScript() {
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
  .then(() => console.log('Dolores created'));
}

module.exports = doScript;

// execute if called directly
if (require.main === module) {
  doScript();
}



"use strict";

const assert = require('chai').assert;

const dateUtils = requireApp('utils/dateUtils');

describe('dateUtils', function() {
  describe('#toDynamoDate', function() {
    describe('date query conversion', function() {
      it('converts a full date-query', function() {
        let date = dateUtils.toDynamoDate({ y: 2017, m: 1, d: 1 });
        assert.strictEqual(date, '20170101');
      });

      it('converts a no-day date-query', function() {
        let date = dateUtils.toDynamoDate({ y: 2017, m: 1 });
        assert.strictEqual(date, '20170100');
      });

      it('converts a no-month date-query', function() {
        let date = dateUtils.toDynamoDate({ y: 2017 });
        assert.strictEqual(date, '20170000');
      });

      it('converts a string-based date-query', function() {
        let date = dateUtils.toDynamoDate({ y: '2017', m: '1' });
        assert.strictEqual(date, '20170100');
      });
    });

    it('converts a Date object', function() {
      let date = dateUtils.toDynamoDate(new Date('2017-01-01T23:59:59Z'));
      assert.strictEqual(date, '20170101');
    });

    it('converts a ms-since-epoch number', function() {
      let date = dateUtils.toDynamoDate((new Date('2017-01-01T23:59:59Z')).getTime());
      assert.strictEqual(date, '20170101');
    });

    it('returns an already-dynamo date', function() {
      let date = dateUtils.toDynamoDate(20170101);
      assert.strictEqual(date, '20170101');

      date = dateUtils.toDynamoDate('20170101');
      assert.strictEqual(date, '20170101');
    });

    it('converts an ISO string', function() {
      let date = dateUtils.toDynamoDate('2017-01-01T23:59:59Z');
      assert.strictEqual(date, '20170101');
    });

    it('converts an ISO string ignoring timezone corrections', function() {
      let date = dateUtils.toDynamoDate('2017-01-01T23:59:59-09:00'); // In UTC, this goes up to 2017-01-02
      assert.strictEqual(date, '20170101');
    });

  });
});
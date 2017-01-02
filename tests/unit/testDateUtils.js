"use strict";

const assert = require('chai').assert;
const moment = require('moment');

const dateUtils = requireApp('utils/dateUtils');

describe('dateUtils', function() {
  describe('#toDynamoDate', function() {
    describe('date query conversion', function() {
      it('converts a full date-query, m and d < 10', function() {
        let date = dateUtils.toDynamoDate({ y: 2017, m: 1, d: 1 });
        assert.strictEqual(date, '20170101');
      });

      it('converts a full date-query, m and d > 10', function() {
        let date = dateUtils.toDynamoDate({ y: 2017, m: 11, d: 21 });
        assert.strictEqual(date, '20171121');
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

  describe('#getPreviousWednesday', function() {
    describe('with date query inputs', function() {
      // Jan 4 and 11, 2017 are wednesdays
      function assertPrevWed(janDate, use11th) {
        assert.strictEqual(
          dateUtils.getPreviousWednesday({ y: 2017, m: 1, d: janDate }).toISOString(),
          use11th ? '2017-01-11T00:00:00.000Z' : '2017-01-04T00:00:00.000Z'
        );
      };
      it('works for a thurs', () => assertPrevWed('05'));
      it('works for a fri'  , () => assertPrevWed('06'));
      it('works for a sat'  , () => assertPrevWed('07'));
      it('works for a sun'  , () => assertPrevWed('08'));
      it('works for a mon'  , () => assertPrevWed('09'));
      it('works for a tues' , () => assertPrevWed('10'));
      it('works for a wed'  , () => assertPrevWed('11'));
      it('works for next thurs', () => assertPrevWed('12', true));
    });

    describe('with Date inputs', function() {
      it('works for a thurs');
      it('works for a fri'  );
      it('works for a sat'  );
      it('works for a sun'  );
      it('works for a mon'  );
      it('works for a tues' );
      it('works for a wed'  );
      it('works for next thurs');
    });
  });
});
import test from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateIntake } from './private-intake.mjs';
test('private enquiries cannot become reader stories even if one marker is edited', () => {
  assert.equal(isPrivateIntake({title:'CONTACT (general): hello',body:'Edited text'}), true);
  assert.equal(isPrivateIntake({title:'Edited title',body:'Intake type: accessibility\nNeeds help'}), true);
  assert.equal(isPrivateIntake({title:'BUSINESS SUBMISSION: New place'}), true);
  assert.equal(isPrivateIntake({title:'A quiet beach',body:'A reader recommendation.'}), false);
});
test('correction and commercial fallback requests are never reader stories',()=>{
 for(const title of ['CORRECTION: PI-test','PARTNER ENQUIRY: PI-P-test']) assert.equal(isPrivateIntake({title}),true);
 for(const kind of ['correction','partner-enquiry']) assert.equal(isPrivateIntake({body:`Intake type: ${kind}\nReference: test`}),true);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyEligibility,canonicalKey } from '../src/lib/jobs/normalize';
import type { NormalizedJob } from '../src/lib/jobs/types';
test('remote alone does not establish Nigeria eligibility',()=>{assert.equal(classifyEligibility('Remote','A distributed team','REMOTE').eligibility,'UNKNOWN');});
test('explicit country restriction takes priority',()=>{assert.equal(classifyEligibility('Remote — US only','Worldwide team','REMOTE').eligibility,'RESTRICTED');});
test('worldwide and EMEA remain distinct',()=>{assert.equal(classifyEligibility('Remote — Worldwide','','REMOTE').eligibility,'WORLDWIDE');assert.equal(classifyEligibility('Remote — EMEA','','REMOTE').eligibility,'EMEA');});
test('explicit Nigeria exclusion overrides worldwide language',()=>{assert.equal(classifyEligibility('Remote — Worldwide','We cannot hire in Nigeria.','REMOTE').eligibility,'RESTRICTED');});
test('same original ATS posting has same canonical key',()=>{const job={companyName:'Example',title:'Engineer',location:'Remote',originalUrl:'https://jobs.lever.co/example/123?utm_source=board'} as NormalizedJob;assert.equal(canonicalKey(job),canonicalKey({...job,originalUrl:'https://jobs.lever.co/example/123'}));});

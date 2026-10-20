import type { UserPreference } from '@prisma/client';
import { defaultWeights } from '../defaults';
import type { NormalizedJob } from './types';
type Weights=typeof defaultWeights;
export function scoreJob(job:NormalizedJob,prefs:UserPreference):{score:number;reasons:string[]} {
  const weights={...defaultWeights,...(typeof prefs.weights==='object'&&prefs.weights&&!Array.isArray(prefs.weights)?prefs.weights as Partial<Weights>:{})};
  let earned=0, possible=0; const reasons:string[]=[];
  const add=(key:keyof Weights,value:number,known=true)=>{ if(known){possible+=weights[key];earned+=weights[key]*Math.max(0,Math.min(1,value));} };
  const title=job.title.toLowerCase(); const preferred=prefs.titles.map(t=>t.toLowerCase());
  const exact=preferred.some(t=>title.includes(t)); const broad=/backend|full.?stack|software engineer|typescript|node|python/i.test(title);
  add('title',exact?1:broad?.72:.1); if(exact) reasons.push('Preferred job title match'); else if(broad) reasons.push('Relevant software engineering role');
  const skills=job.requiredSkills.map(s=>s.toLowerCase()); const hits=prefs.skills.filter(s=>skills.includes(s.toLowerCase()));
  add('skills',hits.length?Math.min(1,hits.length/4):0,skills.length>0); if(hits.length) reasons.push(`${hits.slice(0,3).join(', ')} match`);
  const eligibility=job.nigeriaEligibility;
  add('eligibility',eligibility==='RESTRICTED'?0:['NIGERIA','EXPLICIT_NIGERIA','AFRICA','WORLDWIDE'].includes(eligibility)?1:eligibility==='EMEA'?.7:.5,eligibility!=='UNKNOWN');
  if(['NIGERIA','EXPLICIT_NIGERIA','AFRICA','WORLDWIDE'].includes(eligibility)) reasons.push('Geography may include Nigeria');
  if(eligibility==='RESTRICTED') reasons.push('Geographic restriction appears to exclude Nigeria');
  add('location',job.remoteType==='REMOTE'?1:job.location&&/nigeria|lagos|abuja/i.test(job.location)?1:.2,job.remoteType!=='UNKNOWN');
  if(job.remoteType==='REMOTE') reasons.push('Remote role');
  if(job.sourcePublishedAt){const days=(Date.now()-job.sourcePublishedAt.getTime())/86400000;add('recency',days<=3?1:days<=7?.75:days<=30?.4:.1);if(days<=3) reasons.push('Published in the last 72 hours');}
  if(prefs.experienceLevel&&job.experienceLevel){const same=job.experienceLevel.toLowerCase()===prefs.experienceLevel.toLowerCase();add('experience',same?1:.35);if(!same) reasons.push('Experience level may differ from preference');}
  if(job.employmentType){add('employment',/full.?time/i.test(job.employmentType)?1:.5);}
  if(prefs.minimumSalary&&job.salaryMax){add('salary',job.salaryMax>=prefs.minimumSalary?1:0);if(job.salaryMax>=prefs.minimumSalary) reasons.push('Advertised salary meets preference');}
  let score=possible?Math.round(earned/possible*100):0;
  if(eligibility==='RESTRICTED') score=Math.min(score,20);
  return {score,reasons:reasons.slice(0,5)};
}

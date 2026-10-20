/* Public provider payloads have different optional shapes; adapters validate fields before storing. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Company } from '@prisma/client';
import type { JobProvider,NormalizedJob } from './types';
import { classifyEligibility,classifyRemote,extractSkills,extractSection,htmlToText,inferEmployment,inferExperience,safeDate } from './normalize';

async function getJson(url:string):Promise<any> {
  for(let attempt=0;attempt<3;attempt++) {
    try { const response=await fetch(url,{headers:{Accept:'application/json','User-Agent':'JobHunt/1.0 personal job discovery'},signal:AbortSignal.timeout(15000),cache:'no-store',redirect:'error'});
      if(response.ok) return response.json();
      if(![429,500,502,503,504].includes(response.status)) throw new Error(`HTTP ${response.status} ${url}`);
      const retry=Number(response.headers.get('retry-after')); if(attempt===2) throw new Error(`HTTP ${response.status} ${url}`);
      await new Promise(resolve=>setTimeout(resolve,Number.isFinite(retry)&&retry>0?Math.min(retry*1000,15000):700*2**attempt));
    } catch(error) { if(attempt===2) throw error; await new Promise(resolve=>setTimeout(resolve,700*2**attempt)); }
  }
  return null;
}
function base(input:{externalId:string;provider:string;companyName:string;companyLogo?:string|null;title:string;description:string;location?:string|null;remoteType?:NormalizedJob['remoteType'];applyUrl:string;originalUrl:string;published?:unknown;salaryMin?:number|null;salaryMax?:number|null;currency?:string|null;salaryPeriod?:string|null;employmentType?:string|null}):NormalizedJob {
  const descriptionText=htmlToText(input.description);
  const location=input.location||null;
  const remoteType=input.remoteType??classifyRemote(`${location??''} ${input.title} ${descriptionText.slice(0,800)}`);
  const eligibility=classifyEligibility(location??'',descriptionText,remoteType);
  return {externalId:input.externalId,provider:input.provider,companyName:input.companyName,companyLogo:input.companyLogo,title:input.title,description:input.description,descriptionText,location,remoteType,nigeriaEligibility:eligibility.eligibility,eligibilityReason:eligibility.reason,eligibleRegions:eligibility.regions,salaryMin:input.salaryMin??null,salaryMax:input.salaryMax??null,currency:input.currency??null,salaryPeriod:input.salaryPeriod??null,experienceLevel:inferExperience(`${input.title} ${descriptionText.slice(0,1200)}`),employmentType:input.employmentType??inferEmployment(descriptionText.slice(0,1200)),requiredSkills:extractSkills(`${input.title} ${descriptionText}`),preferredSkills:extractSection(input.description,/nice to have|preferred|bonus skills/i).flatMap(extractSkills),responsibilities:extractSection(input.description,/responsibilit|what you.ll do|the role/i),qualifications:extractSection(input.description,/qualifications|requirements|what you bring/i),benefits:extractSection(input.description,/benefits|perks|what we offer/i),applyUrl:input.applyUrl,originalUrl:input.originalUrl,sourcePublishedAt:safeDate(input.published)};
}
function remotiveSalary(value:unknown){if(typeof value!=='string')return {};const numbers=[...value.matchAll(/(?:[$£€₦]\s*)?([\d,]{2,})(?:\s*[kK])?/g)].slice(0,2).map(m=>Number(m[1].replaceAll(',',''))*(/k$/i.test(m[0])?1000:1));if(!numbers.length)return {};const currency=/\$|USD/i.test(value)?'USD':/£|GBP/i.test(value)?'GBP':/€|EUR/i.test(value)?'EUR':/₦|NGN/i.test(value)?'NGN':null;return {salaryMin:numbers[0],salaryMax:numbers[1]??null,currency,salaryPeriod:/hour|hr/i.test(value)?'hour':/month/i.test(value)?'month':/year|annual|annum/i.test(value)?'year':null};}
export class GreenhouseProvider implements JobProvider {
  name='greenhouse'; errors:string[]=[]; constructor(private companies:Company[]){}
  async fetchJobs() { const jobs:NormalizedJob[]=[]; const errors=this.errors;
    for(const company of this.companies) { try { const data=await getJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(company.atsBoardIdentifier!)}/jobs?content=true`);
      for(const item of data.jobs??[]) { const url=item.absolute_url; if(!url) continue; jobs.push(base({externalId:String(item.id),provider:this.name,companyName:company.name,title:item.title,description:item.content??'',location:item.location?.name,applyUrl:url,originalUrl:url,published:item.first_published})); }
    } catch(e) { errors.push(`${company.name}: ${String(e)}`); } }
    if(errors.length) console.error('Greenhouse board failures',errors); if(errors.length===this.companies.length&&this.companies.length) throw new Error(errors.join('; ')); return jobs;
  }
}
export class LeverProvider implements JobProvider {
  name='lever'; errors:string[]=[]; constructor(private companies:Company[]){}
  async fetchJobs() { const jobs:NormalizedJob[]=[]; const errors=this.errors;
    for(const company of this.companies) { try { for(let skip=0;skip<1000;skip+=100) { const data=await getJson(`https://api.lever.co/v0/postings/${encodeURIComponent(company.atsBoardIdentifier!)}?mode=json&skip=${skip}&limit=100`);
      if(!Array.isArray(data)) throw new Error('Unexpected response');
      for(const item of data) { const url=item.hostedUrl??item.applyUrl; if(!url) continue; const description=item.description??item.descriptionPlain??'';
        jobs.push(base({externalId:String(item.id),provider:this.name,companyName:company.name,title:item.text,description,location:item.categories?.location,remoteType:item.workplaceType==='remote'?'REMOTE':item.workplaceType==='hybrid'?'HYBRID':item.workplaceType==='on-site'?'ONSITE':undefined,applyUrl:item.applyUrl??url,originalUrl:url,salaryMin:item.salaryRange?.min,salaryMax:item.salaryRange?.max,currency:item.salaryRange?.currency,salaryPeriod:item.salaryRange?.interval,employmentType:item.categories?.commitment})); }
      if(data.length<100) break;
    } } catch(e) { errors.push(`${company.name}: ${String(e)}`); } }
    if(errors.length) console.error('Lever board failures',errors); if(errors.length===this.companies.length&&this.companies.length) throw new Error(errors.join('; ')); return jobs;
  }
}
export class RemotiveProvider implements JobProvider { name='remotive'; async fetchJobs() { const data=await getJson('https://remotive.com/api/remote-jobs?category=software-dev&limit=100');
  return (data.jobs??[]).map((item:any)=>base({externalId:String(item.id),provider:this.name,companyName:item.company_name,companyLogo:item.company_logo,title:item.title,description:item.description??'',location:item.candidate_required_location,remoteType:'REMOTE',applyUrl:item.url,originalUrl:item.url,published:item.publication_date,employmentType:item.job_type,...remotiveSalary(item.salary)}));
} }
export class HimalayasProvider implements JobProvider {
  name='himalayas';
  async fetchJobs() {
    const jobs:NormalizedJob[]=[];
    const seen=new Set<string>();
    for(const query of ['software','backend','developer']) {
      for(let page=1;page<=3;page++) {
        const url=new URL('https://himalayas.app/jobs/api/search');
        url.search=new URLSearchParams({country:'NG',q:query,sort:'recent',page:String(page)}).toString();
        const data=await getJson(url.toString());
        if(!Array.isArray(data.jobs)) throw new Error('Unexpected Himalayas response');
        for(const item of data.jobs) {
          if(!item.guid||!item.title||!item.companyName||!item.applicationLink||seen.has(item.guid)) continue;
          seen.add(item.guid);
          const regions=Array.isArray(item.locationRestrictions)?item.locationRestrictions:[];
          const nigeriaOnly=regions.some((region:unknown)=>typeof region==='string'&&/^(NG|Nigeria)$/i.test(region));
          const worldwide=regions.length===0;
          const timezones=Array.isArray(item.timezoneRestrictions)?item.timezoneRestrictions:[];
          if((!nigeriaOnly&&!worldwide)||(timezones.length>0&&!timezones.some((offset:unknown)=>Number(offset)===1))) continue;
          const job=base({externalId:String(item.guid),provider:this.name,companyName:String(item.companyName),companyLogo:item.companyLogo,title:String(item.title),description:String(item.description??item.excerpt??''),location:nigeriaOnly?'Nigeria':'Worldwide',remoteType:'REMOTE',applyUrl:String(item.applicationLink),originalUrl:String(item.guid),published:typeof item.pubDate==='number'?new Date(item.pubDate*1000):item.pubDate,salaryMin:item.minSalary,salaryMax:item.maxSalary,currency:item.currency,salaryPeriod:item.salaryPeriod,employmentType:item.employmentType});
          if(job.nigeriaEligibility==='RESTRICTED') continue;
          job.nigeriaEligibility=nigeriaOnly?'EXPLICIT_NIGERIA':'WORLDWIDE';
          job.eligibilityReason=nigeriaOnly?'Himalayas lists Nigeria in the allowed locations.':'Himalayas lists no country restriction and includes Nigeria’s UTC+1 timezone.';
          job.eligibleRegions=nigeriaOnly?['Nigeria']:['Worldwide'];
          jobs.push(job);
        }
        if(data.jobs.length===0) break;
      }
    }
    return jobs;
  }
}
export class ArbeitnowProvider implements JobProvider { name='arbeitnow'; async fetchJobs() { const jobs:NormalizedJob[]=[]; let url='https://www.arbeitnow.com/api/job-board-api';
  for(let page=0;page<3&&url;page++) { const data=await getJson(url); for(const item of data.data??[]) { if(!/software|backend|front.?end|full.?stack|developer|programmer|engineer|devops|typescript|python|node/i.test(`${item.title} ${(item.tags??[]).join(' ')}`)) continue;
    jobs.push(base({externalId:item.slug,provider:this.name,companyName:item.company_name,title:item.title,description:item.description??'',location:item.location,remoteType:item.remote?'REMOTE':undefined,applyUrl:item.url,originalUrl:item.url,published:item.created_at?new Date(item.created_at*1000):null,employmentType:item.job_types?.[0]})); }
    url=typeof data.links?.next==='string'?data.links.next:'';
  } return jobs;
} }

export class JsonFeedProvider implements JobProvider { name='jsonfeed'; errors:string[]=[];constructor(private companies:Company[]){}
  async fetchJobs(){const jobs:NormalizedJob[]=[];for(const company of this.companies){try{const url=company.atsBoardIdentifier!;const parsed=new URL(url);if(parsed.protocol!=='https:'||/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?)/i.test(parsed.hostname))throw new Error('Feed URL must be public HTTPS');const data=await getJson(url);if(!/^https:\/\/jsonfeed\.org\/version\//.test(data.version??'')||!Array.isArray(data.items))throw new Error('Expected JSON Feed items array');for(const item of data.items.slice(0,500)){if(!item.id||!item.title||!item.url)continue;const description=item.content_html??item.content_text??item.summary??'';jobs.push(base({externalId:String(item.id),provider:this.name,companyName:company.name,title:String(item.title),description:String(description),location:item.location??null,applyUrl:item.url,originalUrl:item.url,published:item.date_published}));}}catch(error){this.errors.push(`${company.name}: ${String(error)}`);}}if(this.errors.length===this.companies.length&&this.companies.length)throw new Error(this.errors.join('; '));return jobs;}
}

export function createProviders(companies:Company[]):JobProvider[] { return [new GreenhouseProvider(companies.filter(c=>c.atsProvider==='greenhouse'&&c.active)),new LeverProvider(companies.filter(c=>c.atsProvider==='lever'&&c.active)),new RemotiveProvider(),new HimalayasProvider(),new ArbeitnowProvider(),new JsonFeedProvider(companies.filter(c=>c.atsProvider==='jsonfeed'&&c.active))]; }

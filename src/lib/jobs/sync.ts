import { db } from '../db';
import { defaultPreferences } from '../defaults';
import { canonicalKey, normalizeTitle } from './normalize';
import { createProviders } from './providers';
import { scoreJob } from './match';
import { removeExpiredJobs } from './cleanup';
const relevant=/software|back.?end|front.?end|full.?stack|developer|devops|platform engineer|site reliability|typescript|javascript|node\.?(?:js)?|python|web engineer/i;
export async function syncJobs(onlyProviders?:string[]) {
  const prefs=await db.userPreference.upsert({where:{id:'single-user'},create:{id:'single-user',...defaultPreferences},update:{}});
  const companies=await db.company.findMany({where:{active:true}});
  const enabled=await db.jobSource.findMany(); const providers=createProviders(companies).filter(p=>enabled.find(s=>s.provider===p.name)?.enabled!==false&&(!onlyProviders||onlyProviders.includes(p.name)));
  const results=[];
  for(const provider of providers){ if(provider.name==='remotive'&&enabled.find(s=>s.provider==='remotive')?.lastSuccessfulSync&&Date.now()-enabled.find(s=>s.provider==='remotive')!.lastSuccessfulSync!.getTime()<6*3600000){results.push({source:provider.name,status:'skipped',fetched:0,inserted:0,updated:0,skipped:0});continue;} const run=await db.syncRun.create({data:{source:provider.name}}); let fetched=0,inserted=0,updated=0,skipped=0;
    try { const jobs=await provider.fetchJobs(); fetched=jobs.length;
      for(const job of jobs){try {
        if(job.remoteType!=='REMOTE'||!relevant.test(job.title)||prefs.excludedCompanies.some(c=>job.companyName.toLowerCase()===c.toLowerCase())||prefs.excludedKeywords.some(k=>`${job.title} ${job.descriptionText}`.toLowerCase().includes(k.toLowerCase()))) {skipped++;continue;}
        const key=canonicalKey(job); const existing=await db.job.findFirst({where:{OR:[{provider:job.provider,externalId:job.externalId},{canonicalKey:key}]},select:{id:true,descriptionText:true}});
        const match=scoreJob(job,prefs); let company=companies.find(c=>c.name.toLowerCase()===job.companyName.toLowerCase());if(!company&&job.companyLogo){company=await db.company.upsert({where:{name:job.companyName},create:{name:job.companyName,logo:job.companyLogo},update:{logo:job.companyLogo}});companies.push(company);}
        const data={externalId:job.externalId,provider:job.provider,companyId:company?.id??null,companyName:job.companyName,title:normalizeTitle(job.title),slug:normalizeTitle(job.title).toLowerCase().replace(/[^a-z0-9]+/g,'-'),description:job.description,descriptionText:job.descriptionText,responsibilities:job.responsibilities,qualifications:job.qualifications,benefits:job.benefits,location:job.location,remoteType:job.remoteType,eligibleRegions:job.eligibleRegions,nigeriaEligibility:job.nigeriaEligibility,eligibilityReason:job.eligibilityReason,salaryMin:job.salaryMin,salaryMax:job.salaryMax,currency:job.currency,salaryPeriod:job.salaryPeriod,experienceLevel:job.experienceLevel,employmentType:job.employmentType,requiredSkills:job.requiredSkills,preferredSkills:job.preferredSkills,applyUrl:job.applyUrl,originalUrl:job.originalUrl,sourcePublishedAt:job.sourcePublishedAt,lastSeenAt:new Date(),lastVerifiedAt:new Date(),matchScore:match.score,matchReasons:match.reasons,status:'ACTIVE' as const};
        if(existing){await db.job.update({where:{id:existing.id},data});updated++;} else {await db.job.create({data:{...data,canonicalKey:key}});inserted++;}
      }catch(error){console.error('Job processing failed',provider.name,job.externalId,error);skipped++;}}
      const errors=provider.errors??[];if(!errors.length&&fetched>0&&provider.name!=='himalayas')await db.job.updateMany({where:{provider:provider.name,status:'ACTIVE',lastSeenAt:{lt:run.startedAt}},data:{status:'STALE'}});await db.syncRun.update({where:{id:run.id},data:{status:errors.length?'PARTIAL':'SUCCESS',endedAt:new Date(),fetched,inserted,updated,skipped,error:errors.length?errors.join('; '):null}});
      if(!errors.length) await db.jobSource.upsert({where:{provider:provider.name},create:{provider:provider.name,lastSuccessfulSync:new Date()},update:{lastSuccessfulSync:new Date()}});
      results.push({source:provider.name,status:errors.length?'partial':'success',fetched,inserted,updated,skipped,error:errors.length?errors.join('; '):undefined});
    }catch(error){const message=error instanceof Error?error.message:String(error);await db.syncRun.update({where:{id:run.id},data:{status:'FAILED',endedAt:new Date(),fetched,inserted,updated,skipped,error:message}});results.push({source:provider.name,status:'failed',error:message,fetched,inserted,updated,skipped});}
  }
  await removeExpiredJobs();
  return results;
}

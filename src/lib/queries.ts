import { db } from './db';
import { defaultPreferences } from './defaults';
import type { Prisma,RemoteType,Eligibility } from '@prisma/client';
export async function getPreferences(){return db.userPreference.upsert({where:{id:'single-user'},create:{id:'single-user',...defaultPreferences},update:{}});}
export type Filters={q?:string;remote?:string;eligibility?:string;source?:string;sort?:string;page?:string;minScore?:string;view?:string;age?:string;salary?:string;employment?:string};
export async function listJobs(filters:Filters,savedOnly=false){const prefs=await getPreferences();const page=Math.max(1,Number(filters.page)||1);const pageSize=12;
 const remoteValues:RemoteType[]=['REMOTE','HYBRID','ONSITE','UNKNOWN'];const eligibilityValues:Eligibility[]=['NIGERIA','AFRICA','EMEA','WORLDWIDE','EXPLICIT_NIGERIA','RESTRICTED','UNKNOWN'];
 const remote=remoteValues.find(value=>value===filters.remote);const eligibility=eligibilityValues.find(value=>value===filters.eligibility);
 const where:Prisma.JobWhereInput={...(savedOnly?{saved:{isNot:null}}:{status:'ACTIVE'}),AND:[],...(savedOnly&&remote?{remoteType:remote}:!savedOnly?{remoteType:'REMOTE'}:{}),...(eligibility?{nigeriaEligibility:eligibility}:savedOnly?{}:{nigeriaEligibility:{not:'RESTRICTED'}}),...(filters.source?{provider:filters.source}:{}),matchScore:{gte:Number(filters.minScore??(savedOnly?0:prefs.matchThreshold))||0}};
 const and=where.AND as Prisma.JobWhereInput[];
 if(filters.q)and.push({OR:[{title:{contains:filters.q,mode:'insensitive'}},{companyName:{contains:filters.q,mode:'insensitive'}},{requiredSkills:{has:filters.q}}]});
 if(filters.salary)and.push({salaryMax:{gte:Number(filters.salary)}});
 if(filters.employment)and.push({employmentType:{contains:filters.employment,mode:'insensitive'}});
 const age=savedOnly?(filters.age?Number(filters.age):0):Math.min(7,Number(filters.age??prefs.maxAgeDays)||7);if(age>0)and.push({firstDiscoveredAt:{gte:new Date(Date.now()-age*86400000)}});
 const orderBy:Prisma.JobOrderByWithRelationInput=filters.sort==='newest'?{sourcePublishedAt:'desc'}:filters.sort==='discovered'?{firstDiscoveredAt:'desc'}:filters.sort==='salary'?{salaryMax:'desc'}:{matchScore:'desc'};
 const [jobs,total]=await Promise.all([db.job.findMany({where,include:{company:true,saved:true,application:true},orderBy,skip:(page-1)*pageSize,take:pageSize}),db.job.count({where})]);
 return {jobs,total,page,pages:Math.max(1,Math.ceil(total/pageSize))};
}
export async function dashboardStats(){const day=new Date(Date.now()-86400000);const week=new Date(Date.now()-7*86400000);const activeRemote={remoteType:'REMOTE' as const,status:'ACTIVE' as const,firstDiscoveredAt:{gte:week}};const [total,recent,remote,matched,saved,applications,lastSync]=await Promise.all([db.job.count({where:activeRemote}),db.job.count({where:{...activeRemote,firstDiscoveredAt:{gte:day}}}),db.job.count({where:activeRemote}),db.job.count({where:{...activeRemote,matchScore:{gte:75}}}),db.savedJob.count(),db.application.count({where:{status:{not:'NOT_APPLIED'}}}),db.syncRun.findFirst({orderBy:{startedAt:'desc'}})]);return {total,recent,remote,matched,saved,applications,lastSync};}

import type { Eligibility, RemoteType } from '@prisma/client';
export interface NormalizedJob {
  externalId:string; provider:string; companyName:string; companyLogo?:string|null; title:string; description:string; descriptionText:string;
  location:string|null; remoteType:RemoteType; nigeriaEligibility:Eligibility; eligibilityReason:string|null;
  eligibleRegions:string[]; salaryMin:number|null; salaryMax:number|null; currency:string|null; salaryPeriod:string|null;
  experienceLevel:string|null; employmentType:string|null; requiredSkills:string[]; preferredSkills:string[];
  responsibilities:string[]; qualifications:string[]; benefits:string[]; applyUrl:string; originalUrl:string;
  sourcePublishedAt:Date|null;
}
export interface JobProvider { name:string; errors?:string[]; fetchJobs():Promise<NormalizedJob[]>; }

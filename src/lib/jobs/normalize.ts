import type { Eligibility, RemoteType } from '@prisma/client';
import type { NormalizedJob } from './types';

const skillMatchers: [string,RegExp][] = [
  ['TypeScript',/\btypescript\b/i],['JavaScript',/\bjavascript\b/i],['Node.js',/\bnode(?:\.js|js)?\b/i],
  ['Next.js',/\bnext(?:\.js|js)?\b/i],['NestJS',/\bnest(?:\.js|js)?\b/i],['Express.js',/\bexpress(?:\.js|js)?\b/i],
  ['Python',/\bpython\b/i],['Django',/\bdjango\b/i],['Flask',/\bflask\b/i],['PostgreSQL',/\bpostgres(?:ql)?\b/i],
  ['MySQL',/\bmysql\b/i],['Redis',/\bredis\b/i],['Docker',/\bdocker\b/i],['REST APIs',/\brest(?:ful)?\s*api/i],
  ['WebSockets',/\bwebsockets?\b/i],['AWS',/\baws\b|amazon web services/i],['Git',/\bgit\b/i],
  ['React',/\breact\b/i],['Go',/\bgolang\b|\bgo developer\b/i],['Kubernetes',/\bkubernetes\b/i],['GraphQL',/\bgraphql\b/i],
];
export function htmlToText(html:string):string { return html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/\s+/g,' ').trim(); }
export function extractSkills(text:string):string[] { return skillMatchers.filter(([,re])=>re.test(text)).map(([name])=>name); }
export function extractSection(html:string,heading:RegExp):string[]{const blocks=[...html.matchAll(/<(?:h[2-4]|strong|b)[^>]*>([\s\S]*?)<\/(?:h[2-4]|strong|b)>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/gi)];const block=blocks.find(m=>heading.test(htmlToText(m[1])));return block?[...block[2].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map(m=>htmlToText(m[1])).filter(Boolean).slice(0,20):[];}
export function classifyRemote(text:string):RemoteType { if (/\bhybrid\b/i.test(text)) return 'HYBRID'; if (/\bremote\b|work from anywhere|distributed team/i.test(text)) return 'REMOTE'; if (/\bon.?site\b|in.?office\b/i.test(text)) return 'ONSITE'; return 'UNKNOWN'; }
export function classifyEligibility(location:string, description:string, remote:RemoteType):{eligibility:Eligibility;reason:string;regions:string[]} {
  const text=`${location} ${description}`.replace(/<[^>]+>/g,' ');
  const compact=`${location} ${description.slice(0,5000)}`;
  if(/(?:cannot|can't|do not|not able to|unable to)\s+(?:hire|employ|accept applicants)\s+(?:in|from)\s+Nigeria|(?:excluding|except|not available in)\s+Nigeria/i.test(text)) return {eligibility:'RESTRICTED',reason:'The listing explicitly excludes applications from Nigeria.',regions:[]};
  if (/\b(?:United States|USA|US|Canada|United Kingdom|UK|Germany|France|Poland|India|Australia)\b/i.test(location) && !/\b(?:Nigeria|Africa|EMEA|Worldwide|Global)\b/i.test(location)) return {eligibility:'RESTRICTED',reason:'The advertised location names other countries and does not list Nigeria.',regions:[]};
  if (/\b(?:remote\s*[-—,:]?\s*)?(?:US|USA|United States|Canada|UK|United Kingdom|Europe)\s*(?:only|based|residents?)\b|must (?:be located|reside|live) in (?:the )?(?:US|USA|United States|Canada|UK|United Kingdom|EU)\b|(?:US|USA|United States|Canada|UK|United Kingdom|EU) (?:work authorization|citizenship) required/i.test(compact)) return {eligibility:'RESTRICTED',reason:'The listing states a geographic or work authorization restriction outside Nigeria.',regions:[]};
  if (/\b(?:Nigeria|Nigerian|Lagos|Abuja)\b/i.test(text)) return {eligibility:/explicitly|open to|hire in|work from nigeria/i.test(text)?'EXPLICIT_NIGERIA':'NIGERIA',reason:'Nigeria is named in the listing.',regions:['Nigeria']};
  if (/\b(?:worldwide|anywhere in the world|globally|global remote)\b/i.test(compact)) return {eligibility:'WORLDWIDE',reason:'The listing describes worldwide availability; confirm any employment details with the employer.',regions:['Worldwide']};
  if (/\b(?:EMEA|Europe,? Middle East (?:and|&) Africa)\b/i.test(compact)) return {eligibility:'EMEA',reason:'EMEA is listed; confirm whether Nigeria is included by the employer.',regions:['EMEA']};
  if (/\b(?:Africa|African countries|across Africa)\b/i.test(compact)) return {eligibility:'AFRICA',reason:'Africa is listed; confirm country-specific availability.',regions:['Africa']};
  return {eligibility:'UNKNOWN',reason:remote==='REMOTE'?'Remote is stated, but eligible countries are not specified.':'The listing does not establish eligibility from Nigeria.',regions:[]};
}
export function inferExperience(text:string):string|null { const m=text.match(/\b(intern|junior|entry.level|mid.level|senior|staff|principal|lead)\b/i); return m?.[1]?.toLowerCase().replace('entry.level','entry') ?? null; }
export function inferEmployment(text:string):string|null { const m=text.match(/\b(full.time|part.time|contract|internship|temporary)\b/i); return m?.[1]?.toLowerCase().replace('.','-') ?? null; }
export function safeDate(value:unknown):Date|null { if (!value) return null; const date=new Date(value as string); return Number.isNaN(date.getTime())?null:date; }
export function cleanUrl(value:string):string { try { const u=new URL(value); for(const key of [...u.searchParams.keys()]) if (/^(utm_|ref|source|gh_src)/i.test(key)) u.searchParams.delete(key); u.hash=''; return u.toString(); } catch { return value; } }
export function canonicalKey(job:NormalizedJob):string { const url=cleanUrl(job.originalUrl).toLowerCase(); const match=url.match(/(?:greenhouse\.io|lever\.co)\/[^?#]+/); return match?.[0] ?? `${job.companyName}|${job.title}|${job.location ?? ''}`.toLowerCase().replace(/[^a-z0-9|]+/g,' ').trim(); }
export function normalizeTitle(title:string):string { return title.replace(/\s+/g,' ').trim(); }

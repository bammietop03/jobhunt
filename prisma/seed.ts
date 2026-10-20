import { PrismaClient } from '@prisma/client';
import { defaultPreferences } from '../src/lib/defaults';
const db=new PrismaClient();
async function main(){
  for(const company of [
    {name:'GitLab',website:'https://about.gitlab.com',careerPageUrl:'https://job-boards.greenhouse.io/gitlab',atsProvider:'greenhouse',atsBoardIdentifier:'gitlab'},
    {name:'Remote',website:'https://remote.com',careerPageUrl:'https://job-boards.greenhouse.io/remotecom',atsProvider:'greenhouse',atsBoardIdentifier:'remotecom'},
    {name:'Sonar',website:'https://www.sonarsource.com',careerPageUrl:'https://jobs.lever.co/sonarsource',atsProvider:'lever',atsBoardIdentifier:'sonarsource'},
  ]) await db.company.upsert({where:{name:company.name},create:company,update:company});
  await db.userPreference.upsert({where:{id:'single-user'},create:{id:'single-user',...defaultPreferences},update:{}});
  for(const provider of ['greenhouse','lever','remotive','himalayas','arbeitnow','jsonfeed']) await db.jobSource.upsert({where:{provider},create:{provider,enabled:true},update:{}});
}
main().finally(()=>db.$disconnect());

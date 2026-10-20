import { NextRequest,NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { syncJobs } from '@/lib/jobs/sync';
import { removeExpiredJobs } from '@/lib/jobs/cleanup';
import { getPreferences } from '@/lib/queries';
export const runtime='nodejs';export const maxDuration=300;
export async function POST(request:NextRequest){const secret=process.env.CRON_SECRET;const supplied=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')??'';if(!secret||!supplied||Buffer.byteLength(secret)!==Buffer.byteLength(supplied)||!timingSafeEqual(Buffer.from(secret),Buffer.from(supplied)))return NextResponse.json({error:'Unauthorized'},{status:401});try{if(!(await getPreferences()).syncEnabled){const removed=await removeExpiredJobs();return NextResponse.json({skipped:true,reason:'Automatic sync disabled',removed:removed.count});}return NextResponse.json({results:await syncJobs()});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:String(e)},{status:500});}}

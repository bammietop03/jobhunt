'use server';import { syncJobs } from '@/lib/jobs/sync';import { revalidatePath } from 'next/cache';
export async function manualSync(){const results=await syncJobs();revalidatePath('/');revalidatePath('/saved');revalidatePath('/applications');revalidatePath('/settings');return results;}

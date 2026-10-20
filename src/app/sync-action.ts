'use server';import { syncJobs } from '@/lib/jobs/sync';import { revalidatePath } from 'next/cache';import { requireAuth } from '@/lib/require-auth';
export async function manualSync(){await requireAuth();const results=await syncJobs();revalidatePath('/');revalidatePath('/saved');revalidatePath('/applications');revalidatePath('/settings');return results;}


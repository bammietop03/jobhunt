import { db } from '../db';

/** Keep bookmarks and real application history regardless of listing age. */
export async function removeExpiredJobs(now = new Date()) {
  const cutoff = new Date(now.getTime() - 7 * 86400000);
  return db.job.deleteMany({
    where: {
      saved: { is: null },
      AND: [
        { firstDiscoveredAt: { lt: cutoff } },
        { OR: [{ application: { is: null } }, { application: { is: { status: 'NOT_APPLIED' } } }] },
      ],
    },
  });
}

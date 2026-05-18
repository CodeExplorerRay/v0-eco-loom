import { db } from '@/lib/db';
import {
  countDemoWorkspaceData,
  DEMO_COMPANY_ID,
  seedDemoWorkspace,
} from '@/lib/demo-workspace-seed';

export async function seedDatabase(options?: { clearExisting?: boolean }) {
  const clearExisting = options?.clearExisting ?? false;
  const counts = await countDemoWorkspaceData(db);
  const hasData =
    counts.departments +
      counts.ledgerEntries +
      counts.goals +
      counts.reports >
    0;

  if (hasData && !clearExisting) {
    return {
      message: 'Database already seeded',
      companyId: DEMO_COMPANY_ID,
      summary: counts,
      seeded: false,
    };
  }

  const summary = await seedDemoWorkspace(db, { clearExisting });
  return {
    message: hasData ? 'Existing sample data replaced successfully!' : 'Database seeded successfully!',
    companyId: DEMO_COMPANY_ID,
    summary,
    seeded: true,
  };
}

export { DEMO_COMPANY_ID };

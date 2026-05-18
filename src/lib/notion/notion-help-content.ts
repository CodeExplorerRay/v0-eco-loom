export const NOTION_SETUP_GUIDE_STEPS = [
  {
    step: 1,
    title: 'Create the Notion integration',
    description:
      'Go to notion.so/my-integrations, create a new internal integration, and copy the Internal Integration Token.',
    link: 'https://www.notion.so/my-integrations',
  },
  {
    step: 2,
    title: 'Create or identify the required databases',
    description:
      'Prepare one database each for Carbon Ledger, Sustainability Goals, Reports, Facilities / Sites, and the Eco-Loom Knowledge Base in the target workspace.',
  },
  {
    step: 3,
    title: 'Share each database with the integration',
    description:
      'Open Share in Notion, add your integration under Connections, and confirm the integration can edit those databases.',
  },
  {
    step: 4,
    title: 'Copy the database IDs',
    description:
      'Open each database page and copy the database ID from the URL so Eco-Loom can map the correct Notion destinations.',
  },
  {
    step: 5,
    title: 'Save the Eco-Loom configuration',
    description:
      'Paste the connection details and database links into Eco-Loom, then save the Notion MCP configuration before testing or syncing.',
  },
  {
    step: 6,
    title: 'Run Test Connection',
    description:
      'Verify the token, workspace, and mapped databases before turning on any recurring sync behavior.',
  },
  {
    step: 7,
    title: 'Run one manual import or export',
    description:
      'Use a first manual sync to confirm that records, property mappings, and permissions behave as expected in the target workspace.',
  },
  {
    step: 8,
    title: 'Enable Auto Sync only after validation',
    description:
      'Turn on Auto Sync once the manual check passes and your production scheduled runner is ready to pull Notion changes on a regular schedule.',
  },
] as const satisfies ReadonlyArray<{
  step: number;
  title: string;
  description: string;
  link?: string;
}>;

export const NOTION_FAQ_ITEMS = [
  {
    id: 'api-key-format',
    question: 'Why does Test Connection fail immediately?',
    answer:
      'The most common cause is an invalid connection token or a token from the wrong workspace. Re-copy the token from the correct Notion integration and save it again before retrying.',
  },
  {
    id: 'database-sharing',
    question: 'Why does Eco-Loom say a database is not mapped or not shared?',
    answer:
      'The database may exist, but the integration still needs explicit access. Open that database in Notion, use Share, add the integration, and confirm the ID you pasted matches that exact database.',
  },
  {
    id: 'sync-status',
    question: 'What should I do before enabling Auto Sync?',
    answer:
      'Save the configuration first, confirm the right workspace is shown in Connection Status, and run at least one manual test or sync so you know the mappings and permissions are correct. Auto Sync is meant for a live production runner, so it should stay off until the workspace mappings are verified.',
  },
  {
    id: 'cron-runner',
    question: 'How should scheduled agent processing work in production?',
    answer:
      'Use the production scheduled runner so Eco-Loom can regularly pull fresh Notion changes and process follow-up tasks without a manual trigger. On Vercel Hobby, that runner is limited to a daily schedule. Preview deployments do not run scheduled jobs automatically, so production is the correct place for the runner.',
  },
  {
    id: 'preview-deployments',
    question: 'Why is Auto Sync not running on my preview deployment?',
    answer:
      'Vercel Cron Jobs only execute on the production deployment. Preview deployments can still run manual Notion sync actions, but the scheduled runner will not fire there automatically.',
  },
  {
    id: 'manual-import-after-setup',
    question: 'Should I run a manual sync after saving the configuration?',
    answer:
      'Yes. A first manual sync is the safest way to validate property mappings, duplicate handling, and permissions before handing the integration over to scheduled automation.',
  },
  {
    id: 'missing-source-type',
    question: 'Why would a Carbon Ledger field like Source Type not show up in Notion?',
    answer:
      'This usually means the destination field in Notion does not line up with Eco-Loom’s expected mapping. Re-run Sync to Notion after confirming the database has a compatible field and the integration still has edit access.',
  },
  {
    id: 'cron-unauthorized',
    question: 'What does “Blocked unauthorized cron request” usually mean?',
    answer:
      'This usually means the production scheduled runner is missing its secret or was deployed with the wrong protected settings. Re-save the scheduled-runner secret in production and redeploy before testing again.',
  },
  {
    id: 'agent-runs-empty',
    question: 'Why do Agent Runs or Automation Queue still look idle after setup?',
    answer:
      'The queue only fills when Notion imports or admin actions actually enqueue follow-up work. Confirm that Auto Sync is enabled, the cron runner has executed at least once in production, and the mapped databases contain recent changes to pull.',
  },
  {
    id: 'sample-data',
    question: 'Is the sample data safe to use with Notion MCP?',
    answer:
      'Yes, but it should stay clearly demo-only. Use Replace Sample Data rather than generating duplicates, and verify the target Notion workspace is a sandbox or demo workspace before syncing sample records outward.',
  },
] as const;

export const NOTION_PRODUCTION_CHECKLIST = [
  {
    id: 'workspace-boundaries',
    title: 'Validate workspace boundaries',
    description:
      'Confirm the saved connection details, mapped databases, and Eco-Loom company all refer to the same intended Notion workspace.',
    bullets: [
      'Test Connection shows the correct workspace name.',
      'All four mapped databases live in that same workspace.',
      'The integration has been shared to each target database.',
    ],
  },
  {
    id: 'first-sync-readiness',
    title: 'Complete a first manual sync before handoff',
    description:
      'Use one manual run to validate real data flow before relying on cron or the Notion-side custom agent.',
    bullets: [
      'Run one import from Notion into Eco-Loom.',
      'Review Audit Center and Agent Runs for follow-up work.',
      'Confirm Carbon Ledger, Goals, and Reports reflect the expected records.',
    ],
  },
  {
    id: 'production-cron',
    title: 'Prepare the production cron runner',
    description:
      'Scheduled automation is what keeps Notion edits and Eco-Loom follow-up tasks moving without a manual trigger.',
    bullets: [
      'Save the scheduled-runner secret on the production deployment.',
      'Deploy the latest project settings before launch.',
      'Remember that Hobby is daily-only; faster schedules require Pro.',
    ],
  },
  {
    id: 'observability',
    title: 'Verify observability after launch',
    description:
      'A production-ready integration should leave a clear operational trail for admins to inspect.',
    bullets: [
      'Check Audit Center for Notion sync activity.',
      'Check Agent Runs for queued, completed, or failed follow-up work.',
      'Use System Status to confirm the Notion workspace and automation queue stay healthy.',
    ],
  },
] as const;

export const NOTION_OPERATIONS_PLAYBOOKS = [
  {
    id: 'cron-auth-playbook',
    title: 'Cron authorization failure',
    whenToUse:
      'Use this when Vercel reports an unauthorized cron request or the scheduled runner never appears to start.',
    steps: [
      'Confirm the scheduled-runner secret exists on the Vercel production project.',
      'Redeploy after adding or changing that secret.',
      'Retry the production cron after the redeploy completes.',
    ],
  },
  {
    id: 'idle-queue-playbook',
    title: 'Automation queue stays idle',
    whenToUse:
      'Use this when Agent Runs is empty or Automation Queue shows idle even though the integration is configured.',
    steps: [
      'Confirm Auto Sync is enabled in the Notion MCP screen.',
      'Check that the production cron has actually run at least once.',
      'Make a fresh change in a mapped Notion database, then inspect Agent Runs again.',
    ],
  },
  {
    id: 'mapping-playbook',
    title: 'A field or page does not map correctly',
    whenToUse:
      'Use this when records sync but specific properties such as Source Type, facility names, or report periods do not land as expected.',
    steps: [
      'Verify the Notion field names match the mapped Eco-Loom expectations.',
      'Check that the destination fields use compatible field types and option labels.',
      'Run a manual sync after correcting the destination layout so the current records can relink or update.',
    ],
  },
  {
    id: 'hobby-ops-playbook',
    title: 'Need more than daily sync on Hobby',
    whenToUse:
      'Use this when your workflow needs a tighter loop than the daily Hobby cron limit allows.',
    steps: [
      'Keep the default daily schedule so deployment succeeds.',
      'Use manual admin runs or a controlled Notion-side trigger for urgent follow-up work.',
      'Upgrade to Vercel Pro before changing to a higher-frequency schedule.',
    ],
  },
] as const;

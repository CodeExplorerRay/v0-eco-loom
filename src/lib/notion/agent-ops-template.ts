export const AGENT_OPS_DATABASE_TEMPLATE = `Agent Ops database properties

1. Title
Type: Title
Purpose: short run or follow-up title

2. Workflow
Type: Select
Options:
- Review Needed
- In Progress
- Ready for Eco-Loom
- Blocked
- Complete

3. Source Database
Type: Select
Options:
- Carbon Ledger
- Sustainability Goals
- Reports
- Departments
- Agent Ops

4. Record ID
Type: Rich text
Purpose: Eco-Loom or Notion page reference

5. Record Link
Type: URL
Purpose: direct Notion page link

6. Change Type
Type: Multi-select
Options:
- Created
- Updated
- Missing Fields
- Duplicate Risk
- Needs Verification
- At Risk
- Monthly Review
- Sync Follow-up

7. Severity
Type: Select
Options:
- Low
- Medium
- High
- Critical

8. Owner
Type: Person
Purpose: human reviewer responsible for follow-up

9. Recommended Action
Type: Rich text
Purpose: the next best action for the human operator

10. Agent Summary
Type: Rich text
Purpose: concise explanation from the Notion custom agent

11. Review Due
Type: Date
Purpose: follow-up deadline

12. Last Agent Run
Type: Date
Purpose: last time the agent updated this entry

Suggested default views

1. Needs Review
Filter: Workflow is Review Needed

2. Verification Queue
Filter: Change Type contains Needs Verification

3. Duplicate Risks
Filter: Change Type contains Duplicate Risk

4. Monthly Review
Filter: Change Type contains Monthly Review

5. Blocked
Filter: Workflow is Blocked
`;

export const AGENT_OPS_PAGE_TEMPLATE = `# Agent Ops

## Purpose
Use this area for the Eco-Loom Sustainability Ops Agent to record summaries, follow-up actions, and review queues generated from Notion database activity.

## Standard Sections

### Recent Workspace Changes
- What changed
- What needs review
- Recommended next actions

### Verification Queue
- Carbon Ledger records that still need human verification
- Missing required fields
- Possible anomalies
- Possible duplicate records

### Goal Risk Review
- Goals at risk
- Goals missing target context
- Recommended owner actions

### Monthly Report Readiness
- Reporting period
- Missing ledger inputs
- Draft reports created in Eco-Loom
- Publish blockers

## Operating Rules
- The agent may summarize and flag data issues.
- The agent must not silently delete records.
- The agent must not verify ledger entries automatically.
- The agent must not publish reports automatically.
- The agent must not invent emissions values or compliance claims.
- If unsure, label the item as needs human review.
- The agent must not expose secrets, API keys, database IDs, or internal tokens.
- The agent must not claim data is synced to Eco-Loom unless the workspace explicitly confirms it.
- Humans remain responsible for approval decisions.
`;

export const CUSTOM_AGENT_INSTRUCTIONS_TEMPLATE = `# Eco-Loom Sustainability Ops Agent Instructions

You are the Eco-Loom Sustainability Ops Agent for this workspace.

Your job is to keep sustainability records clean, complete, consistent, and ready for Eco-Loom review workflows.

Work only across these approved Notion surfaces:
- 🌍 Carbon Ledger
- 🎯 Sustainability Goals
- 📊 Reports
- 🏢 Departments
- 🤖 Agent Ops Home
- 🤖 Agent Ops

Naming note:
- In Eco-Loom, the product experience refers to facilities and sites.
- In the current Notion workspace, that same dataset is stored in the database named 🏢 Departments.
- Treat 🏢 Departments as the facilities / sites register.

## Core responsibilities
- Review newly created or recently edited records in the approved databases above.
- Detect missing or suspicious fields.
- Summarize recent changes for operators.
- Create lightweight follow-up notes or task items when data is incomplete.
- Help human operators prepare records for Eco-Loom processing.

## Hard rules
- Never silently delete records.
- Never verify Carbon Ledger entries.
- Never publish Reports.
- Never overwrite finalized human decisions unless explicitly instructed.
- Do not invent emissions values or compliance claims.
- If unsure, label the item as needs human review.
- Do not claim data is synced to Eco-Loom unless the workspace explicitly confirms it.
- Do not expose secrets, API keys, database IDs, or internal tokens.
- Stay within the approved databases and pages listed above.

## Agent Ops write rules
When creating or updating items in 🤖 Agent Ops, use the existing schema exactly.

Use these Source Database values only:
- Carbon Ledger
- Sustainability Goals
- Reports
- Departments
- Agent Ops

Use these Workflow values only:
- Review Needed
- In Progress
- Ready for Eco-Loom
- Blocked
- Complete

Use these Change Type values only:
- Created
- Updated
- Missing Fields
- Duplicate Risk
- Needs Verification
- At Risk
- Monthly Review
- Sync Follow-up

If an issue does not map cleanly to one of those Change Type values, do not invent a new option.
Instead:
- choose the closest valid Change Type
- explain the nuance in Agent Summary
- put the next concrete operator step in Recommended Action

## Carbon Ledger review rules
For each record in 🌍 Carbon Ledger, check that these fields are present and plausible:
- Source Type
- Category
- Activity Value
- Activity Unit
- CO2 Equivalent
- Transaction Date
- Department when applicable

Flag issues:
- Missing required fields
- Possible duplicates
- Inconsistencies across unit, value, and CO2e
- Unusual values that need human review

When fields are missing or inconsistent, create a concise follow-up that states exactly what needs to be fixed.

## Sustainability Goals review rules
For each record in 🎯 Sustainability Goals, check that these fields are present and coherent:
- Title
- Type
- Status
- Progress
- Target Value
- Target Unit
- Target Year

Flag issues:
- Missing target definition
- Missing status context
- Stalled or at-risk goals

Suggest operational follow-up actions, but do not mark goals achieved unless the data clearly supports it.

## Reports review rules
For each record in 📊 Reports, check that these fields are present:
- Title
- Type
- Period
- Status
- Total Emissions when appropriate

Flag issues:
- Duplicates for the same period and type

Draft summaries when asked. Do not publish automatically.

## Facilities / sites review rules
For each record in the facilities / sites register (stored in Notion as 🏢 Departments), check that:
- Name is present and clear
- Code is present

Flag issues:
- Duplicate names or codes
- Inconsistent naming conventions
- Missing location context when the record is supposed to represent a real facility or site

## Output formats
### When asked for a summary
1. What changed
2. What needs review
3. Recommended next actions

### When asked to review recent Carbon Ledger activity
1. Clean entries
2. Entries needing fixes
3. Entries needing human verification
4. Potential duplicates or anomalies

### When asked to prepare a monthly review
1. Key ledger updates
2. Goal risks
3. Missing report inputs
4. Recommended operator actions

## Quality bar
- Write as an operations reviewer, not as a marketer.
- Keep recommendations actionable and specific.
- Prefer “needs human review” over false certainty.
- Keep every output grounded in the actual Notion records available in the approved workspace surfaces.
`;

export const CRON_SETUP_INSTRUCTIONS = `Scheduled runner setup

1. On Vercel, add this environment variable:
CRON_SECRET=your-long-random-secret

2. Optional: tune the batch size without changing the cron path:
AGENT_TASKS_CRON_LIMIT=25

3. Deploy with vercel.json included.

4. The production runner calls:
/api/cron/agent-tasks
once per day at 02:00 UTC by default so the repo deploys cleanly on Vercel Hobby.

5. When Notion MCP is configured and Auto Sync is enabled, each cron run:
- imports recent changes from the mapped Notion databases
- queues Eco-Loom follow-up tasks for ledger, goals, and reports
- drains the pending automation queue in the same run

6. If you upgrade to Vercel Pro, you can increase the schedule frequency in vercel.json for a tighter Notion-to-Eco-Loom loop.

7. If Auto Sync is disabled, the same cron route still drains already queued agent tasks, but it will not pull fresh changes from Notion.

8. If you use another platform or a Notion custom agent to call the same endpoint, send either:
Authorization: Bearer <CRON_SECRET>
or
x-cron-secret: <CRON_SECRET>

9. Keep /api/agent-tasks/run for manual admin-triggered runs inside Eco-Loom.

10. Vercel Cron Jobs only run on the production deployment, so preview deployments will not trigger this route automatically.
`;

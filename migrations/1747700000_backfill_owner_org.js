/// <reference path="../functions/types.d.ts" />
// Backfill workspaces.owner_org for rows created before owner_org was
// populated at creation (pkg/account ensureWorkspace).
//
// WHY THIS MATTERS: owner_org is the ONE tenant field every downstream surface
// reads (pkg/wsauth.WorkspaceOrg → chat scoping, /v1/bots sync, Slack KMS
// token path). There is deliberately NO fallback to the legacy `owner` field:
// `owner` holds the creating account's IAM sub (a UUID), NOT an org slug, so a
// row with owner_org="" is refused by mapChannel and skipped by bots-sync
// (bots-sync would otherwise derive an empty org and mass-remove every bot).
//
// THE VALUE: the deployment's IAM org (IAM_ORG env, default "hanzo"). This
// binary is single-tenant per deployment — every login is that org, and the
// forward path sets owner_org to exactly the caller's IAM org. Reading it from
// env keeps the migration correct per deployment instead of hardcoding a brand.
//
// IDEMPOTENT: only touches rows where owner_org is empty/NULL. Re-running is a
// no-op. Append-only: no down step (never blank an owner_org we filled).

migrate((app) => {
  const org = ($os.getenv("IAM_ORG") || "hanzo").trim();
  if (!org) {
    throw new Error("backfill_owner_org: IAM_ORG resolved empty; refusing to backfill an empty tenant");
  }

  // Count first so the log carries the exact number filled (verify, not assume).
  // `.one(model)` binds a single row into the DynamicModel — the canonical jsvm
  // read idiom (see hanzo/base plugins/jsvm binds_test.go).
  const stat = new DynamicModel({ n: 0 });
  app.db()
    .newQuery("SELECT count(*) AS n FROM workspaces WHERE owner_org = '' OR owner_org IS NULL")
    .one(stat);
  const missing = Number(stat.n) || 0;

  if (missing === 0) {
    app.logger().info("backfill_owner_org: no rows missing owner_org; nothing to do", "org", org);
    return;
  }

  app.db()
    .newQuery("UPDATE workspaces SET owner_org = {:org} WHERE owner_org = '' OR owner_org IS NULL")
    .bind({ org })
    .execute();

  app.logger().info("backfill_owner_org: filled owner_org", "org", org, "rows", missing);
}, (app) => {
  // No down: owner_org is the canonical tenant; a down that blanks it would
  // re-break scoping. The forward path owns it from here.
});

/// <reference path="../functions/types.d.ts" />
// Account-model fields for the front login + workspace-selection protocol.
//
// The front SPA's account API speaks in UUIDs: a per-workspace token
// carries {account, workspace} as UUIDs (foundations/core/packages/token),
// and the transactor refuses a token missing either. Identity (the account
// UUID) is the IAM user id (the JWT `sub`, a Casdoor UUID) — so no accounts
// table is needed; membership already lives in `members` (user_id = sub).
//
// Workspaces, however, were created (1747260000) keyed by Base's 15-char
// record id + a `slug`. The protocol needs a real workspace UUID (the token
// claim) distinct from the human `url` (= slug). We add it append-only, plus
// the `region`/`data_id` the WorkspaceLoginInfo response carries.

migrate((app) => {
  const workspaces = app.findCollectionByNameOrId("workspaces");
  if (!workspaces) {
    throw new Error("expected workspaces collection from 1747260000 init migration");
  }

  // uuid — the WorkspaceUuid claim. Real UUID, unique, set on create by the
  // account layer (core.NewRecord + uuid). Distinct from the 15-char record id.
  if (!workspaces.fields.getByName("uuid")) {
    workspaces.fields.add(new Field({ name: "uuid", type: "text", required: false }));
    workspaces.indexes.push("CREATE UNIQUE INDEX idx_workspaces_uuid ON workspaces (uuid)");
  }
  // region — the transactor region selector (empty = the single default region).
  if (!workspaces.fields.getByName("region")) {
    workspaces.fields.add(new Field({ name: "region", type: "text" }));
  }
  // data_id — legacy WorkspaceDataId (storage bucket / db name). Optional.
  if (!workspaces.fields.getByName("data_id")) {
    workspaces.fields.add(new Field({ name: "data_id", type: "text" }));
  }

  app.save(workspaces);
});

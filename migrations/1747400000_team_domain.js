/// <reference path="../functions/types.d.ts" />
// Team domain collections — members / channels / messages / issues /
// documents — plus an in-place upgrade of the workspaces collection
// (added by 1747260000_init_collections.js).
//
// Why two migrations: the first one was applied to prod weeks ago and
// migrations are append-only. We extend workspaces here instead of
// rewriting history.
//
// IAM is the source of truth for identity: every *_id text field
// holds the IAM user id (sub claim) or the IAM org slug (owner claim).
// We don't join — IAM has its own DB.
//
// Membership predicate (gates every per-workspace collection): a row
// is readable iff a members row links the requesting user to the row's
// workspace. Filter syntax uses the back-relation form
// `members_via_workspace_id`.

migrate((app) => {
  const workspaces = app.findCollectionByNameOrId("workspaces");
  if (!workspaces) {
    throw new Error("expected workspaces collection from 1747260000 init migration");
  }

  // Extend workspaces with owner_org + plan (Commerce mirror), keeping
  // the existing `owner` field as a backstop for older rows.
  if (!workspaces.fields.getByName("owner_org")) {
    workspaces.fields.add(new Field({
      name:     "owner_org",
      type:     "text",
      required: false,
    }));
  }
  if (!workspaces.fields.getByName("plan")) {
    workspaces.fields.add(new Field({ name: "plan", type: "text" }));
  }
  app.save(workspaces);

  // ---- members ----
  // Composite unique on (workspace_id, user_id) — no double rows.
  // Owner role gates workspace mutation rules elsewhere.
  const members = new Collection({
    type: "base",
    name: "members",
    listRule:   "user_id = @request.auth.id || workspace_id.members_via_workspace_id.user_id ?= @request.auth.id",
    viewRule:   "user_id = @request.auth.id || workspace_id.members_via_workspace_id.user_id ?= @request.auth.id",
    createRule: "@request.auth.id != ''",
    updateRule: "workspace_id.members_via_workspace_id.user_id ?= @request.auth.id && workspace_id.members_via_workspace_id.role ?= 'owner'",
    deleteRule: "workspace_id.members_via_workspace_id.user_id ?= @request.auth.id && workspace_id.members_via_workspace_id.role ?= 'owner'",
    fields: [
      { name: "workspace_id", type: "relation", required: true, collectionId: workspaces.id, cascadeDelete: true },
      { name: "user_id",      type: "text",     required: true },
      { name: "role",         type: "select",   values: ["owner","admin","member","guest"], maxSelect: 1, required: true },
      { name: "joined_at",    type: "autodate", onCreate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_members_workspace_user ON members (workspace_id, user_id)",
      "CREATE INDEX        idx_members_user           ON members (user_id)",
    ],
  });
  app.save(members);

  // Reusable membership predicate. Every per-workspace collection
  // below pivots through members to gate reads.
  const memberRule = "workspace_id.members_via_workspace_id.user_id ?= @request.auth.id";

  // ---- channels ----
  const channels = new Collection({
    type: "base",
    name: "channels",
    listRule:   memberRule,
    viewRule:   memberRule,
    createRule: memberRule,
    updateRule: memberRule,
    deleteRule: memberRule,
    fields: [
      { name: "workspace_id", type: "relation", required: true, collectionId: workspaces.id, cascadeDelete: true },
      { name: "name",         type: "text",     required: true },
      { name: "topic",        type: "text" },
      { name: "kind",         type: "select",   values: ["public","private","dm"], maxSelect: 1, required: true },
      { name: "created_by",   type: "text",     required: true },
      { name: "created_at",   type: "autodate", onCreate: true },
      { name: "updated_at",   type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE INDEX idx_channels_workspace ON channels (workspace_id)",
      "CREATE UNIQUE INDEX idx_channels_workspace_name ON channels (workspace_id, name)",
    ],
  });
  app.save(channels);

  // ---- messages ----
  // Hot collection. Index is (channel_id, created_at) — the read path
  // is always "the last N messages in this channel" and that composite
  // covers it without a sort step.
  const channelMemberRule = "channel_id.workspace_id.members_via_workspace_id.user_id ?= @request.auth.id";
  const messages = new Collection({
    type: "base",
    name: "messages",
    listRule:   channelMemberRule,
    viewRule:   channelMemberRule,
    createRule: channelMemberRule,
    updateRule: channelMemberRule + " && author_id = @request.auth.id",
    deleteRule: channelMemberRule + " && author_id = @request.auth.id",
    fields: [
      { name: "channel_id",  type: "relation", required: true, collectionId: channels.id, cascadeDelete: true },
      { name: "author_id",   type: "text",     required: true },
      { name: "body",        type: "editor",   required: true },
      { name: "attachments", type: "file",     maxSelect: 10 },
      { name: "created_at",  type: "autodate", onCreate: true },
      { name: "updated_at",  type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE INDEX idx_messages_channel_created ON messages (channel_id, created_at)",
    ],
  });
  app.save(messages);

  // Threading via parent_id — has to be a second pass because the
  // self-relation collectionId is the row we just created.
  messages.fields.add(new Field({
    name:         "parent_id",
    type:         "relation",
    maxSelect:    1,
    collectionId: messages.id,
    cascadeDelete: false,
  }));
  app.save(messages);
  // Index the parent column for the thread-fetch query.
  app.db().newQuery("CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages (parent_id)").execute();

  // ---- issues ----
  // number is per-workspace autoincrement. A hook in
  // functions/issue_number.fn.ts assigns it on create. The unique
  // index here enforces the contract even if the hook regresses.
  const issues = new Collection({
    type: "base",
    name: "issues",
    listRule:   memberRule,
    viewRule:   memberRule,
    createRule: memberRule,
    updateRule: memberRule,
    deleteRule: memberRule,
    fields: [
      { name: "workspace_id", type: "relation", required: true, collectionId: workspaces.id, cascadeDelete: true },
      { name: "project",      type: "text",     required: true },
      { name: "number",       type: "number",   required: true },
      { name: "title",        type: "text",     required: true },
      { name: "body",         type: "editor" },
      { name: "assignee_id",  type: "text" },
      { name: "status",       type: "select", values: ["backlog","todo","in_progress","review","done","cancelled"], maxSelect: 1, required: true },
      { name: "priority",     type: "select", values: ["low","medium","high","urgent"], maxSelect: 1 },
      { name: "labels",       type: "select", values: ["bug","feat","docs","chore","security"], maxSelect: 8 },
      { name: "due_at",       type: "date" },
      { name: "created_at",   type: "autodate", onCreate: true },
      { name: "updated_at",   type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE INDEX idx_issues_workspace ON issues (workspace_id)",
      "CREATE UNIQUE INDEX idx_issues_workspace_number ON issues (workspace_id, number)",
      "CREATE INDEX idx_issues_assignee  ON issues (assignee_id)",
      "CREATE INDEX idx_issues_status    ON issues (status)",
    ],
  });
  app.save(issues);

  // ---- documents ----
  // body is the CRDT-bound long-text field — the editor JSON-doc gets
  // written on every server-side autosave. The CRDT itself lives
  // client-side; this is the durable snapshot.
  const documents = new Collection({
    type: "base",
    name: "documents",
    listRule:   memberRule,
    viewRule:   memberRule,
    createRule: memberRule,
    updateRule: memberRule,
    deleteRule: memberRule,
    fields: [
      { name: "workspace_id", type: "relation", required: true, collectionId: workspaces.id, cascadeDelete: true },
      { name: "title",        type: "text",     required: true },
      { name: "body",         type: "editor" },
      { name: "author_id",    type: "text",     required: true },
      { name: "created_at",   type: "autodate", onCreate: true },
      { name: "updated_at",   type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE INDEX idx_documents_workspace ON documents (workspace_id)",
    ],
  });
  app.save(documents);
}, (app) => {
  // down: reverse-order drop so foreign keys unwind cleanly. We don't
  // touch workspaces here — that belongs to 1747260000.
  ["documents","issues","messages","channels","members"].forEach((name) => {
    const c = app.findCollectionByNameOrId(name);
    if (c) app.delete(c);
  });
});

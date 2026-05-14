/// <reference path="../functions/types.d.ts" />
// Initial collections for hanzo team. Run on first boot.
//
// Workspaces: top-level containers. One per team.
// Projects:   live inside a workspace.
// Tasks:      live inside a project.
//
// All auth/membership is delegated to Hanzo IAM (workspace.owner == IAM org).

migrate((app) => {
  const workspaces = new Collection({
    type: "base",
    name: "workspaces",
    fields: [
      { name: "slug",      type: "text",   required: true, unique: true },
      { name: "name",      type: "text",   required: true },
      { name: "owner",     type: "text",   required: true }, // IAM org slug
      { name: "created",   type: "autodate", onCreate: true },
      { name: "updated",   type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE INDEX idx_workspaces_owner ON workspaces (owner)",
    ],
  });
  app.save(workspaces);

  const projects = new Collection({
    type: "base",
    name: "projects",
    fields: [
      { name: "workspace", type: "relation", required: true, collectionId: workspaces.id, cascadeDelete: true },
      { name: "key",       type: "text",     required: true }, // short like "PROJ"
      { name: "name",      type: "text",     required: true },
      { name: "lead",      type: "text" },                     // IAM user id
      { name: "created",   type: "autodate", onCreate: true },
      { name: "updated",   type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_projects_workspace_key ON projects (workspace, key)",
    ],
  });
  app.save(projects);

  const tasks = new Collection({
    type: "base",
    name: "tasks",
    fields: [
      { name: "project",     type: "relation", required: true, collectionId: projects.id, cascadeDelete: true },
      { name: "number",      type: "number",   required: true }, // PROJ-123
      { name: "title",       type: "text",     required: true },
      { name: "description", type: "editor" },
      { name: "status",      type: "select", values: ["backlog","todo","in_progress","review","done","cancelled"], maxSelect: 1 },
      { name: "priority",    type: "select", values: ["low","medium","high","urgent"],                              maxSelect: 1 },
      { name: "assignee",    type: "text" },                      // IAM user id
      { name: "reporter",    type: "text" },                      // IAM user id
      { name: "due",         type: "date" },
      { name: "created",     type: "autodate", onCreate: true },
      { name: "updated",     type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_tasks_project_number ON tasks (project, number)",
      "CREATE INDEX        idx_tasks_assignee       ON tasks (assignee)",
      "CREATE INDEX        idx_tasks_status         ON tasks (status)",
    ],
  });
  app.save(tasks);
}, (app) => {
  // down: dropped in reverse order
  ["tasks", "projects", "workspaces"].forEach((name) => {
    const c = app.findCollectionByNameOrId(name);
    if (c) app.delete(c);
  });
});

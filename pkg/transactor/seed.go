package transactor

import "time"

// System identity used as modifiedBy/createdBy for seeded + trigger docs.
const acctSystem = "core:account:System"

// Space ids the real platform bootstrap creates via migration (NOT in the model).
// They must exist so findOne(core.class.Space,{_id}) and space-scoped queries
// resolve. Seeded once per workspace on first connect.
func systemSpaces() []map[string]any {
	now := time.Now().UnixMilli()
	base := func(id, class, name string, extra map[string]any) map[string]any {
		d := map[string]any{
			"_id": id, "_class": class, "space": "core:space:Space",
			"name": name, "description": "", "private": false,
			"archived": false, "members": []any{},
			"modifiedBy": acctSystem, "modifiedOn": now,
			"createdBy": acctSystem, "createdOn": now,
		}
		for k, v := range extra {
			d[k] = v
		}
		return d
	}
	return []map[string]any{
		base("core:space:Space", "core:class:TypedSpace", "Spaces", map[string]any{"type": "core:spaceType:SpacesType"}),
		base("core:space:Tx", "core:class:SystemSpace", "Space for all txes", nil),
		base("core:space:DerivedTx", "core:class:SystemSpace", "Space for derived txes", nil),
		base("core:space:Model", "core:class:SystemSpace", "Space for model", nil),
		base("core:space:Configuration", "core:class:SystemSpace", "Space for config", nil),
		base("core:space:Workspace", "core:class:SystemSpace", "Space for common things", nil),
		base("contact:space:Contacts", "core:class:SystemSpace", "Contacts", nil),
	}
}

// seedWorkspace writes the system spaces into a brand-new workspace exactly once
// (count==0). Idempotent: put is an upsert keyed by _id.
func (s *session) seedWorkspace() {
	n, err := s.store.count(s.org, s.workspace)
	if err != nil || n > 0 {
		return
	}
	for _, sp := range systemSpaces() {
		_ = s.store.put(s.org, s.workspace, sp)
	}
}

// trigger emulates the server-side reactions the real transactor runs on certain
// writes. Today: OnEmployeeCreate -> a per-person PersonSpace, which is what the
// workbench's findOne(PersonSpace,{person}) needs after login (without it the
// console logs "Failed to find space for employee").
func (s *session) trigger(doc map[string]any) {
	if sub, ok := doc["contact:mixin:Employee"].(map[string]any); ok {
		if active, _ := sub["active"].(bool); active {
			s.ensurePersonSpace(str(doc["_id"]))
		}
	}
}

// ensurePersonSpace creates the PersonSpace for a person if absent. The _id is
// derived from the person ref so repeated Employee txes converge (upsert).
func (s *session) ensurePersonSpace(person string) {
	if person == "" {
		return
	}
	id := "person-space:" + person
	if existing, _ := s.store.get(s.org, s.workspace, id); existing != nil {
		return
	}
	now := time.Now().UnixMilli()
	_ = s.store.put(s.org, s.workspace, map[string]any{
		"_id": id, "_class": "contact:class:PersonSpace", "space": "core:space:Space",
		"name": "Personal space", "description": "", "private": true, "archived": false,
		"person": person, "members": []any{s.account},
		"modifiedBy": acctSystem, "modifiedOn": now,
		"createdBy": acctSystem, "createdOn": now,
	})
}

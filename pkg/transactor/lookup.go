package transactor

// `lookup` support for findAll. The SPA joins related docs in a single
// query via the FindOptions.lookup shape, and populates client-side stores from
// the joined `$lookup`. The employees query is the load-bearing case:
//
//	findAll(contact:mixin:Employee, {}, { lookup: { _id: { socialIds: contact:class:SocialIdentity } } })
//
// Without the joined `$lookup.socialIds`, the SPA's socialId→employee maps stay
// empty, so member names/avatars that resolve through a PersonId never paint —
// the workbench shows blank Employee rows even though the Person docs carry a
// name. We honor both join directions:
//
//   - forward  `{ field: TargetClass }` — resolve doc[field] (a ref) to one doc,
//     attached as $lookup[field].
//   - reverse  `{ _id: { key: ChildClass } }` or `{ _id: { key: [ChildClass, field] } }`
//     — every ChildClass doc whose `field` (default "attachedTo") equals doc._id,
//     attached as an array $lookup[key].
//
// The original stored docs are never mutated; each result is a shallow copy with
// a `$lookup` object added.
func (s *session) applyLookups(docs []map[string]any, lookup map[string]any) []map[string]any {
	if len(lookup) == 0 || len(docs) == 0 {
		return docs
	}
	out := make([]map[string]any, len(docs))
	for i, d := range docs {
		cp := make(map[string]any, len(d)+1)
		for k, v := range d {
			cp[k] = v
		}
		joined := map[string]any{}
		for field, spec := range lookup {
			if field == "_id" {
				rev, ok := spec.(map[string]any)
				if !ok {
					continue
				}
				for key, cs := range rev {
					childClass, childField := parseReverseSpec(cs)
					if childClass != "" {
						joined[key] = s.reverseLookup(childClass, childField, toStr(d["_id"]))
					}
				}
				continue
			}
			// Forward: spec is the target class (unused — resolution is by _id);
			// doc[field] holds the referenced doc's _id.
			if ref := toStr(d[field]); ref != "" {
				if td, _ := s.store.get(s.org, s.workspace, ref); td != nil {
					joined[field] = td
				}
			}
		}
		if len(joined) > 0 {
			cp["$lookup"] = joined
		}
		out[i] = cp
	}
	return out
}

// reverseLookup returns every doc of childClass (or a descendant) whose childField
// points back at parentID — the children of a reverse (`_id`) join.
func (s *session) reverseLookup(childClass, childField, parentID string) []map[string]any {
	if parentID == "" {
		return []map[string]any{}
	}
	docs, err := s.store.byClasses(s.org, s.workspace, s.hier.candidates(childClass))
	if err != nil {
		return []map[string]any{}
	}
	res := []map[string]any{}
	for _, d := range docs {
		if toStr(d[childField]) == parentID {
			res = append(res, d)
		}
	}
	return res
}

// parseReverseSpec reads a reverse-join child spec: a bare class string (child
// field defaults to "attachedTo") or a [class, field] pair.
func parseReverseSpec(spec any) (class, field string) {
	field = "attachedTo"
	switch v := spec.(type) {
	case string:
		return v, field
	case []any:
		if len(v) > 0 {
			class, _ = v[0].(string)
		}
		if len(v) > 1 {
			if f, ok := v[1].(string); ok {
				field = f
			}
		}
	}
	return class, field
}

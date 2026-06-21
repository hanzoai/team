package transactor

import (
	"encoding/json"
	"strings"
)

// Tx class ids.
const (
	clTxUpdate      = "core:class:TxUpdateDoc"
	clTxRemove      = "core:class:TxRemoveDoc"
	clTxMixin       = "core:class:TxMixin"
	clTxApplyIf     = "core:class:TxApplyIf"
	clTxCollection  = "core:class:TxCollectionCUD"
)

// applyTx applies one a platform Tx to the workspace store and returns (txResult,
// appliedTxes). appliedTxes is the flat list of CUD txes that actually landed —
// the transactor broadcasts them so live queries refresh.
func (s *session) applyTx(raw json.RawMessage) (any, []json.RawMessage) {
	var t map[string]any
	if err := json.Unmarshal(raw, &t); err != nil {
		return map[string]any{}, nil
	}
	switch str(t["_class"]) {
	case clTxCreate:
		s.txCreate(t)
		return map[string]any{}, []json.RawMessage{raw}
	case clTxUpdate:
		obj := s.txUpdate(t)
		if b, _ := t["retrieve"].(bool); b && obj != nil {
			return map[string]any{"object": obj}, []json.RawMessage{raw}
		}
		return map[string]any{}, []json.RawMessage{raw}
	case clTxRemove:
		_ = s.store.del(s.workspace, str(t["objectId"]))
		return map[string]any{}, []json.RawMessage{raw}
	case clTxMixin:
		s.txMixin(t)
		return map[string]any{}, []json.RawMessage{raw}
	case clTxCollection:
		// Older shape: a wrapper carrying an inner tx + collection context.
		if inner, ok := t["tx"].(map[string]any); ok {
			inner["attachedTo"] = t["objectId"]
			inner["attachedToClass"] = t["objectClass"]
			inner["collection"] = t["collection"]
			ib, _ := json.Marshal(inner)
			return s.applyTx(ib)
		}
		return map[string]any{}, nil
	case clTxApplyIf:
		return s.txApplyIf(t)
	default:
		return map[string]any{}, nil
	}
}

// txCreate ports createDoc2Doc: build the stored Doc from the create tx.
func (s *session) txCreate(t map[string]any) {
	doc := map[string]any{}
	if a, ok := t["attributes"].(map[string]any); ok {
		for k, v := range a {
			doc[k] = v
		}
	}
	if at := str(t["attachedTo"]); at != "" {
		doc["attachedTo"] = t["attachedTo"]
		doc["attachedToClass"] = t["attachedToClass"]
		doc["collection"] = t["collection"]
	}
	doc["_id"] = t["objectId"]
	doc["_class"] = t["objectClass"]
	doc["space"] = t["objectSpace"]
	doc["modifiedBy"] = t["modifiedBy"]
	doc["modifiedOn"] = t["modifiedOn"]
	doc["createdBy"] = firstNonNil(t["createdBy"], t["modifiedBy"])
	doc["createdOn"] = firstNonNil(t["createdOn"], t["modifiedOn"])
	_ = s.store.put(s.workspace, doc)
	s.trigger(doc) // emulate server triggers (PersonSpace, etc.)
}

// txUpdate ports updateDoc2Doc/applyUpdate.
func (s *session) txUpdate(t map[string]any) map[string]any {
	doc, _ := s.store.get(s.workspace, str(t["objectId"]))
	if doc == nil {
		return nil
	}
	if ops, ok := t["operations"].(map[string]any); ok {
		applyOps(doc, ops)
	}
	doc["modifiedBy"] = t["modifiedBy"]
	doc["modifiedOn"] = t["modifiedOn"]
	_ = s.store.put(s.workspace, doc)
	return doc
}

// txMixin ports updateMixin4Doc: mixin data lives under the mixin's class id key.
func (s *session) txMixin(t map[string]any) {
	doc, _ := s.store.get(s.workspace, str(t["objectId"]))
	if doc == nil {
		return
	}
	mixin := str(t["mixin"])
	if mixin == "" {
		return
	}
	sub, _ := doc[mixin].(map[string]any)
	if sub == nil {
		sub = map[string]any{}
	}
	if attrs, ok := t["attributes"].(map[string]any); ok {
		applyOps(sub, attrs)
	}
	doc[mixin] = sub
	doc["modifiedBy"] = t["modifiedBy"]
	doc["modifiedOn"] = t["modifiedOn"]
	_ = s.store.put(s.workspace, doc)
	s.trigger(doc)
}

// txApplyIf evaluates match/notMatch then applies txes atomically.
func (s *session) txApplyIf(t map[string]any) (any, []json.RawMessage) {
	if !s.condsPass(t["match"], true) || !s.condsPass(t["notMatch"], false) {
		return map[string]any{"success": false}, nil
	}
	var applied []json.RawMessage
	if txes, ok := t["txes"].([]any); ok {
		for _, inner := range txes {
			ib, _ := json.Marshal(inner)
			_, a := s.applyTx(ib)
			applied = append(applied, a...)
		}
	}
	return map[string]any{"success": true}, applied
}

// condsPass checks each {_class, query} condition. wantMatch=true requires ≥1
// match; false requires 0.
func (s *session) condsPass(raw any, wantMatch bool) bool {
	conds, ok := raw.([]any)
	if !ok {
		return true
	}
	for _, c := range conds {
		cm, ok := c.(map[string]any)
		if !ok {
			continue
		}
		class := str(cm["_class"])
		query, _ := cm["query"].(map[string]any)
		found := len(s.queryDocs(class, query)) > 0
		if found != wantMatch {
			return false
		}
	}
	return true
}

// applyOps applies a set of update operations (mutates m in place). Bare keys
// are dot-path sets; $-keys are operators.
func applyOps(m map[string]any, ops map[string]any) {
	for k, v := range ops {
		if strings.HasPrefix(k, "$") {
			applyOperator(m, k, v)
		} else {
			setObjectValue(m, k, v)
		}
	}
}

func applyOperator(m map[string]any, op string, arg any) {
	fields, ok := arg.(map[string]any)
	if !ok {
		return
	}
	switch op {
	case "$push":
		for f, v := range fields {
			arr, _ := m[f].([]any)
			if mod, ok := v.(map[string]any); ok {
				if each, ok := mod["$each"].([]any); ok {
					arr = append(arr, each...)
					m[f] = arr
					continue
				}
			}
			m[f] = append(arr, v)
		}
	case "$pull":
		for f, v := range fields {
			arr, _ := m[f].([]any)
			out := arr[:0]
			for _, item := range arr {
				if !deepEqual(item, v) {
					out = append(out, item)
				}
			}
			m[f] = out
		}
	case "$unset":
		for f := range fields {
			delete(m, f)
		}
	case "$inc":
		for f, v := range fields {
			cur, _ := asFloat(m[f])
			add, _ := asFloat(v)
			m[f] = cur + add
		}
	case "$rename":
		for from, to := range fields {
			if ts, ok := to.(string); ok {
				if val, ok := m[from]; ok {
					m[ts] = val
					delete(m, from)
				}
			}
		}
	}
}

// setObjectValue sets a (possibly dotted) path on m, creating intermediate maps.
func setObjectValue(m map[string]any, path string, value any) {
	segs := strings.Split(path, ".")
	cur := m
	for i := 0; i < len(segs)-1; i++ {
		next, ok := cur[segs[i]].(map[string]any)
		if !ok {
			next = map[string]any{}
			cur[segs[i]] = next
		}
		cur = next
	}
	cur[segs[len(segs)-1]] = value
}

func str(v any) string {
	s, _ := v.(string)
	return s
}

func firstNonNil(vs ...any) any {
	for _, v := range vs {
		if v != nil {
			return v
		}
	}
	return nil
}

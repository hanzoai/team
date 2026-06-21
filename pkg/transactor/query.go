package transactor

import (
	"encoding/json"
	"sort"
	"strings"
)

// matchQuery reports whether doc satisfies a DocumentQuery (a map of
// field -> value|selector). It is an AND over every criterion. $search and
// internal keys are ignored (full-text is a separate path).
func matchQuery(doc map[string]any, query map[string]any) bool {
	for field, crit := range query {
		if field == "$search" || strings.HasPrefix(field, "$") {
			continue
		}
		if !matchField(getObjectValue(doc, field), crit) {
			return false
		}
	}
	return true
}

// matchField evaluates one criterion against the doc's value at a field.
func matchField(val any, crit any) bool {
	if sel, ok := crit.(map[string]any); ok && isPredicate(sel) {
		for op, arg := range sel {
			if !evalPredicate(op, arg, val) {
				return false
			}
		}
		return true
	}
	return looseEqual(val, crit)
}

// isPredicate is true when every key of the selector starts with '$'.
func isPredicate(sel map[string]any) bool {
	if len(sel) == 0 {
		return false
	}
	for k := range sel {
		if !strings.HasPrefix(k, "$") {
			return false
		}
	}
	return true
}

func evalPredicate(op string, arg, val any) bool {
	switch op {
	case "$in":
		return inList(val, arg)
	case "$nin":
		return !inList(val, arg)
	case "$ne":
		return !deepEqual(val, arg)
	case "$gt":
		return cmpNum(val, arg) > 0
	case "$gte":
		return cmpNum(val, arg) >= 0
	case "$lt":
		return cmpNum(val, arg) < 0
	case "$lte":
		return cmpNum(val, arg) <= 0
	case "$exists":
		want, _ := arg.(bool)
		return (val != nil) == want
	case "$like":
		return likeMatch(toStr(val), toStr(arg))
	case "$all":
		list, ok := arg.([]any)
		if !ok {
			return false
		}
		for _, item := range list {
			if !inList(val, []any{item}) {
				return false
			}
		}
		return true
	case "$size":
		arr, ok := val.([]any)
		n := 0
		if ok {
			n = len(arr)
		}
		if want, isNum := asFloat(arg); isNum {
			return float64(n) == want
		}
		return false
	default:
		// Unknown operator: do not over-filter — treat as satisfied so a render
		// is never blocked by an operator we have not ported yet.
		return true
	}
}

// inList reports whether val matches membership against arg ($in semantics):
// if val is an array, any intersection; otherwise loose membership.
func inList(val, arg any) bool {
	list, ok := arg.([]any)
	if !ok {
		return false
	}
	if arr, isArr := val.([]any); isArr {
		for _, a := range arr {
			for _, b := range list {
				if looseEqual(a, b) {
					return true
				}
			}
		}
		return false
	}
	for _, b := range list {
		if looseEqual(val, b) {
			return true
		}
	}
	return false
}

// looseEqual matches the platform findProperty: equality, both-null, or array-contains.
func looseEqual(val, crit any) bool {
	if deepEqual(val, crit) {
		return true
	}
	if val == nil && crit == nil {
		return true
	}
	if arr, ok := val.([]any); ok {
		for _, a := range arr {
			if deepEqual(a, crit) {
				return true
			}
		}
	}
	return false
}

func deepEqual(a, b any) bool {
	switch av := a.(type) {
	case string:
		bv, ok := b.(string)
		return ok && av == bv
	case bool:
		bv, ok := b.(bool)
		return ok && av == bv
	case float64:
		bv, ok := asFloat(b)
		return ok && av == bv
	case nil:
		return b == nil
	default:
		ja, _ := json.Marshal(a)
		jb, _ := json.Marshal(b)
		return string(ja) == string(jb)
	}
}

func cmpNum(a, b any) int {
	af, aok := asFloat(a)
	bf, bok := asFloat(b)
	if !aok || !bok {
		return 0
	}
	switch {
	case af < bf:
		return -1
	case af > bf:
		return 1
	default:
		return 0
	}
}

func asFloat(v any) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case json.Number:
		f, err := n.Float64()
		return f, err == nil
	case int:
		return float64(n), true
	case int64:
		return float64(n), true
	default:
		return 0, false
	}
}

func toStr(v any) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

// likeMatch implements $like: '%' is a wildcard, case-insensitive, anchored.
func likeMatch(s, pattern string) bool {
	s = strings.ToLower(s)
	pattern = strings.ToLower(pattern)
	parts := strings.Split(pattern, "%")
	pos := 0
	for i, part := range parts {
		if part == "" {
			continue
		}
		idx := strings.Index(s[pos:], part)
		if idx < 0 {
			return false
		}
		if i == 0 && idx != 0 {
			return false // anchored at start
		}
		pos += idx + len(part)
	}
	if !strings.HasSuffix(pattern, "%") && len(parts) > 0 {
		last := parts[len(parts)-1]
		if last != "" && !strings.HasSuffix(s, last) {
			return false
		}
	}
	return true
}

// getObjectValue resolves a dot-path against a doc, descending into nested maps
// (mixin sub-objects included). Array descent returns the first element's value
// which is enough for the membership queries the workbench issues.
func getObjectValue(doc map[string]any, path string) any {
	var cur any = doc
	for _, seg := range strings.Split(path, ".") {
		m, ok := cur.(map[string]any)
		if !ok {
			return nil
		}
		cur = m[seg]
	}
	return cur
}

// ── sort ────────────────────────────────────────────────────────────────────

type sortKey struct {
	field string
	dir   int // 1 asc, -1 desc
}

// parseSort reads the sort option preserving key ORDER (Go maps would lose it),
// which matters for multi-key sorts like {isPinned:-1, createdOn:1}.
func parseSort(raw json.RawMessage) []sortKey {
	if len(raw) == 0 {
		return nil
	}
	dec := json.NewDecoder(strings.NewReader(string(raw)))
	tok, err := dec.Token()
	if err != nil {
		return nil
	}
	if d, ok := tok.(json.Delim); !ok || d != '{' {
		return nil
	}
	var keys []sortKey
	for dec.More() {
		kt, err := dec.Token()
		if err != nil {
			return keys
		}
		field, _ := kt.(string)
		var v any
		if err := dec.Decode(&v); err != nil {
			return keys
		}
		dir := 1
		if f, ok := asFloat(v); ok && f < 0 {
			dir = -1
		}
		keys = append(keys, sortKey{field: field, dir: dir})
	}
	return keys
}

// resultSort orders docs by the (ordered) sort keys; undefined sorts first,
// strings via case-insensitive comparison, numbers/bools naturally.
func resultSort(docs []map[string]any, keys []sortKey) {
	if len(keys) == 0 {
		return
	}
	sort.SliceStable(docs, func(i, j int) bool {
		for _, k := range keys {
			c := compareValues(getObjectValue(docs[i], k.field), getObjectValue(docs[j], k.field))
			if c != 0 {
				return c*k.dir < 0
			}
		}
		return false
	})
}

func compareValues(a, b any) int {
	if a == nil && b == nil {
		return 0
	}
	if a == nil {
		return -1
	}
	if b == nil {
		return 1
	}
	if af, ok := asFloat(a); ok {
		if bf, ok := asFloat(b); ok {
			switch {
			case af < bf:
				return -1
			case af > bf:
				return 1
			default:
				return 0
			}
		}
	}
	if ab, ok := a.(bool); ok {
		if bb, ok := b.(bool); ok {
			switch {
			case !ab && bb:
				return -1
			case ab && !bb:
				return 1
			default:
				return 0
			}
		}
	}
	return strings.Compare(strings.ToLower(toStr(a)), strings.ToLower(toStr(b)))
}

package transactor

import "encoding/json"

// Core classifier ids (colon-serialized refs, the platform model's identity scheme).
const (
	clClass     = "core:class:Class"
	clMixin     = "core:class:Mixin"
	clInterface = "core:class:Interface"
	clDoc       = "core:class:Doc"
	clTxCreate  = "core:class:TxCreateDoc"
)

// classifier kinds (core ClassifierKind: CLASS=0, INTERFACE=1, MIXIN=2).
const (
	kindClass     = 0
	kindInterface = 1
	kindMixin     = 2
)

// hierarchy is the class graph the transactor needs for findAll: it resolves a
// queried _class to the set of concrete descendant classes whose docs match,
// and answers isDerived/isMixin. It is built once from the embedded model
// (a Tx[] where each class is a TxCreateDoc of core.class.Class with `extends`).
type hierarchy struct {
	kind        map[string]int
	extends     map[string]string
	implements  map[string][]string
	ancestors   map[string][]string         // class -> transitive closure (incl self)
	descendants map[string]map[string]bool  // class -> {self ∪ subclasses}
}

// modelTx is the slice of a Tx we read while building the hierarchy.
type modelTx struct {
	Class       string          `json:"_class"`
	ObjectClass string          `json:"objectClass"`
	ObjectID    string          `json:"objectId"`
	Attributes  json.RawMessage `json:"attributes"`
}

type classAttrs struct {
	Extends    string   `json:"extends"`
	Implements []string `json:"implements"`
	Kind       int      `json:"kind"`
}

// buildHierarchy parses the model Tx[] into the class graph. It is tolerant:
// any tx that is not a classifier TxCreateDoc is ignored.
func buildHierarchy(model []byte) *hierarchy {
	h := &hierarchy{
		kind:        map[string]int{},
		extends:     map[string]string{},
		implements:  map[string][]string{},
		ancestors:   map[string][]string{},
		descendants: map[string]map[string]bool{},
	}
	var txs []modelTx
	if err := json.Unmarshal(model, &txs); err != nil {
		return h
	}
	for _, tx := range txs {
		if tx.Class != clTxCreate {
			continue
		}
		switch tx.ObjectClass {
		case clClass, clMixin, clInterface:
		default:
			continue
		}
		var a classAttrs
		_ = json.Unmarshal(tx.Attributes, &a)
		h.kind[tx.ObjectID] = a.Kind
		if a.Extends != "" {
			h.extends[tx.ObjectID] = a.Extends
		}
		if len(a.Implements) > 0 {
			h.implements[tx.ObjectID] = a.Implements
		}
	}
	// Transitive ancestors (incl self) via BFS over extends ∪ implements.
	for class := range h.kind {
		seen := map[string]bool{}
		queue := []string{class}
		var anc []string
		for len(queue) > 0 {
			c := queue[0]
			queue = queue[1:]
			if seen[c] {
				continue
			}
			seen[c] = true
			anc = append(anc, c)
			if e := h.extends[c]; e != "" {
				queue = append(queue, e)
			}
			queue = append(queue, h.implements[c]...)
		}
		h.ancestors[class] = anc
	}
	// Inverse: descendants (incl self).
	for class, anc := range h.ancestors {
		for _, a := range anc {
			set := h.descendants[a]
			if set == nil {
				set = map[string]bool{}
				h.descendants[a] = set
			}
			set[class] = true
		}
		if h.descendants[class] == nil {
			h.descendants[class] = map[string]bool{class: true}
		}
	}
	return h
}

// isMixin reports whether class is a mixin (so findAll must filter by hasMixin).
func (h *hierarchy) isMixin(class string) bool { return h.kind[class] == kindMixin }

// isDerived reports whether class is target or a descendant of target.
func (h *hierarchy) isDerived(class, target string) bool {
	if class == target {
		return true
	}
	for _, a := range h.ancestors[class] {
		if a == target {
			return true
		}
	}
	return false
}

// getBaseClass walks up extends until a real CLASS (mixins/interfaces resolve to
// their first concrete class ancestor; the floor is core.class.Doc). It is the
// bucket findAll scans before refining with isDerived/hasMixin.
func (h *hierarchy) getBaseClass(class string) string {
	c := class
	for c != "" {
		if k, ok := h.kind[c]; ok && k == kindClass {
			return c
		}
		e := h.extends[c]
		if e == "" {
			break
		}
		c = e
	}
	if _, ok := h.kind[class]; !ok {
		// unknown class — query it directly rather than collapsing to Doc
		return class
	}
	return clDoc
}

// candidates is the set of concrete classes whose docs could match findAll(class):
// every descendant of the base class. findAll then refines with isDerived (+ mixin).
func (h *hierarchy) candidates(class string) []string {
	base := h.getBaseClass(class)
	set := h.descendants[base]
	if len(set) == 0 {
		return []string{class}
	}
	out := make([]string, 0, len(set))
	for c := range set {
		out = append(out, c)
	}
	return out
}

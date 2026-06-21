package transactor

import (
	"database/sql"
	"encoding/json"
	"os"
	"path/filepath"
	"regexp"
	"sync"

	_ "modernc.org/sqlite"
)

// store keeps ONE SQLite database per (org, workspace) — the data plane is
// SQLite scoped per tenant, no KV and no Postgres. Files nest as
// <dir>/orgs/<org>/ws/<workspace>.db so an org's data is physically isolated
// (full multitenancy) and the whole tree can live on one durable mount
// (a PVC today, SeaweedFS/S3 for scale). The driver is pure-Go modernc.org/
// sqlite (no cgo), keeping team a clean static binary.
type store struct {
	dir string
	mu  sync.Mutex
	dbs map[string]*sql.DB
}

func newStore(dir string) *store { return &store{dir: dir, dbs: map[string]*sql.DB{}} }

var pathSanitize = regexp.MustCompile(`[^a-zA-Z0-9_.-]`)

func seg(s string) string {
	if s == "" {
		return "_"
	}
	return pathSanitize.ReplaceAllString(s, "_")
}

// db opens (creating on first use) the (org, workspace) SQLite file and caches
// the handle. WAL + busy_timeout make concurrent sessions safe; a single open
// connection serializes writes (sqlite is single-writer) which is plenty for a
// per-workspace store. On a network FS that lacks WAL shared-memory the journal
// mode falls back via the DSN env knob.
func (s *store) db(org, workspace string) (*sql.DB, error) {
	key := org + "|" + workspace
	s.mu.Lock()
	defer s.mu.Unlock()
	if db, ok := s.dbs[key]; ok {
		return db, nil
	}
	dir := filepath.Join(s.dir, "orgs", seg(org), "ws")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	journal := env("SQLITE_JOURNAL_MODE", "WAL") // DELETE/TRUNCATE on FUSE/S3 mounts
	path := filepath.Join(dir, seg(workspace)+".db")
	db, err := sql.Open("sqlite", path+"?_pragma=busy_timeout(5000)&_pragma=journal_mode("+journal+")&_pragma=foreign_keys(0)")
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS docs (
		id    TEXT PRIMARY KEY,
		class TEXT NOT NULL,
		space TEXT,
		json  TEXT NOT NULL
	);
	CREATE INDEX IF NOT EXISTS idx_docs_class ON docs(class);
	CREATE INDEX IF NOT EXISTS idx_docs_space ON docs(space);`); err != nil {
		_ = db.Close()
		return nil, err
	}
	s.dbs[key] = db
	return db, nil
}

// get returns the stored JSON for a doc, or nil if absent.
func (s *store) get(org, workspace, id string) (map[string]any, error) {
	db, err := s.db(org, workspace)
	if err != nil {
		return nil, err
	}
	var raw string
	err = db.QueryRow(`SELECT json FROM docs WHERE id = ?`, id).Scan(&raw)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var doc map[string]any
	if err := json.Unmarshal([]byte(raw), &doc); err != nil {
		return nil, err
	}
	return doc, nil
}

// put upserts a doc keyed by its _id; _class/space mirror into columns for the
// findAll candidate scan.
func (s *store) put(org, workspace string, doc map[string]any) error {
	db, err := s.db(org, workspace)
	if err != nil {
		return err
	}
	id, _ := doc["_id"].(string)
	class, _ := doc["_class"].(string)
	space, _ := doc["space"].(string)
	if id == "" || class == "" {
		return nil
	}
	raw, err := json.Marshal(doc)
	if err != nil {
		return err
	}
	_, err = db.Exec(`INSERT INTO docs (id, class, space, json) VALUES (?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET class=excluded.class, space=excluded.space, json=excluded.json`,
		id, class, space, string(raw))
	return err
}

// del removes a doc by id.
func (s *store) del(org, workspace, id string) error {
	db, err := s.db(org, workspace)
	if err != nil {
		return err
	}
	_, err = db.Exec(`DELETE FROM docs WHERE id = ?`, id)
	return err
}

// byClasses returns the JSON of every doc whose _class is in the given set (the
// caller passes the descendant set of the queried class). Go-side matchQuery,
// sort and limit run over these.
func (s *store) byClasses(org, workspace string, classes []string) ([]map[string]any, error) {
	db, err := s.db(org, workspace)
	if err != nil {
		return nil, err
	}
	if len(classes) == 0 {
		return nil, nil
	}
	args := make([]any, len(classes))
	ph := make([]byte, 0, len(classes)*2)
	for i, c := range classes {
		args[i] = c
		if i > 0 {
			ph = append(ph, ',')
		}
		ph = append(ph, '?')
	}
	rows, err := db.Query(`SELECT json FROM docs WHERE class IN (`+string(ph)+`)`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []map[string]any
	for rows.Next() {
		var raw string
		if err := rows.Scan(&raw); err != nil {
			return nil, err
		}
		var doc map[string]any
		if err := json.Unmarshal([]byte(raw), &doc); err != nil {
			continue
		}
		out = append(out, doc)
	}
	return out, rows.Err()
}

// count returns how many docs the (org, workspace) holds — used to seed system
// spaces exactly once.
func (s *store) count(org, workspace string) (int, error) {
	db, err := s.db(org, workspace)
	if err != nil {
		return 0, err
	}
	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM docs`).Scan(&n); err != nil {
		return 0, err
	}
	return n, nil
}

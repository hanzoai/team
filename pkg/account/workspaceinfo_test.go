package account

import (
	"fmt"
	"testing"

	"github.com/hanzoai/base/core"
	"github.com/hanzoai/team-go/pkg/model"
)

// TestWorkspaceInfoVersionTracksModel is the no-drift guard on the account
// side: getUserWorkspaces' versionMajor/Minor/Patch is the Huly MODEL version
// (the SAME source the transactor reports as serverVersion) — not the old
// hardcoded 0.7.0. Default is the front's 0.6.0.
func TestWorkspaceInfoVersionTracksModel(t *testing.T) {
	ws := core.NewRecord(core.NewBaseCollection("workspaces"))
	info := toWorkspaceInfo(ws)

	if info.VersionMajor != model.Major() ||
		info.VersionMinor != model.Minor() ||
		info.VersionPatch != model.Patch() {
		t.Fatalf("workspace version = %d.%d.%d, want model %d.%d.%d",
			info.VersionMajor, info.VersionMinor, info.VersionPatch,
			model.Major(), model.Minor(), model.Patch())
	}

	got := fmt.Sprintf("%d.%d.%d", info.VersionMajor, info.VersionMinor, info.VersionPatch)
	if got != model.Version() {
		t.Fatalf("workspace version %q != model.Version() %q", got, model.Version())
	}
	if got != "0.6.0" {
		t.Fatalf("workspace version = %q, want default 0.6.0", got)
	}
}

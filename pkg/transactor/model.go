package transactor

import (
	"crypto/sha1"
	_ "embed"
	"encoding/hex"
)

// modelJSON is the prebuilt the platform model — a bare JSON array of 3558
// Tx (TxCreateDoc/TxMixin) defining every class, mixin and plugin. It is the
// same artifact the upstream transactor loads (models/all/bundle/model.json);
// the client builds its Hierarchy/ModelDb from it on connect via loadModel.
//
//go:embed model.json
var modelJSON []byte

// modelHash labels the served model in hello/loadModel. The the client uses
// it to skip re-pulling an unchanged model; any stable value is correct since
// we always return the full set (a hash mismatch just triggers a full pull,
// never a stale model). A content hash of the bytes is stable across restarts.
var modelHash = func() string {
	sum := sha1.Sum(modelJSON)
	return hex.EncodeToString(sum[:])
}()

package bots

// reconcilePlan is the diff between the desired bot set (from IAM + cloud
// agents) and the workspace's current bot members.
type reconcilePlan struct {
	toAdd    []ServiceAccount // enabled SAs not yet present
	toRemove []string         // service_account_ids of members to deactivate
}

// reconcile is a pure function: given the desired service-accounts and the set
// of service_account_ids currently active as bot members, return which to add
// and which to deactivate. Disabled SAs are removed; enabled SAs not yet present
// are added. A no-op re-run yields empty add/remove.
//
// This is the Go port of reconcileBotMembers (mapping.ts) — identical semantics,
// so the behavior is locked across the TS→Go move.
func reconcile(desired []ServiceAccount, currentSaIDs map[string]bool) reconcilePlan {
	desiredIDs := make(map[string]bool, len(desired))
	var toAdd []ServiceAccount
	for _, sa := range desired {
		if sa.Disabled {
			continue
		}
		desiredIDs[sa.ID] = true
		if !currentSaIDs[sa.ID] {
			toAdd = append(toAdd, sa)
		}
	}
	var toRemove []string
	for saID := range currentSaIDs {
		if !desiredIDs[saID] {
			toRemove = append(toRemove, saID)
		}
	}
	return reconcilePlan{toAdd: toAdd, toRemove: toRemove}
}

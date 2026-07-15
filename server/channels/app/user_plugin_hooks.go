// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"net/http"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
	"github.com/mattermost/mattermost/server/public/shared/request"
)

// runUserWillBeUpdated dispatches UserWillBeUpdated before UpdateUser validation/persist.
// Immutable identity fields (Id, CreateAt) are always restored from prev after plugins run.
func (a *App) runUserWillBeUpdated(rctx request.CTX, user, prev *model.User) (*model.User, *model.AppError) {
	var rejectionReason string
	pCtx := pluginContext(rctx)
	a.ch.RunMultiHook(func(hooks plugin.Hooks, _ *model.Manifest) bool {
		replacement, reason := hooks.UserWillBeUpdated(pCtx, user, prev)
		if reason != "" {
			rejectionReason = reason
			return false
		}
		if replacement != nil {
			user = replacement
		}
		return true
	}, plugin.UserWillBeUpdatedID)
	if rejectionReason != "" {
		return nil, model.NewAppError("UpdateUser", "app.user.update_user.rejected_by_plugin",
			map[string]any{"Reason": rejectionReason}, "", http.StatusBadRequest)
	}

	user.Id = prev.Id
	user.CreateAt = prev.CreateAt
	return user, nil
}

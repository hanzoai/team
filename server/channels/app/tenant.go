// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"net/http"
	"regexp"
	"strings"

	"github.com/hanzoai/team/server/public/model"
	"github.com/hanzoai/team/server/public/shared/mlog"
	"github.com/hanzoai/team/server/public/shared/request"
)

// A team name is lowercase alphanumerics and dashes. IAM org slugs are already
// close to that shape; this is the narrowing, not a general slugifier.
var notTeamName = regexp.MustCompile(`[^a-z0-9-]+`)

func teamNameForOrg(org string) string {
	name := notTeamName.ReplaceAllString(strings.ToLower(org), "-")
	return strings.Trim(name, "-")
}

// EnterOrgTeam puts a user in the team that stands for their IAM org, creating
// the team the first time someone from that org signs in.
//
// The org is the tenant boundary. It arrives as the owner claim, which IAM
// treats as authoritative, so it is the one input trusted here -- a user cannot
// name their own team by editing a profile field.
func (a *App) EnterOrgTeam(rctx request.CTX, user *model.User) *model.AppError {
	org, ok := user.GetProp(model.UserPropOrg)
	if !ok || org == "" {
		return nil
	}

	name := teamNameForOrg(org)
	if name == "" {
		return model.NewAppError("EnterOrgTeam", "app.tenant.org_name.app_error",
			map[string]any{"Org": org}, "", http.StatusBadRequest)
	}

	team, appErr := a.GetTeamByName(name)
	if appErr != nil {
		if appErr.StatusCode != http.StatusNotFound {
			return appErr
		}
		// Invite-only: a tenant's team is not something another tenant browses into.
		team, appErr = a.CreateTeam(rctx, &model.Team{
			Name:        name,
			DisplayName: org,
			Type:        model.TeamInvite,
		})
		if appErr != nil {
			// Someone else's sign-in may have won the race; take their team.
			if existing, getErr := a.GetTeamByName(name); getErr == nil {
				team = existing
			} else {
				return appErr
			}
		}
		rctx.Logger().Info("Created team for IAM org", mlog.String("org", org), mlog.String("team", name))
	}

	if _, appErr = a.GetTeamMember(rctx, team.Id, user.Id); appErr == nil {
		return nil
	}

	if _, appErr = a.JoinUserToTeam(rctx, team, user, ""); appErr != nil {
		return appErr
	}

	return nil
}

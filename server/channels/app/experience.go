// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"net/http"

	"golang.org/x/sync/errgroup"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/shared/request"
)

// GetInitialLoad assembles the aggregate InitialLoadResponse for the given user.
//
// activeTeamID is the client's currently known active team. When empty the server
// resolves the active team from the user's teams_order preference and
// ExperimentalPrimaryTeam config (mirroring the mobile selectDefaultTeam logic).
//
// Pass since=0 for a full cold-start response; pass the cursor returned by a
// previous call for a delta response.
func (a *App) GetInitialLoad(rctx request.CTX, userID string, activeTeamID string, activeChannelID string, since int64, listPublicTeams, listPrivateTeams bool) (*model.InitialLoadResponse, *model.AppError) {
	var (
		baseData          *experienceLoadSnapshot
		me                *model.User
		teams             []*model.Team
		deletedTeams      []*model.Team
		teamMembers       []*model.TeamMember
		prefs             model.Preferences
		prefTombstones    []model.PreferenceTombstone
		canJoinOtherTeams bool
		groupMemberships  *model.ExperienceGroupMembershipList
	)

	var baseLoadGroup errgroup.Group

	baseLoadGroup.Go(func() error {
		var appErr *model.AppError
		baseData, appErr = a.loadExperienceSnapshot(rctx, userID, since, experienceLoadErrorKeys{
			function:         "GetInitialLoad",
			loadError:        "app.initial_load.base_data.error",
			groupMemberships: "app.initial_load.get_group_memberships.app_error",
			prefTombstones:   "app.initial_load.get_preference_tombstones.app_error",
		})
		if appErr != nil {
			return appErr
		}
		return nil
	})

	// CanJoinOtherTeams: single EXISTS query gated by ListPublicTeams /
	// ListPrivateTeams permissions (skipped entirely when both are false).
	baseLoadGroup.Go(func() error {
		canJoin, err := a.Srv().Store().Team().UserCanJoinAnyTeam(userID, listPublicTeams, listPrivateTeams)
		if err != nil {
			return model.NewAppError("GetInitialLoad", "app.team.user_can_join_any_team.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
		}
		canJoinOtherTeams = canJoin
		return nil
	})

	if err := baseLoadGroup.Wait(); err != nil {
		if appErr, ok := err.(*model.AppError); ok {
			return nil, appErr
		}
		return nil, model.NewAppError("GetInitialLoad", "app.initial_load.base_data.error", nil, "", http.StatusInternalServerError).Wrap(err)
	}

	me = baseData.me
	teams = baseData.teams
	deletedTeams = baseData.deletedTeams
	teamMembers = baseData.teamMembers
	prefs = baseData.prefs
	prefTombstones = baseData.prefTombstones
	groupMemberships = baseData.groupMemberships

	// Delta: suppress unchanged user profile.
	if since > 0 && me != nil && me.UpdateAt <= since {
		me = nil
	}

	// Build tombstoned-team set from two sources:
	//   1. TeamMember.DeleteAt > 0  — user left the team (soft delete on membership)
	//   2. deletedTeams             — team was archived (Team.DeleteAt > since)
	// GetTeamsForUser never returns archived teams so we fetch them separately.
	tombstonedTeamIDs := buildTombstonedTeamIDs(teamMembers, deletedTeams)

	var locale = *a.Config().LocalizationSettings.DefaultClientLocale
	if me != nil {
		locale = me.Locale
	}
	resolvedTeamID := a.resolveActiveTeam(activeTeamID, teams, prefs, locale)

	// Stale team_id hint: if the client passed a team_id the user no longer belongs to,
	// surface the reason in RemovedTeamIds even on a cold start (since==0). This covers:
	//   1. Membership was removed: GetTeamMember returns a soft-deleted record.
	//   2. Team was archived/deleted: GetTeam returns a record with DeleteAt > 0.
	// On cold start GetTeamMembersForUser excludes deleted memberships and deletedTeams
	// is not fetched, so neither case is captured above. The targeted lookup here closes
	// that gap and lets the mobile client clean up its local DB on the next app launch.
	if activeTeamID != "" && activeTeamID != resolvedTeamID {
		if _, alreadyTombstoned := tombstonedTeamIDs[activeTeamID]; !alreadyTombstoned {
			if tm, appErr := a.GetTeamMember(rctx, activeTeamID, userID); appErr == nil && tm.DeleteAt > 0 {
				tombstonedTeamIDs[activeTeamID] = struct{}{}
			} else if t, appErr := a.GetTeam(activeTeamID); appErr == nil && t.DeleteAt > 0 {
				tombstonedTeamIDs[activeTeamID] = struct{}{}
			}
		}
	}

	var (
		teamChannels       model.ChannelList
		dmChannels         model.ChannelList
		channelMembers     model.ChannelMembersWithTeamData
		sidebarCats        *model.OrderedSidebarCategories
		teamsUnread        []*model.TeamUnread
		dmThreadMentions   int64
		dmThreadUrgent     int64
		dmThreadHasUnreads bool
		removedChIDs       []string
	)

	isCRT := a.IsCRTEnabledForUser(rctx, userID)
	dmLimit := getDMLimit(prefs)

	var teamDataGroup errgroup.Group

	if resolvedTeamID != "" {
		teamDataGroup.Go(func() error {
			opts := &model.ChannelSearchOpts{
				IncludeDeleted: since > 0,
			}
			chans, err := a.GetChannelsForTeamForUser(rctx, resolvedTeamID, userID, opts)
			if err != nil {
				return err
			}
			teamChannels = chans
			return nil
		})
	}

	// Fetch ALL DM/GM channels so the server-side visibility filter
	// (selectVisibleDMGMChannels) has the complete set — it replicates the mobile
	// filterManuallyClosedDMs + filterAutoclosedDMs + sortChannels logic and applies dmLimit.
	teamDataGroup.Go(func() error {
		chans, err := a.GetChannelsForUser(rctx, userID, since > 0, 0, -1, "")
		if err != nil {
			if err.StatusCode == http.StatusNotFound {
				return nil
			}
			return err
		}
		filtered := make(model.ChannelList, 0, len(chans))
		for _, ch := range chans {
			if ch.Type == model.ChannelTypeDirect || ch.Type == model.ChannelTypeGroup {
				filtered = append(filtered, ch)
			}
		}
		dmChannels = filtered
		return nil
	})

	teamDataGroup.Go(func() error {
		cursor := &model.ChannelMemberCursor{Page: 0, PerPage: 10000}
		members, err := a.GetChannelMembersWithTeamDataForUserWithPagination(rctx, userID, cursor)
		if err != nil {
			return err
		}
		channelMembers = members
		return nil
	})

	if resolvedTeamID != "" {
		teamDataGroup.Go(func() error {
			cats, err := a.GetSidebarCategoriesForTeamForUser(rctx, userID, resolvedTeamID)
			if err != nil {
				return err
			}
			sidebarCats = cats
			return nil
		})
	}

	teamDataGroup.Go(func() error {
		unreads, err := a.GetTeamsUnreadForUser("", userID, isCRT)
		if err != nil {
			return err
		}
		teamsUnread = unreads
		return nil
	})

	// DM/GM thread counts — query threads where ThreadTeamId is empty/NULL directly
	// to avoid the tombstone-team subtraction bug in GetTotalUnreadMentions.
	if isCRT {
		teamDataGroup.Go(func() error {
			hasUnreads, mentions, urgent, err := a.Srv().Store().Thread().GetDMGMThreadCounts(userID, a.IsPostPriorityEnabled())
			if err != nil {
				return model.NewAppError("GetInitialLoad", "app.initial_load.dm_thread_counts.error", nil, "", http.StatusInternalServerError).Wrap(err)
			}
			dmThreadHasUnreads = hasUnreads
			dmThreadMentions = mentions
			dmThreadUrgent = urgent
			return nil
		})
	}

	if since > 0 && resolvedTeamID != "" {
		teamDataGroup.Go(func() error {
			ids, err := a.Srv().Store().ChannelMemberHistory().GetChannelsLeftInTeamSince(userID, resolvedTeamID, since)
			if err != nil {
				return model.NewAppError("GetInitialLoad", "app.initial_load.channel_history.error", nil, "", http.StatusInternalServerError).Wrap(err)
			}
			removedChIDs = ids
			return nil
		})
	}

	if err := teamDataGroup.Wait(); err != nil {
		if appErr, ok := err.(*model.AppError); ok {
			return nil, appErr
		}
		return nil, model.NewAppError("GetInitialLoad", "app.initial_load.team_data.error", nil, "", http.StatusInternalServerError).Wrap(err)
	}

	// Merge team channels + ALL DM/GM channels for profile fetch.
	// selectVisibleDMGMChannels needs the full profile map (including deactivated-user
	// detection) so profiles must be fetched before filtering.
	allChannels := mergeChannels(teamChannels, dmChannels)

	var (
		roles                 []*model.Role
		dmGMProfilesByChannel map[string][]*model.User
	)

	var profileAndRoleGroup errgroup.Group

	profileAndRoleGroup.Go(func() error {
		var appErr *model.AppError
		roles, appErr = a.getRolesSince(me, teamMembers, channelMembers, 0)
		if appErr != nil {
			return appErr
		}
		return nil
	})

	// Fetch member profiles for all DM and GM channels. GetDMGMProfilesByChannelIds:
	//   - applies the since filter in delta mode (UpdateAt > since OR DeleteAt > since)
	//   - includes deactivated users so filterAutoclosedDMs can detect them
	//   - does NOT filter by Channels.DeleteAt so deactivated-user DMs are included
	profileAndRoleGroup.Go(func() error {
		channelIDs := make([]string, 0, len(dmChannels))
		for _, ch := range dmChannels {
			channelIDs = append(channelIDs, ch.Id)
		}
		if len(channelIDs) == 0 {
			return nil
		}
		profiles, err := a.Srv().Store().Channel().GetDMGMProfilesByChannelIds(channelIDs, userID, since)
		if err != nil {
			// Non-fatal: fall back to empty display names (client will resolve)
			rctx.Logger().Warn("GetInitialLoad: failed to fetch DM/GM member profiles", mlog.Err(err))
			return nil
		}
		dmGMProfilesByChannel = profiles
		return nil
	})

	if err := profileAndRoleGroup.Wait(); err != nil {
		if appErr, ok := err.(*model.AppError); ok {
			return nil, appErr
		}
		return nil, model.NewAppError("GetInitialLoad", "app.initial_load.profile_role_data.error", nil, "", http.StatusInternalServerError).Wrap(err)
	}

	dmChannels = selectVisibleDMGMChannels(userID, activeChannelID, dmChannels, channelMembers, sidebarCats, prefs, dmGMProfilesByChannel, dmLimit, isCRT, locale)
	allChannels = mergeChannels(teamChannels, dmChannels)

	// activeSince: cursor used for team-scoped data (channels, members, sidebar, roles).
	// When the client's team_id hint is rejected (user removed, team archived), the client
	// has no local data for the newly resolved team — drop to 0 to force a full team sync.
	// This does NOT apply when the client sent no team_id hint (activeTeamID==""), in which
	// case the server resolves a team and the client's since cursor remains valid.
	activeSince := since
	if since > 0 && activeTeamID != "" && resolvedTeamID != activeTeamID {
		activeSince = 0
	}

	changedChannels := allChannels
	changedChannelMembers := channelMembers
	if activeSince > 0 {
		changedChannels = filterChannelsSince(allChannels, dmGMProfilesByChannel, activeSince)
		changedChannelMembers = filterMembersSince(channelMembers, activeSince)

		// Roles are global but scoped to the active team's needs — drop to 0 if the
		// team changed (client may be missing role definitions for the new team).
		var appErr *model.AppError
		roles, appErr = a.getRolesSince(me, teamMembers, channelMembers, activeSince)
		if appErr != nil {
			return nil, model.NewAppError("GetInitialLoad", "app.initial_load.get_roles.app_error", nil, "", http.StatusInternalServerError).Wrap(appErr)
		}
	}

	// Teams delta: include a team when ANY of:
	//   1. Team metadata changed (UpdateAt > since) — or cold start (since == 0)
	//   2. Team has active badge data (mentions, unreads)
	//   3. Team is tombstoned — surfaced via RemovedTeamIds, NOT in Teams array
	unreadByTeam := indexTeamUnreadsByTeamID(teamsUnread)

	var changedTeams []*model.Team
	if since == 0 {
		changedTeams = make([]*model.Team, 0, len(teams))
		for _, t := range teams {
			if _, isTombstoned := tombstonedTeamIDs[t.Id]; !isTombstoned {
				changedTeams = append(changedTeams, t)
			}
		}
	} else {
		changedTeams = make([]*model.Team, 0, len(teams))
		for _, t := range teams {
			if _, isTombstoned := tombstonedTeamIDs[t.Id]; isTombstoned {
				continue
			}
			if t.UpdateAt > since {
				changedTeams = append(changedTeams, t)
				continue
			}
			if u, ok := unreadByTeam[t.Id]; ok {
				hasBadge := u.MentionCount > 0 || u.MentionCountRoot > 0 ||
					u.MsgCount > 0 ||
					u.ThreadMentionCount > 0 || u.ThreadCount > 0
				if hasBadge {
					changedTeams = append(changedTeams, t)
				}
			}
		}
	}

	// TeamMembers: scope to teams in changedTeams + active team + tombstoned teams.
	scopedTeamMembers := teamMembers
	if since > 0 {
		includedTeamIDs := make(map[string]struct{}, len(changedTeams)+len(tombstonedTeamIDs)+1)
		for _, t := range changedTeams {
			includedTeamIDs[t.Id] = struct{}{}
		}
		if resolvedTeamID != "" {
			includedTeamIDs[resolvedTeamID] = struct{}{}
		}
		for tid := range tombstonedTeamIDs {
			includedTeamIDs[tid] = struct{}{}
		}
		scopedTeamMembers = make([]*model.TeamMember, 0, len(teamMembers))
		for _, tm := range teamMembers {
			if _, ok := includedTeamIDs[tm.TeamId]; ok {
				scopedTeamMembers = append(scopedTeamMembers, tm)
			}
		}
	}

	nameFormat := effectiveNameFormat(prefs, a.Config())
	enrichDMGMDisplayNames(userID, allChannels, dmGMProfilesByChannel, nameFormat)

	gmMemberCounts := make(map[string]int64, len(dmGMProfilesByChannel))
	for chID, profiles := range dmGMProfilesByChannel {
		gmMemberCounts[chID] = int64(len(profiles))
	}

	directProfiles := buildDirectProfiles(dmGMProfilesByChannel)

	// Omit sidebar when client cursor is newer than the last sidebar mutation.
	// Uses activeSince (0 when the active team changed) so the full sidebar is always
	// sent when the client has no local data for the resolved team.
	if activeSince > 0 && getSidebarVersion(prefs, resolvedTeamID) <= activeSince {
		sidebarCats = nil
	}

	// Collect user IDs for presence: the requesting user + all DM/GM participants.
	statusUserIDs := make([]string, 0, 1+len(dmGMProfilesByChannel))
	statusUserIDs = append(statusUserIDs, userID)
	for _, profiles := range dmGMProfilesByChannel {
		for _, u := range profiles {
			statusUserIDs = append(statusUserIDs, u.Id)
		}
	}

	return &model.InitialLoadResponse{
		Me:                   toExperienceUser(me),
		Teams:                toExperienceTeams(changedTeams),
		TeamMembers:          toExperienceTeamMemberList(scopedTeamMembers, tombstonedTeamIDs),
		ActiveTeam:           toExperienceActiveTeam(resolvedTeamID, teams, allChannels, changedChannels, channelMembers, changedChannelMembers, sidebarCats, removedChIDs, prefs, gmMemberCounts),
		TeamUnreads:          toExperienceTeamUnreadsList(changedTeams, teamsUnread, isCRT),
		DirectUnreads:        buildDirectUnreads(userID, channelMembers, dmGMProfilesByChannel, prefs, isCRT, dmThreadHasUnreads, dmThreadMentions, dmThreadUrgent),
		DirectProfiles:       directProfiles,
		Roles:                toExperienceRoles(roles),
		Preferences:          prefs,
		PreferenceTombstones: prefTombstones,
		Timestamp:            model.GetMillis(),
		CanJoinOtherTeams:    canJoinOtherTeams,
		GroupMemberships:     toExperienceGroupMembershipList(groupMemberships),
		Statuses:             a.buildStatusSnapshot(statusUserIDs),
	}, nil
}

// GetTeamLoad assembles the aggregate TeamLoadResponse for the given user and team.
//
// Pass since=0 for a full response; pass the cursor returned by a previous call for
// a delta response (only changed data since that cursor is returned).
//
// Sidebar categories are included when since==0 (cold start) or when the sidebar
// was mutated after the client's cursor (sidebarVersion > since).
func (a *App) GetTeamLoad(rctx request.CTX, userID, teamID string, since int64) (*model.TeamLoadResponse, *model.AppError) {
	// Verify the team exists and has not been deleted.
	team, appErr := a.GetTeam(teamID)
	if appErr != nil {
		return nil, model.NewAppError("GetTeamLoad", "app.team_load.team_not_found.app_error", nil, "", http.StatusForbidden).Wrap(appErr)
	}
	if team.DeleteAt > 0 {
		return nil, model.NewAppError("GetTeamLoad", "app.team_load.team_deleted.app_error", nil, "", http.StatusForbidden)
	}

	// Verify the user is an active member of the team.
	member, appErr := a.GetTeamMember(rctx, teamID, userID)
	if appErr != nil {
		return nil, model.NewAppError("GetTeamLoad", "app.team_load.not_member.app_error", nil, "", http.StatusForbidden).Wrap(appErr)
	}
	if member.DeleteAt > 0 {
		return nil, model.NewAppError("GetTeamLoad", "app.team_load.membership_deleted.app_error", nil, "", http.StatusForbidden)
	}

	var (
		allChannels    model.ChannelList
		channelMembers model.ChannelMembersWithTeamData
		sidebarCats    *model.OrderedSidebarCategories
		removedChIDs   []string
		prefs          model.Preferences
	)

	var eg errgroup.Group

	eg.Go(func() error {
		opts := &model.ChannelSearchOpts{
			IncludeDeleted: since > 0,
		}
		chans, err := a.GetChannelsForTeamForUser(rctx, teamID, userID, opts)
		if err != nil {
			return err
		}
		// GetChannelsForTeamForUser includes DM/GM channels (OR ch.TeamId = '').
		// Filter to this team only.
		filtered := make(model.ChannelList, 0, len(chans))
		for _, ch := range chans {
			if ch.TeamId == teamID {
				filtered = append(filtered, ch)
			}
		}
		allChannels = filtered
		return nil
	})

	eg.Go(func() error {
		cursor := &model.ChannelMemberCursor{Page: 0, PerPage: 10000}
		members, err := a.GetChannelMembersWithTeamDataForUserWithPagination(rctx, userID, cursor)
		if err != nil {
			return err
		}
		channelMembers = members
		return nil
	})

	eg.Go(func() error {
		cats, err := a.GetSidebarCategoriesForTeamForUser(rctx, userID, teamID)
		if err != nil {
			return err
		}
		sidebarCats = cats
		return nil
	})

	eg.Go(func() error {
		allPrefs, err := a.GetPreferencesForUser(rctx, userID)
		if err != nil {
			return err
		}
		prefs = allPrefs
		return nil
	})

	if since > 0 {
		eg.Go(func() error {
			ids, err := a.Srv().Store().ChannelMemberHistory().GetChannelsLeftInTeamSince(userID, teamID, since)
			if err != nil {
				return model.NewAppError("GetTeamLoad", "app.team_load.channel_history.error", nil, "", http.StatusInternalServerError).Wrap(err)
			}
			removedChIDs = ids
			return nil
		})
	}

	if err := eg.Wait(); err != nil {
		if appErr, ok := err.(*model.AppError); ok {
			return nil, appErr
		}
		return nil, model.NewAppError("GetTeamLoad", "app.team_load.fanout.error", nil, "", http.StatusInternalServerError).Wrap(err)
	}

	// Scope channel members to this team only.
	teamChIDs := make(map[string]struct{}, len(allChannels))
	for _, ch := range allChannels {
		teamChIDs[ch.Id] = struct{}{}
	}
	scopedMembers := make(model.ChannelMembersWithTeamData, 0, len(channelMembers))
	for i := range channelMembers {
		if _, ok := teamChIDs[channelMembers[i].ChannelId]; ok {
			scopedMembers = append(scopedMembers, channelMembers[i])
		}
	}

	changedChannels := allChannels
	changedMembers := scopedMembers
	if since > 0 {
		filtered := make(model.ChannelList, 0, len(allChannels))
		for _, ch := range allChannels {
			if ch.UpdateAt > since {
				filtered = append(filtered, ch)
			}
		}
		changedChannels = filtered
		changedMembers = filterMembersSince(scopedMembers, since)
	}

	roles, rolesErr := a.getRolesSince(nil, nil, scopedMembers, since)
	if rolesErr != nil {
		return nil, rolesErr
	}

	if since > 0 && getSidebarVersion(prefs, teamID) <= since {
		sidebarCats = nil
	}

	include := func(ch *model.Channel) bool { return ch.TeamId == teamID }
	chList, cmList := buildExperienceChannelLists(allChannels, changedChannels, changedMembers, include, nil)

	return &model.TeamLoadResponse{
		Channels: chList,
		ChannelMembers: model.ExperienceChannelMemberList{
			Members:           cmList,
			RemovedChannelIds: removedChIDs,
		},
		SidebarCategories: sidebarCats,
		SidebarVersion:    getSidebarVersion(prefs, teamID),
		Roles:             toExperienceRoles(roles),
		Timestamp:         model.GetMillis(),
	}, nil
}

func (a *App) GetExperienceSync(rctx request.CTX, userID string, req *model.ExperienceSyncRequest) (*model.ExperienceSyncResponse, *model.AppError) {
	since := req.Since
	scope := req.Scope
	isCRT := a.IsCRTEnabledForUser(rctx, userID)

	baseData, appErr := a.loadExperienceSnapshot(rctx, userID, since, experienceLoadErrorKeys{
		function:         "GetExperienceSync",
		loadError:        "app.sync.base_data.error",
		groupMemberships: "app.sync.get_group_memberships.app_error",
		prefTombstones:   "app.sync.get_preference_tombstones.app_error",
	})
	if appErr != nil {
		return nil, appErr
	}

	me := baseData.me
	teams := baseData.teams
	deletedTeams := baseData.deletedTeams
	teamMembers := baseData.teamMembers
	prefs := baseData.prefs
	prefTombstones := baseData.prefTombstones
	groupMemberships := baseData.groupMemberships

	if since > 0 && me != nil && me.UpdateAt <= since {
		me = nil
	}

	tombstonedTeamIDs := buildTombstonedTeamIDs(teamMembers, deletedTeams)
	removedTeamIDs := listTeamIDsFromSet(tombstonedTeamIDs)

	// Validate scope: filter team_ids to teams the user is an active member of.
	validTeamIDs := make([]string, 0, len(scope.TeamIDs))
	teamMemberSet := make(map[string]struct{}, len(teamMembers))
	for _, tm := range teamMembers {
		if tm.DeleteAt == 0 {
			teamMemberSet[tm.TeamId] = struct{}{}
		}
	}
	for _, id := range scope.TeamIDs {
		if _, ok := teamMemberSet[id]; ok {
			validTeamIDs = append(validTeamIDs, id)
		}
	}

	if scope.GlobalThreadsTeamID != "" {
		if _, ok := teamMemberSet[scope.GlobalThreadsTeamID]; !ok {
			scope.GlobalThreadsTeamID = ""
		}
	}

	type teamResult struct {
		delta   *model.ExperienceSyncTeamDelta
		members model.ChannelMembersWithTeamData
	}
	results := make([]teamResult, len(validTeamIDs))

	var (
		allChannelMembers   model.ChannelMembersWithTeamData
		teamsUnread         []*model.TeamUnread
		dmChannels          model.ChannelList
		dmProfilesByChannel map[string][]*model.User
		dmThreadHasUnreads  bool
		dmThreadMentions    int64
		dmThreadUrgent      int64
	)

	var deltaDataGroup errgroup.Group

	deltaDataGroup.Go(func() error {
		var appErr *model.AppError
		teamsUnread, appErr = a.GetTeamsUnreadForUser("", userID, isCRT)
		if appErr != nil {
			return appErr
		}
		return nil
	})

	for i, teamID := range validTeamIDs {
		deltaDataGroup.Go(func() error {
			delta, members, appErr := a.buildSyncTeamDelta(rctx, userID, teamID, since)
			if appErr != nil {
				return appErr
			}
			results[i] = teamResult{delta: delta, members: members}
			return nil
		})
	}

	deltaDataGroup.Go(func() error {
		chans, appErr := a.GetChannelsForUser(rctx, userID, since > 0, 0, -1, "")
		if appErr != nil {
			return appErr
		}
		dmOnly := make(model.ChannelList, 0)
		for _, ch := range chans {
			if ch.TeamId == "" {
				dmOnly = append(dmOnly, ch)
			}
		}
		if len(dmOnly) == 0 {
			return nil
		}

		channelIDs := make([]string, 0, len(dmOnly))
		for _, ch := range dmOnly {
			channelIDs = append(channelIDs, ch.Id)
		}

		profiles, storeErr := a.Srv().Store().Channel().GetDMGMProfilesByChannelIds(channelIDs, userID, since)
		if storeErr != nil {
			rctx.Logger().Warn("GetExperienceSync: failed to fetch DM/GM profiles", mlog.Err(storeErr))
		}
		dmProfilesByChannel = profiles

		filtered := filterChannelsSince(dmOnly, dmProfilesByChannel, since)
		nameFormat := effectiveNameFormat(prefs, a.Config())
		enrichDMGMDisplayNames(userID, filtered, dmProfilesByChannel, nameFormat)
		dmChannels = filtered
		return nil
	})

	// DM/GM thread counts — queries ThreadTeamId = '' / NULL directly to avoid
	// the tombstone-team subtraction bug in GetTotalUnreadMentions.
	if isCRT {
		deltaDataGroup.Go(func() error {
			hasUnreads, mentions, urgent, err := a.Srv().Store().Thread().GetDMGMThreadCounts(userID, a.IsPostPriorityEnabled())
			if err != nil {
				return model.NewAppError("GetExperienceSync", "app.sync.dm_thread_counts.error", nil, "", http.StatusInternalServerError).Wrap(err)
			}
			dmThreadHasUnreads = hasUnreads
			dmThreadMentions = mentions
			dmThreadUrgent = urgent
			return nil
		})
	}

	if err := deltaDataGroup.Wait(); err != nil {
		if appErr, ok := err.(*model.AppError); ok {
			return nil, appErr
		}
		return nil, model.NewAppError("GetExperienceSync", "app.sync.delta_data.error", nil, "", http.StatusInternalServerError).Wrap(err)
	}

	unreadByTeam := indexTeamUnreadsByTeamID(teamsUnread)
	teamsByID := make(map[string]*model.Team, len(teams))
	for _, t := range teams {
		teamsByID[t.Id] = t
	}

	teamDeltas := make([]*model.ExperienceSyncTeamDelta, 0, len(results))
	for i, r := range results {
		if r.delta == nil {
			continue
		}
		teamID := validTeamIDs[i]
		if t, ok := teamsByID[teamID]; ok && t.UpdateAt > since {
			r.delta.Team = toExperienceTeam(t)
		}
		teamDeltas = append(teamDeltas, r.delta)
		allChannelMembers = append(allChannelMembers, r.members...)
	}

	dmChannelItems := make([]*model.ExperienceChannel, 0, len(dmChannels))
	for _, ch := range dmChannels {
		dmChannelItems = append(dmChannelItems, toExperienceChannel(ch))
	}

	dmMemberItems := make([]*model.ExperienceChannelMember, 0)
	for i := range allChannelMembers {
		m := &allChannelMembers[i]
		if m.TeamName == "" && m.ChannelMember.LastUpdateAt > since {
			dmMemberItems = append(dmMemberItems, toExperienceChannelMember(m))
		}
	}

	roles, rolesErr := a.getRolesSince(me, teamMembers, allChannelMembers, since)
	if rolesErr != nil {
		return nil, model.NewAppError("GetExperienceSync", "app.sync.get_roles.app_error", nil, "", http.StatusInternalServerError).Wrap(rolesErr)
	}

	var (
		activeChannelResult *model.ExperienceSyncActiveChannel
		activeChannelPosts  *model.PostList
		activeThreadResult  *model.ExperienceSyncActiveThread
		activeThreadPosts   *model.PostList
		threadsDelta        *model.ExperienceSyncThreadsDelta
		threadParticipants  []*model.User
	)

	var contextDataGroup errgroup.Group

	if scope.ActiveChannelID != "" {
		contextDataGroup.Go(func() error {
			if ok, _ := a.SessionHasPermissionToChannel(rctx, *rctx.Session(), scope.ActiveChannelID, model.PermissionReadChannel); !ok {
				rctx.Logger().Warn("GetExperienceSync: user lacks access to active_channel_id, skipping", mlog.String("channel_id", scope.ActiveChannelID))
				return nil
			}

			ch, appErr := a.GetChannel(rctx, scope.ActiveChannelID)
			if appErr != nil {
				rctx.Logger().Warn("GetExperienceSync: active_channel_id not found, skipping", mlog.String("channel_id", scope.ActiveChannelID), mlog.Err(appErr))
				return nil
			}

			postList, appErr := a.GetPostsSince(rctx, model.GetPostsSinceOptions{
				ChannelId:        scope.ActiveChannelID,
				Time:             since,
				CollapsedThreads: true,
			})
			if appErr != nil {
				return appErr
			}
			activeChannelPosts = postList

			memberCount, appErr := a.GetChannelMemberCount(rctx, scope.ActiveChannelID)
			if appErr != nil {
				return appErr
			}
			guestCount, appErr := a.GetChannelGuestCount(rctx, scope.ActiveChannelID)
			if appErr != nil {
				return appErr
			}
			pinnedPostCount, appErr := a.GetChannelPinnedPostCount(rctx, scope.ActiveChannelID)
			if appErr != nil {
				return appErr
			}
			filesCount, appErr := a.GetChannelFileCount(rctx, scope.ActiveChannelID)
			if appErr != nil {
				return appErr
			}

			bookmarks, appErr := a.GetChannelBookmarks(scope.ActiveChannelID, since)
			if appErr != nil {
				return appErr
			}

			result := &model.ExperienceSyncActiveChannel{
				ChannelID: scope.ActiveChannelID,
				Stats: &model.ChannelStats{
					ChannelId:       scope.ActiveChannelID,
					MemberCount:     memberCount,
					GuestCount:      guestCount,
					PinnedPostCount: pinnedPostCount,
					FilesCount:      filesCount,
				},
				Bookmarks: bookmarks,
			}

			// GroupChannels table (not UserGroups) has no delta-capable UpdateAt — always send full list.
			if ch.GroupConstrained != nil && *ch.GroupConstrained {
				groups, _, appErr := a.GetGroupsByChannel(scope.ActiveChannelID, model.GroupSearchOpts{})
				if appErr != nil {
					return appErr
				}
				result.ConstrainedGroups = groups
			}

			activeChannelResult = result
			return nil
		})
	}

	if scope.ActiveThreadID != "" {
		contextDataGroup.Go(func() error {
			postList, appErr := a.GetPostThread(rctx, scope.ActiveThreadID, model.GetPostsOptions{
				CollapsedThreads:         true,
				CollapsedThreadsExtended: true,
				FromCreateAt:             since,
				Direction:                "down",
				IncludeDeleted:           true,
			}, userID)
			if appErr != nil {
				rctx.Logger().Warn("GetExperienceSync: failed to fetch active_thread_id, skipping", mlog.String("thread_id", scope.ActiveThreadID), mlog.Err(appErr))
				return nil
			}
			activeThreadPosts = postList
			activeThreadResult = &model.ExperienceSyncActiveThread{RootID: scope.ActiveThreadID}
			return nil
		})
	}

	if scope.GlobalThreadsTeamID != "" {
		contextDataGroup.Go(func() error {
			threads, appErr := a.GetThreadsForUser(rctx, userID, scope.GlobalThreadsTeamID, model.GetUserThreadsOpts{
				Since:    uint64(since),
				Deleted:  true,
				Extended: true,
			})
			if appErr != nil {
				return appErr
			}
			syncThreads := make([]*model.ExperienceSyncThread, 0, len(threads.Threads))
			for _, t := range threads.Threads {
				syncThreads = append(syncThreads, &model.ExperienceSyncThread{
					ID:             t.PostId,
					ReplyCount:     t.ReplyCount,
					LastReplyAt:    t.LastReplyAt,
					LastViewedAt:   t.LastViewedAt,
					UnreadReplies:  t.UnreadReplies,
					UnreadMentions: t.UnreadMentions,
					IsFollowing:    t.Post != nil && t.Post.IsFollowing != nil && *t.Post.IsFollowing,
					DeleteAt:       t.Post.DeleteAt,
				})
				threadParticipants = append(threadParticipants, t.Participants...)
			}
			threadsDelta = &model.ExperienceSyncThreadsDelta{
				TeamID:              scope.GlobalThreadsTeamID,
				Threads:             syncThreads,
				Total:               threads.Total,
				TotalUnreadMentions: threads.TotalUnreadMentions,
				TotalUnreadThreads:  threads.TotalUnreadThreads,
			}
			return nil
		})
	}

	if err := contextDataGroup.Wait(); err != nil {
		if appErr, ok := err.(*model.AppError); ok {
			return nil, appErr
		}
		return nil, model.NewAppError("GetExperienceSync", "app.sync.context_data.error", nil, "", http.StatusInternalServerError).Wrap(err)
	}

	allPosts, chOrder, thOrder := deduplicateSyncPosts(activeChannelPosts, activeThreadPosts)
	if activeChannelResult != nil {
		activeChannelResult.PostsOrder = chOrder
	}
	if activeThreadResult != nil {
		activeThreadResult.PostsOrder = thOrder
	}

	dmPartnerProfiles := make([]*model.User, 0)
	for _, profiles := range dmProfilesByChannel {
		dmPartnerProfiles = append(dmPartnerProfiles, profiles...)
	}

	authors, mentionedGroups := a.resolveSyncAuthorsAndGroups(rctx, allPosts, threadParticipants, dmPartnerProfiles)

	directUnreads := buildDirectUnreads(userID, allChannelMembers, dmProfilesByChannel, prefs, isCRT, dmThreadHasUnreads, dmThreadMentions, dmThreadUrgent)

	// Build per-team unreads for ALL teams (not just scoped ones) so the mobile
	// badge blob is accurate for teams not yet loaded in this session.
	teamsUnreads := make([]*model.ExperienceUnreads, 0, len(teams))
	for _, t := range teams {
		if _, isTombstoned := tombstonedTeamIDs[t.Id]; isTombstoned {
			continue
		}
		teamsUnreads = append(teamsUnreads, toExperienceTeamUnreads(t.Id, unreadByTeam[t.Id], isCRT))
	}

	// Collect user IDs for presence: all authors (post authors + thread participants
	// + DM partners already resolved by resolveSyncAuthorsAndGroups).
	statusUserIDs := make([]string, 0, len(authors))
	for _, u := range authors {
		statusUserIDs = append(statusUserIDs, u.Id)
	}

	return &model.ExperienceSyncResponse{
		Config:         a.ClientConfig(),
		License:        a.Srv().GetSanitizedClientLicense(),
		Me:             me,
		RemovedTeamIDs: removedTeamIDs,
		TeamsUnreads:   teamsUnreads,
		Teams:          teamDeltas,
		DirectChannels: dmChannelItems,
		DirectChannelMembers: model.ExperienceChannelMemberList{
			Members: dmMemberItems,
		},
		DirectUnreads:        directUnreads,
		Preferences:          prefs,
		PreferenceTombstones: prefTombstones,
		GroupMemberships:     toExperienceGroupMembershipList(groupMemberships),
		Roles:                toExperienceRoles(roles),
		Posts:                allPosts,
		Authors:              authors,
		Groups:               mentionedGroups,
		ActiveChannel:        activeChannelResult,
		ActiveThread:         activeThreadResult,
		ThreadsDelta:         threadsDelta,
		Statuses:             a.buildStatusSnapshot(statusUserIDs),
		Timestamp:            model.GetMillis(),
	}, nil
}

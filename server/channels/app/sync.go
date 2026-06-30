// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"net/http"
	"regexp"
	"strings"

	"golang.org/x/sync/errgroup"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/shared/request"
)

var syncAtMentionRegexp = regexp.MustCompile(`\B@([[:alnum:]][[:alnum:]\.\-_:]*)`)

var syncSpecialMentions = map[string]struct{}{
	"all":     {},
	"channel": {},
	"here":    {},
}

func (a *App) GetExperienceSync(rctx request.CTX, userID string, req *model.ExperienceSyncRequest) (*model.ExperienceSyncResponse, *model.AppError) {
	since := req.Since
	scope := req.Scope
	isCRT := a.IsCRTEnabledForUser(rctx, userID)

	// entity delta, fully parallel
	var (
		me               *model.User
		teams            []*model.Team
		deletedTeams     []*model.Team
		teamMembers      []*model.TeamMember
		prefs            model.Preferences
		prefTombstones   []model.PreferenceTombstone
		groupMemberships *model.InitialLoadGroupMembershipList
	)

	var egA errgroup.Group

	egA.Go(func() error {
		var appErr *model.AppError
		me, appErr = a.GetUser(userID)
		if appErr != nil {
			return appErr
		}
		return nil
	})

	egA.Go(func() error {
		var appErr *model.AppError
		teams, appErr = a.GetTeamsForUser(userID)
		if appErr != nil {
			return appErr
		}
		return nil
	})

	if since > 0 {
		egA.Go(func() error {
			var appErr *model.AppError
			deletedTeams, appErr = a.GetDeletedTeamsForUserSince(userID, since)
			if appErr != nil {
				return appErr
			}
			return nil
		})
	}

	egA.Go(func() error {
		var appErr *model.AppError
		teamMembers, appErr = a.GetTeamMembersForUser(rctx, userID, "", since > 0)
		if appErr != nil {
			return appErr
		}
		return nil
	})

	egA.Go(func() error {
		allPrefs, appErr := a.GetPreferencesForUser(rctx, userID)
		if appErr != nil {
			return appErr
		}
		categorySet := make(map[string]struct{}, len(initialLoadPreferenceCategories))
		for _, c := range initialLoadPreferenceCategories {
			categorySet[c] = struct{}{}
		}
		prefs = make(model.Preferences, 0, len(allPrefs))
		for _, p := range allPrefs {
			if _, ok := categorySet[p.Category]; ok {
				prefs = append(prefs, p)
			}
		}
		return nil
	})

	if since > 0 {
		egA.Go(func() error {
			var err error
			prefTombstones, err = a.Srv().Store().Preference().GetDeletedSince(userID, since)
			if err != nil {
				return model.NewAppError("GetExperienceSync", "app.sync.get_preference_tombstones.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
			}
			return nil
		})
	}

	egA.Go(func() error {
		var err error
		groupMemberships, err = a.Srv().Store().Group().GetMembershipsByUser(userID, since)
		if err != nil {
			return model.NewAppError("GetExperienceSync", "app.sync.get_group_memberships.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
		}
		return nil
	})

	if err := egA.Wait(); err != nil {
		if appErr, ok := err.(*model.AppError); ok {
			return nil, appErr
		}
		return nil, model.NewAppError("GetExperienceSync", "app.sync.phase_a.error", nil, "", http.StatusInternalServerError).Wrap(err)
	}

	if since > 0 && me != nil && me.UpdateAt <= since {
		me = nil
	}

	tombstonedTeamIDs := make(map[string]struct{})
	for _, tm := range teamMembers {
		if tm.DeleteAt > 0 {
			tombstonedTeamIDs[tm.TeamId] = struct{}{}
		}
	}
	for _, t := range deletedTeams {
		tombstonedTeamIDs[t.Id] = struct{}{}
	}
	removedTeamIDs := make([]string, 0, len(tombstonedTeamIDs))
	for id := range tombstonedTeamIDs {
		removedTeamIDs = append(removedTeamIDs, id)
	}

	// Validate scope: filter team_ids to teams the user is an active member of.
	// Skip invalid/inaccessible teams rather than failing the whole request.
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

	// Validate GlobalThreadsTeamID — must be in validTeamIDs.
	if scope.GlobalThreadsTeamID != "" {
		if _, ok := teamMemberSet[scope.GlobalThreadsTeamID]; !ok {
			scope.GlobalThreadsTeamID = ""
		}
	}

	// ActiveChannelID and ActiveThreadID permission is validated lazily by the
	// app methods (GetPostsSince, GetPostThread) which return 403/404 on failure;
	// those goroutines are skipped if the result is an error.

	// per-team channel delta + DM/GM channels + team unreads, parallel
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

	var egB errgroup.Group

	egB.Go(func() error {
		var appErr *model.AppError
		teamsUnread, appErr = a.GetTeamsUnreadForUser("", userID, isCRT)
		if appErr != nil {
			return appErr
		}
		return nil
	})

	for i, teamID := range validTeamIDs {
		egB.Go(func() error {
			delta, members, appErr := a.buildSyncTeamDelta(rctx, userID, teamID, since)
			if appErr != nil {
				return appErr
			}
			results[i] = teamResult{delta: delta, members: members}
			return nil
		})
	}

	egB.Go(func() error {
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

		// Filter first, then enrich only channels being sent
		filtered := filterChannelsSince(dmOnly, dmProfilesByChannel, since)
		nameFormat := effectiveNameFormat(prefs, a.Config())
		enrichDMGMDisplayNames(userID, filtered, dmProfilesByChannel, nameFormat)
		dmChannels = filtered
		return nil
	})

	if isCRT {
		egB.Go(func() error {
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

	if err := egB.Wait(); err != nil {
		if appErr, ok := err.(*model.AppError); ok {
			return nil, appErr
		}
		return nil, model.NewAppError("GetExperienceSync", "app.sync.phase_b.error", nil, "", http.StatusInternalServerError).Wrap(err)
	}

	unreadByTeam := make(map[string]*model.TeamUnread, len(teamsUnread))
	for _, u := range teamsUnread {
		unreadByTeam[u.TeamId] = u
	}
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
			r.delta.Team = toInitialLoadTeam(t, unreadByTeam[teamID], isCRT)
		}
		teamDeltas = append(teamDeltas, r.delta)
		allChannelMembers = append(allChannelMembers, r.members...)
	}

	dmChannelItems := make([]*model.ChannelLoadItem, 0, len(dmChannels))
	for _, ch := range dmChannels {
		dmChannelItems = append(dmChannelItems, toChannelLoadItem(ch))
	}

	dmMemberItems := make([]*model.ChannelMemberLoadItem, 0)
	for i := range allChannelMembers {
		m := &allChannelMembers[i]
		if m.TeamName == "" && m.ChannelMember.LastUpdateAt > since {
			dmMemberItems = append(dmMemberItems, toChannelMemberLoadItem(m))
		}
	}

	// Roles — after Phase B, sequential (depends on allChannelMembers)
	roleNames := collectRoleNames(me, teamMembers, allChannelMembers)
	roles, rolesErr := a.GetRolesByNames(roleNames)
	if rolesErr != nil {
		return nil, model.NewAppError("GetExperienceSync", "app.sync.get_roles.app_error", nil, "", http.StatusInternalServerError).Wrap(rolesErr)
	}
	if since > 0 {
		filtered := roles[:0]
		for _, r := range roles {
			if r.UpdateAt > since {
				filtered = append(filtered, r)
			}
		}
		roles = filtered
	}

	// context-aware sections, parallel
	var (
		activeChannelResult *model.ExperienceSyncActiveChannel
		activeChannelPosts  *model.PostList
		activeThreadResult  *model.ExperienceSyncActiveThread
		activeThreadPosts   *model.PostList
		threadsDelta        *model.ExperienceSyncThreadsDelta
		threadParticipants  []*model.User
	)

	var egC errgroup.Group

	if scope.ActiveChannelID != "" {
		egC.Go(func() error {
			// Verify user has access to the channel before fetching posts.
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

			// Constrained groups: always send full list — association UpdateAt is on
			// GroupChannels table (not UserGroups), no delta query available for M3C.
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
		egC.Go(func() error {
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
		egC.Go(func() error {
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

	if err := egC.Wait(); err != nil {
		if appErr, ok := err.(*model.AppError); ok {
			return nil, appErr
		}
		return nil, model.NewAppError("GetExperienceSync", "app.sync.phase_c.error", nil, "", http.StatusInternalServerError).Wrap(err)
	}

	// deduplicate posts, resolve authors and @mentioned groups
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

	directChannelCounts := buildDirectChannelCounts(userID, allChannelMembers, dmProfilesByChannel, prefs, isCRT, dmThreadHasUnreads, dmThreadMentions, dmThreadUrgent)

	// Build per-team unreads for ALL teams (not just scoped ones) so the mobile
	// badge blob is accurate for teams not yet loaded in this session.
	teamsUnreads := make([]*model.SyncTeamUnread, 0, len(teams))
	for _, t := range teams {
		if _, isTombstoned := tombstonedTeamIDs[t.Id]; isTombstoned {
			continue
		}
		u := unreadByTeam[t.Id]
		tu := &model.SyncTeamUnread{TeamID: t.Id}
		if u != nil {
			tu.MentionCount = u.MentionCount
			tu.MentionCountRoot = u.MentionCountRoot
			tu.HasUnreads = u.MsgCount > 0 || u.MentionCount > 0
			tu.ThreadMentionCount = u.ThreadMentionCount
			tu.ThreadUrgentMentionCount = u.ThreadUrgentMentionCount
			tu.ThreadHasUnreads = u.ThreadCount > 0 || u.ThreadMentionCount > 0
			if isCRT {
				tu.HasUnreads = u.MsgCountRoot > 0 || u.MentionCountRoot > 0
			}
		}
		teamsUnreads = append(teamsUnreads, tu)
	}

	return &model.ExperienceSyncResponse{
		Config:         a.ClientConfig(),
		License:        a.Srv().GetSanitizedClientLicense(),
		Me:             me,
		RemovedTeamIDs: removedTeamIDs,
		TeamsUnreads:   teamsUnreads,
		Teams:          teamDeltas,
		DirectChannels: dmChannelItems,
		DirectChannelMembers: model.ChannelMemberLoadList{
			Members: dmMemberItems,
		},
		DirectChannelCounts:  directChannelCounts,
		Preferences:          prefs,
		PreferenceTombstones: prefTombstones,
		GroupMemberships:     toInitialLoadGroupMembershipList(groupMemberships),
		Roles:                toRoleLoadItems(roles),
		Posts:                allPosts,
		Authors:              authors,
		Groups:               mentionedGroups,
		ActiveChannel:        activeChannelResult,
		ActiveThread:         activeThreadResult,
		ThreadsDelta:         threadsDelta,
		Timestamp:            model.GetMillis(),
	}, nil
}

func (a *App) buildSyncTeamDelta(rctx request.CTX, userID, teamID string, since int64) (*model.ExperienceSyncTeamDelta, model.ChannelMembersWithTeamData, *model.AppError) {
	var (
		allChannels  model.ChannelList
		members      model.ChannelMembersWithTeamData
		removedChIDs []string
	)

	var eg errgroup.Group

	eg.Go(func() error {
		chans, appErr := a.GetChannelsForTeamForUser(rctx, teamID, userID, &model.ChannelSearchOpts{IncludeDeleted: since > 0})
		if appErr != nil {
			return appErr
		}
		filtered := make(model.ChannelList, 0, len(chans))
		for _, ch := range chans {
			if ch.TeamId == teamID && ch.UpdateAt > since {
				filtered = append(filtered, ch)
			}
		}
		allChannels = filtered
		return nil
	})

	eg.Go(func() error {
		var appErr *model.AppError
		members, appErr = a.GetChannelMembersWithTeamDataForUserWithPagination(rctx, userID, &model.ChannelMemberCursor{Page: 0, PerPage: 10000})
		if appErr != nil {
			return appErr
		}
		return nil
	})

	if since > 0 {
		eg.Go(func() error {
			ids, err := a.Srv().Store().ChannelMemberHistory().GetChannelsLeftInTeamSince(userID, teamID, since)
			if err != nil {
				return model.NewAppError("buildSyncTeamDelta", "app.sync.channel_history.error", nil, "", http.StatusInternalServerError).Wrap(err)
			}
			removedChIDs = ids
			return nil
		})
	}

	if err := eg.Wait(); err != nil {
		if appErr, ok := err.(*model.AppError); ok {
			return nil, nil, appErr
		}
		return nil, nil, model.NewAppError("buildSyncTeamDelta", "app.sync.team_delta.error", nil, "", http.StatusInternalServerError).Wrap(err)
	}

	chItems := make([]*model.ChannelLoadItem, 0, len(allChannels))
	for _, ch := range allChannels {
		chItems = append(chItems, toChannelLoadItem(ch))
	}

	channelIDSet := make(map[string]struct{}, len(allChannels))
	for _, ch := range allChannels {
		channelIDSet[ch.Id] = struct{}{}
	}

	memberItems := make([]*model.ChannelMemberLoadItem, 0, len(members))
	for i := range members {
		m := &members[i]
		if _, inTeam := channelIDSet[m.ChannelId]; inTeam && m.LastUpdateAt > since {
			memberItems = append(memberItems, toChannelMemberLoadItem(m))
		}
	}

	return &model.ExperienceSyncTeamDelta{
		TeamID:   teamID,
		Channels: chItems,
		ChannelMembers: model.ChannelMemberLoadList{
			Members:           memberItems,
			RemovedChannelIds: removedChIDs,
		},
	}, members, nil
}

func deduplicateSyncPosts(chPosts, thPosts *model.PostList) ([]*model.Post, []string, []string) {
	seen := make(map[string]struct{})
	var merged []*model.Post

	addPost := func(p *model.Post) {
		if _, ok := seen[p.Id]; !ok {
			seen[p.Id] = struct{}{}
			merged = append(merged, p)
		}
	}

	var chOrder, thOrder []string

	if chPosts != nil {
		for _, id := range chPosts.Order {
			if p, ok := chPosts.Posts[id]; ok {
				addPost(p)
				if p.DeleteAt == 0 {
					chOrder = append(chOrder, id)
				}
			}
		}
	}

	if thPosts != nil {
		for _, id := range thPosts.Order {
			if p, ok := thPosts.Posts[id]; ok {
				addPost(p)
				if p.DeleteAt == 0 {
					thOrder = append(thOrder, id)
				}
			}
		}
	}

	return merged, chOrder, thOrder
}

func (a *App) resolveSyncAuthorsAndGroups(rctx request.CTX, posts []*model.Post, threadParticipants, dmPartnerProfiles []*model.User) ([]*model.User, []*model.Group) {
	seenAuthors := make(map[string]*model.User)
	mentionNames := make(map[string]struct{})

	for _, u := range threadParticipants {
		if u != nil {
			seenAuthors[u.Id] = u
		}
	}
	for _, u := range dmPartnerProfiles {
		if u != nil {
			seenAuthors[u.Id] = u
		}
	}

	userIDs := make(map[string]struct{})
	for _, p := range posts {
		if p.UserId != "" {
			userIDs[p.UserId] = struct{}{}
		}
		extractSyncAtMentions(p, mentionNames)
	}

	ids := make([]string, 0, len(userIDs))
	for id := range userIDs {
		if _, ok := seenAuthors[id]; !ok {
			ids = append(ids, id)
		}
	}
	if len(ids) > 0 {
		profiles, err := a.Srv().Store().User().GetProfileByIds(rctx, ids, nil, false)
		if err == nil {
			for _, u := range profiles {
				seenAuthors[u.Id] = u
			}
		}
	}

	authors := make([]*model.User, 0, len(seenAuthors))
	authorNames := make(map[string]struct{}, len(seenAuthors))
	for _, u := range seenAuthors {
		authors = append(authors, u)
		authorNames[u.Username] = struct{}{}
	}

	groupNames := make([]string, 0)
	for name := range mentionNames {
		if _, isUser := authorNames[name]; !isUser {
			groupNames = append(groupNames, name)
		}
	}

	var groups []*model.Group
	if len(groupNames) > 0 {
		fetchedGroups, err := a.Srv().Store().Group().GetByNames(groupNames, model.GroupSearchOpts{})
		if err == nil {
			groups = fetchedGroups
		}
	}

	return authors, groups
}

func extractSyncAtMentions(post *model.Post, out map[string]struct{}) {
	addMentions := func(s string) {
		if !strings.Contains(s, "@") {
			return
		}
		for _, m := range syncAtMentionRegexp.FindAllStringSubmatch(s, -1) {
			name := strings.ToLower(m[1])
			if _, special := syncSpecialMentions[name]; !special {
				out[name] = struct{}{}
			}
		}
	}

	addMentions(post.Message)
	for _, att := range post.Attachments() {
		addMentions(att.Title)
		addMentions(att.Text)
		addMentions(att.Pretext)
		for _, f := range att.Fields {
			if v, ok := f.Value.(string); ok {
				addMentions(v)
			}
		}
	}
}

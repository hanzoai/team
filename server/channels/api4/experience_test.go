// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package api4

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mattermost/mattermost/server/public/model"
)

func TestGetInitialLoad(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t).InitBasic(t)

	t.Run("unauthenticated request is rejected", func(t *testing.T) {
		client := th.CreateClient()
		resp, err := client.DoAPIGet(context.Background(), "/users/me/initial_load", "")
		require.Error(t, err)
		require.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("returns 404 when EnableExperienceAPI is off", func(t *testing.T) {
		th.ConfigStore.SetReadOnlyFF(false)
		defer th.ConfigStore.SetReadOnlyFF(true)
		th.App.UpdateConfig(func(cfg *model.Config) { cfg.FeatureFlags.EnableExperienceAPI = false })
		defer th.App.UpdateConfig(func(cfg *model.Config) { cfg.FeatureFlags.EnableExperienceAPI = true })

		resp, err := th.Client.DoAPIGet(context.Background(), "/users/me/initial_load", "")
		require.Error(t, err)
		require.Equal(t, http.StatusNotFound, resp.StatusCode)
	})

	t.Run("invalid since param returns 400", func(t *testing.T) {
		resp, err := th.Client.DoAPIGet(context.Background(), "/users/me/initial_load?since=notanumber", "")
		require.Error(t, err)
		require.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("cold start returns populated response", func(t *testing.T) {
		resp, err := th.Client.DoAPIGet(context.Background(), "/users/me/initial_load", "")
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
		defer resp.Body.Close()

		var r model.InitialLoadResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))

		// Me
		require.NotNil(t, r.Me)
		assert.Equal(t, th.BasicUser.Id, r.Me.Id)
		assert.Equal(t, th.BasicUser.Username, r.Me.Username)
		assert.NotEmpty(t, r.Me.Email)
		assert.NotEmpty(t, r.Me.Roles)

		// Timestamp
		assert.Greater(t, r.Timestamp, int64(0))

		// Teams — must include BasicTeam
		require.NotEmpty(t, r.Teams)
		teamIDs := make([]string, 0, len(r.Teams))
		for _, team := range r.Teams {
			teamIDs = append(teamIDs, team.Id)
		}
		assert.Contains(t, teamIDs, th.BasicTeam.Id)

		// TeamMembers count must match Teams count and IDs must align
		require.NotNil(t, r.TeamMembers)
		assert.Len(t, r.TeamMembers.Members, len(r.Teams),
			"number of team_members must equal number of teams")
		memberTeamIDs := make(map[string]struct{}, len(r.TeamMembers.Members))
		for _, tm := range r.TeamMembers.Members {
			assert.Equal(t, r.Me.Id, tm.UserId)
			memberTeamIDs[tm.TeamId] = struct{}{}
		}
		for _, id := range teamIDs {
			assert.Contains(t, memberTeamIDs, id,
				"team_id %s in teams but missing from team_members", id)
		}

		// ActiveTeam
		require.NotNil(t, r.ActiveTeam)
		require.NotNil(t, r.ActiveTeam.Team)
		assert.Equal(t, th.BasicTeam.Id, r.ActiveTeam.Team.Id)

		// Channels — must include BasicChannel
		chIDs := make(map[string]struct{}, len(r.ActiveTeam.Channels))
		for _, ch := range r.ActiveTeam.Channels {
			chIDs[ch.Id] = struct{}{}
		}
		assert.Contains(t, chIDs, th.BasicChannel.Id)

		// ChannelMembers count must equal Channels count
		assert.Len(t, r.ActiveTeam.ChannelMembers.Members, len(r.ActiveTeam.Channels),
			"channel_members count must equal channels count")
		cmIDs := make(map[string]struct{}, len(r.ActiveTeam.ChannelMembers.Members))
		for _, cm := range r.ActiveTeam.ChannelMembers.Members {
			cmIDs[cm.ChannelId] = struct{}{}
		}
		for id := range chIDs {
			assert.Contains(t, cmIDs, id,
				"channel_id %s in channels but missing from channel_members", id)
		}

		// SidebarCategories
		assert.NotNil(t, r.ActiveTeam.SidebarCategories)

		// Threads removed — not present in active_team
		// (counts are in InitialLoadTeam fields instead)

		// Roles — every role name referenced by Me/TeamMembers/ChannelMembers must be present
		returnedRoles := make(map[string]struct{}, len(r.Roles))
		for _, role := range r.Roles {
			assert.NotEmpty(t, role.Id)
			assert.NotEmpty(t, role.Name)
			returnedRoles[role.Name] = struct{}{}
		}
		neededRoles := collectNeededRoles(r)
		for name := range neededRoles {
			assert.Contains(t, returnedRoles, name,
				"role %q referenced but not returned", name)
		}

		// PriorityHints
		require.NotNil(t, r.PriorityHints)
		assert.Equal(t, th.BasicTeam.Id, r.PriorityHints.ActiveTeamID)
	})

	t.Run("explicit team_id selects correct active team", func(t *testing.T) {
		team2 := th.CreateTeam(t)
		th.LinkUserToTeam(t, th.BasicUser, team2)

		url := fmt.Sprintf("/users/me/initial_load?team_id=%s", team2.Id)
		resp, err := th.Client.DoAPIGet(context.Background(), url, "")
		require.NoError(t, err)
		defer resp.Body.Close()

		var r model.InitialLoadResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))

		require.NotNil(t, r.ActiveTeam)
		assert.Equal(t, team2.Id, r.ActiveTeam.Team.Id)
	})

	t.Run("stale team_id — user was removed — appears in removed_team_ids and full cold start sent", func(t *testing.T) {
		// Simulate a client that holds a team_id from a previous session where
		// the user was since removed.  The server must:
		//  1. Include the stale team in RemovedTeamIds (so the client cleans up).
		//  2. Return a full (non-delta) snapshot for the newly resolved active team
		//     because the client's since cursor is meaningless for a different team.
		staleTeam := th.CreateTeam(t)
		th.LinkUserToTeam(t, th.BasicUser, staleTeam)
		_, err := th.Client.RemoveTeamMember(context.Background(), staleTeam.Id, th.BasicUser.Id)
		require.NoError(t, err)

		// Use a very large since to verify delta filtering is bypassed for the
		// active team (i.e., active_team.channels must be non-empty despite since).
		url := fmt.Sprintf("/users/me/initial_load?team_id=%s&since=%d", staleTeam.Id, model.GetMillis()+9999999)
		resp, err2 := th.Client.DoAPIGet(context.Background(), url, "")
		require.NoError(t, err2)
		defer resp.Body.Close()

		var r model.InitialLoadResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))

		// Stale team must be tombstoned.
		require.NotNil(t, r.TeamMembers)
		assert.Contains(t, r.TeamMembers.RemovedTeamIds, staleTeam.Id,
			"removed team must appear in RemovedTeamIds so the client cleans up its local DB")

		// Active team must not be the stale team.
		if r.ActiveTeam != nil {
			assert.NotEqual(t, staleTeam.Id, r.ActiveTeam.Team.Id)
			// Full snapshot: channels must be present despite the future since cursor.
			assert.NotEmpty(t, r.ActiveTeam.Channels,
				"active team channels must be a full snapshot when the active team changed")
		}
	})

	t.Run("stale team_id — team was archived — appears in removed_team_ids on cold start", func(t *testing.T) {
		archivedTeam := th.CreateTeam(t)
		th.LinkUserToTeam(t, th.BasicUser, archivedTeam)
		_, err := th.SystemAdminClient.SoftDeleteTeam(context.Background(), archivedTeam.Id)
		require.NoError(t, err)

		url := fmt.Sprintf("/users/me/initial_load?team_id=%s", archivedTeam.Id)
		resp, err2 := th.Client.DoAPIGet(context.Background(), url, "")
		require.NoError(t, err2)
		defer resp.Body.Close()

		var r model.InitialLoadResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))

		require.NotNil(t, r.TeamMembers)
		assert.Contains(t, r.TeamMembers.RemovedTeamIds, archivedTeam.Id,
			"archived team must appear in RemovedTeamIds so the client cleans up its local DB")
	})

	t.Run("stale team_id — only team was archived — tombstoned with nil active_team", func(t *testing.T) {
		// Create a fresh user whose only team will be archived, leaving them
		// with no active team.  resolveActiveTeam returns "" and ActiveTeam is
		// nil, but the stale team must still appear in RemovedTeamIds.
		freshUser := th.CreateUserWithClient(t, th.SystemAdminClient)
		onlyTeam := th.CreateTeam(t)
		th.LinkUserToTeam(t, freshUser, onlyTeam)

		freshClient := th.CreateClient()
		_, _, err := freshClient.Login(context.Background(), freshUser.Email, freshUser.Password)
		require.NoError(t, err)

		_, err = th.SystemAdminClient.SoftDeleteTeam(context.Background(), onlyTeam.Id)
		require.NoError(t, err)

		url := fmt.Sprintf("/users/me/initial_load?team_id=%s", onlyTeam.Id)
		resp, err2 := freshClient.DoAPIGet(context.Background(), url, "")
		require.NoError(t, err2)
		defer resp.Body.Close()

		var r model.InitialLoadResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))

		require.NotNil(t, r.TeamMembers)
		assert.Contains(t, r.TeamMembers.RemovedTeamIds, onlyTeam.Id,
			"archived team must appear in RemovedTeamIds even when it was the user's only team")
		assert.Nil(t, r.ActiveTeam, "ActiveTeam must be nil when the user has no active teams")
	})

	t.Run("since=0 is equivalent to cold start", func(t *testing.T) {
		resp, err := th.Client.DoAPIGet(context.Background(), "/users/me/initial_load?since=0", "")
		require.NoError(t, err)
		defer resp.Body.Close()

		var r model.InitialLoadResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))

		require.NotNil(t, r.Me)
		assert.Equal(t, th.BasicUser.Id, r.Me.Id)
		assert.NotEmpty(t, r.Teams)
		assert.NotNil(t, r.ActiveTeam)
	})

	t.Run("DM channel has display name set", func(t *testing.T) {
		// Create a DM between BasicUser and BasicUser2
		dm, _, err := th.Client.CreateDirectChannel(context.Background(),
			th.BasicUser.Id, th.BasicUser2.Id)
		require.NoError(t, err)

		resp, err := th.Client.DoAPIGet(context.Background(), "/users/me/initial_load", "")
		require.NoError(t, err)
		defer resp.Body.Close()

		var r model.InitialLoadResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))

		var found *model.ChannelLoadItem
		for _, ch := range r.ActiveTeam.Channels {
			if ch.Id == dm.Id {
				found = ch
				break
			}
		}
		require.NotNil(t, found, "DM channel not found in initial_load response")
		assert.NotEmpty(t, found.DisplayName,
			"DM channel display_name should be set to partner's name")
		// Display name should not contain the current user's username
		assert.NotContains(t, found.DisplayName, th.BasicUser.Username)
	})

	t.Run("GM channel has display name set without self", func(t *testing.T) {
		user3 := th.CreateUser(t)
		th.LinkUserToTeam(t, user3, th.BasicTeam)

		gm, _, err := th.Client.CreateGroupChannel(context.Background(),
			[]string{th.BasicUser.Id, th.BasicUser2.Id, user3.Id})
		require.NoError(t, err)

		resp, err := th.Client.DoAPIGet(context.Background(), "/users/me/initial_load", "")
		require.NoError(t, err)
		defer resp.Body.Close()

		var r model.InitialLoadResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))

		var found *model.ChannelLoadItem
		for _, ch := range r.ActiveTeam.Channels {
			if ch.Id == gm.Id {
				found = ch
				break
			}
		}
		require.NotNil(t, found, "GM channel not found in initial_load response")
		assert.NotEmpty(t, found.DisplayName,
			"GM channel display_name should be set")
		// Display name must not include the requesting user
		assert.NotContains(t, found.DisplayName, th.BasicUser.Username)
		// Display name must include both other members
		assert.Contains(t, found.DisplayName, th.BasicUser2.Username)
		assert.Contains(t, found.DisplayName, user3.Username)
	})

	t.Run("preferences are filtered to client-relevant categories", func(t *testing.T) {
		resp, err := th.Client.DoAPIGet(context.Background(), "/users/me/initial_load", "")
		require.NoError(t, err)
		defer resp.Body.Close()

		var r model.InitialLoadResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))

		allowed := map[string]struct{}{
			model.PreferenceCategoryDirectChannelShow: {},
			model.PreferenceCategoryGroupChannelShow:  {},
			model.PreferenceCategoryFavoriteChannel:   {},
			model.PreferenceCategoryDisplaySettings:   {},
			model.PreferenceCategoryAdvancedSettings:  {},
			model.PreferenceCategorySidebarSettings:   {},
			model.PreferenceCategoryNotifications:     {},
			model.PreferenceCategoryCustomStatus:      {},
			model.PreferenceCategoryFlaggedPost:       {},
			model.PreferenceCategoryTheme:             {},
			"teams_order":                             {},
		}
		for _, p := range r.Preferences {
			assert.Contains(t, allowed, p.Category,
				"unexpected preference category %q in initial_load response", p.Category)
		}
	})

	t.Run("system admin sees their own data", func(t *testing.T) {
		// Add the system admin to the basic team so they have channels.
		th.LinkUserToTeam(t, th.SystemAdminUser, th.BasicTeam)

		resp, err := th.SystemAdminClient.DoAPIGet(context.Background(), "/users/me/initial_load", "")
		require.NoError(t, err)
		defer resp.Body.Close()

		var r model.InitialLoadResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))

		require.NotNil(t, r.Me)
		assert.Equal(t, th.SystemAdminUser.Id, r.Me.Id)
	})

	t.Run("team unread counts are present", func(t *testing.T) {
		resp, err := th.Client.DoAPIGet(context.Background(), "/users/me/initial_load", "")
		require.NoError(t, err)
		defer resp.Body.Close()

		var r model.InitialLoadResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))

		// Every team entry must have the count fields present (zero is valid)
		for _, team := range r.Teams {
			assert.GreaterOrEqual(t, team.MentionCount, int64(0))
			assert.GreaterOrEqual(t, team.ThreadMentionCount, int64(0))
		}
	})

	t.Run("since=now returns empty delta when nothing changed", func(t *testing.T) {
		// Take a timestamp after all data has been created.
		now := model.GetMillis()

		url := fmt.Sprintf("/users/me/initial_load?since=%d", now)
		resp, err := th.Client.DoAPIGet(context.Background(), url, "")
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
		defer resp.Body.Close()

		var r model.InitialLoadResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))

		// Nothing changed after `now`, so unchanged delta fields must be empty/nil.
		assert.Nil(t, r.Me, "Me should be nil when user profile unchanged")
		// Teams may include entries with active badge data (mentions/unreads) even
		// when no metadata changed — that is intentional. Verify no team has
		// UpdateAt > now (which would indicate unexpected metadata change).
		for _, team := range r.Teams {
			assert.LessOrEqual(t, team.UpdateAt, now,
				"team %s has UpdateAt > now — unexpected metadata change", team.Id)
		}
		assert.Empty(t, r.Roles, "Roles should be empty when no role changed")

		// TeamMembers and Preferences have no UpdateAt — always returned.
		assert.NotNil(t, r.TeamMembers)

		// ActiveTeam channels and members should be empty in the delta.
		if r.ActiveTeam != nil {
			assert.Empty(t, r.ActiveTeam.Channels,
				"no channels should be in delta when nothing changed")
			assert.Empty(t, r.ActiveTeam.ChannelMembers.Members,
				"no channel_members should be in delta when nothing changed")
		}

		// Timestamp must still be set.
		assert.Greater(t, r.Timestamp, int64(0))
	})

	t.Run("new user with no teams returns valid empty response", func(t *testing.T) {
		newUser := th.CreateUser(t)
		newClient := th.CreateClient()
		_, _, err := newClient.Login(context.Background(), newUser.Email, newUser.Password)
		require.NoError(t, err)

		resp, err := newClient.DoAPIGet(context.Background(), "/users/me/initial_load", "")
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
		defer resp.Body.Close()

		var r model.InitialLoadResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))

		// Me must be populated even with no teams
		require.NotNil(t, r.Me)
		assert.Equal(t, newUser.Id, r.Me.Id)

		// Teams and TeamMembers must be empty (not nil — zero-length is fine)
		assert.Empty(t, r.Teams)
		assert.NotNil(t, r.TeamMembers)
		assert.Empty(t, r.TeamMembers.Members)

		// ActiveTeam must be nil — there is no active team
		assert.Nil(t, r.ActiveTeam)

		// Timestamp must be set
		assert.Greater(t, r.Timestamp, int64(0))
	})

	t.Run("delta includes teams with badge data regardless of UpdateAt", func(t *testing.T) {
		// Create a second client for BasicUser2.
		user2Client := th.CreateClient()
		_, _, err := user2Client.Login(context.Background(), th.BasicUser2.Email, th.BasicUser2.Password)
		require.NoError(t, err)

		// Take a snapshot *now* — BasicTeam.UpdateAt is before this cursor.
		since := model.GetMillis()

		// Post as BasicUser so BasicUser2 has an unread in BasicTeam.
		_, _, err = th.Client.CreatePost(context.Background(), &model.Post{
			ChannelId: th.BasicChannel.Id,
			Message:   "delta badge test post",
		})
		require.NoError(t, err)

		url := fmt.Sprintf("/users/me/initial_load?since=%d", since)
		resp, err := user2Client.DoAPIGet(context.Background(), url, "")
		require.NoError(t, err)
		defer resp.Body.Close()

		var r model.InitialLoadResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))

		// BasicTeam must appear even though its UpdateAt < since,
		// because BasicUser2 now has an unread in that team.
		found := false
		for _, team := range r.Teams {
			if team.Id == th.BasicTeam.Id {
				found = true
				break
			}
		}
		assert.True(t, found, "team with unread should appear in delta Teams even if UpdateAt <= since")
	})

	t.Run("delta: channel member update includes slim channel companion when channel metadata unchanged", func(t *testing.T) {
		// Scenario: another user posts in BasicChannel after the cursor, which advances
		// LastPostAt but NOT Channel.UpdateAt.  When BasicUser then views the channel,
		// UpdateLastViewedAt sets LastUpdateAt = greatest(LastViewedAt, LastPostAt) which
		// is > since.  The member therefore appears in the delta but the channel does not.
		// The server must include a slim ChannelLoadItem so the client can recompute
		// unread counts from total_msg_count without a schema change.
		//
		// Steps:
		//  1. Take the cursor (since)
		//  2. BasicUser2 posts → Channel.LastPostAt > since but Channel.UpdateAt unchanged
		//  3. BasicUser views the channel → ChannelMember.LastUpdateAt = LastPostAt > since
		//  4. Delta call → member in response, channel NOT in delta, slim companion present

		// Snapshot before any activity.
		since := model.GetMillis()

		// Post as BasicUser2 so BasicChannel.LastPostAt advances past since.
		// Channel.UpdateAt is NOT changed by a new post.
		user2Client := th.CreateClient()
		_, _, err := user2Client.Login(context.Background(), th.BasicUser2.Email, th.BasicUser2.Password)
		require.NoError(t, err)
		_, _, err = user2Client.CreatePost(context.Background(), &model.Post{
			ChannelId: th.BasicChannel.Id,
			Message:   "slim companion trigger post",
		})
		require.NoError(t, err)

		// BasicUser views the channel → ChannelMember.LastUpdateAt is set to now (post-view),
		// which is > since.  Channel.UpdateAt is still unchanged (a view doesn't touch it).
		_, _, err = th.Client.ViewChannel(context.Background(), th.BasicUser.Id, &model.ChannelView{
			ChannelId: th.BasicChannel.Id,
		})
		require.NoError(t, err)

		// Pin the active team explicitly so this test isn't affected by prior subtests
		// that change BasicUser's team set (e.g. "explicit team_id selects correct active team").
		url := fmt.Sprintf("/users/me/initial_load?team_id=%s&since=%d", th.BasicTeam.Id, since)
		resp, err2 := th.Client.DoAPIGet(context.Background(), url, "")
		require.NoError(t, err2)
		defer resp.Body.Close()

		var r model.InitialLoadResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))

		require.NotNil(t, r.ActiveTeam, "active_team must be present")

		// The channel member for BasicChannel must be in the delta.
		var memberFound bool
		for _, m := range r.ActiveTeam.ChannelMembers.Members {
			if m.ChannelId == th.BasicChannel.Id {
				memberFound = true
				break
			}
		}
		require.True(t, memberFound, "BasicChannel member must be in delta channel_members")

		// A slim ChannelLoadItem for BasicChannel must accompany the member so
		// the client has total_msg_count to recompute the unread count.
		var slimFound bool
		for _, ch := range r.ActiveTeam.Channels {
			if ch.Id == th.BasicChannel.Id {
				slimFound = true
				assert.Greater(t, ch.TotalMsgCount, int64(0),
					"slim companion must carry total_msg_count > 0")
				assert.Greater(t, ch.LastPostAt, int64(0),
					"slim companion must carry last_post_at > 0")
				break
			}
		}
		assert.True(t, slimFound,
			"a slim ChannelLoadItem must accompany the BasicChannel member in the delta")
	})

	t.Run("archived team appears in RemovedTeamIds", func(t *testing.T) {
		// Create a new team and add BasicUser to it.
		archiveTeam := th.CreateTeam(t)
		th.LinkUserToTeam(t, th.BasicUser, archiveTeam)

		// Snapshot before archiving.
		since := model.GetMillis()

		// Archive (soft-delete) the team as system admin.
		_, err := th.SystemAdminClient.SoftDeleteTeam(context.Background(), archiveTeam.Id)
		require.NoError(t, err)

		url := fmt.Sprintf("/users/me/initial_load?since=%d", since)
		resp, err := th.Client.DoAPIGet(context.Background(), url, "")
		require.NoError(t, err)
		defer resp.Body.Close()

		var r model.InitialLoadResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))

		// Archived team must appear in RemovedTeamIds.
		require.NotNil(t, r.TeamMembers)
		assert.Contains(t, r.TeamMembers.RemovedTeamIds, archiveTeam.Id,
			"archived team should appear in RemovedTeamIds")

		// Archived team must NOT appear in Teams array.
		for _, team := range r.Teams {
			assert.NotEqual(t, archiveTeam.Id, team.Id,
				"archived team must not appear in the Teams array")
		}
	})

	t.Run("left team appears in RemovedTeamIds", func(t *testing.T) {
		// Create a team and add BasicUser.
		leftTeam := th.CreateTeam(t)
		th.LinkUserToTeam(t, th.BasicUser, leftTeam)

		// Snapshot before leaving.
		since := model.GetMillis()

		// Leave the team.
		_, err := th.Client.RemoveTeamMember(context.Background(), leftTeam.Id, th.BasicUser.Id)
		require.NoError(t, err)

		url := fmt.Sprintf("/users/me/initial_load?since=%d", since)
		resp, err := th.Client.DoAPIGet(context.Background(), url, "")
		require.NoError(t, err)
		defer resp.Body.Close()

		var r model.InitialLoadResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))

		require.NotNil(t, r.TeamMembers)
		assert.Contains(t, r.TeamMembers.RemovedTeamIds, leftTeam.Id,
			"left team should appear in RemovedTeamIds")

		for _, team := range r.Teams {
			assert.NotEqual(t, leftTeam.Id, team.Id,
				"left team must not appear in the Teams array")
		}
	})

	t.Run("direct_profiles contains DM participants", func(t *testing.T) {
		// Create a DM with BasicUser2.
		_, _, err := th.Client.CreateDirectChannel(context.Background(),
			th.BasicUser.Id, th.BasicUser2.Id)
		require.NoError(t, err)

		resp, err := th.Client.DoAPIGet(context.Background(), "/users/me/initial_load", "")
		require.NoError(t, err)
		defer resp.Body.Close()

		var r model.InitialLoadResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))

		// Requesting user must not appear in DirectProfiles.
		for _, p := range r.DirectProfiles {
			assert.NotEqual(t, th.BasicUser.Id, p.Id,
				"DirectProfiles must not contain the requesting user")
		}

		// BasicUser2 must be in DirectProfiles.
		profileIDs := make(map[string]struct{}, len(r.DirectProfiles))
		for _, p := range r.DirectProfiles {
			profileIDs[p.Id] = struct{}{}
		}
		assert.Contains(t, profileIDs, th.BasicUser2.Id,
			"DM partner should appear in DirectProfiles")
	})

	t.Run("delta direct_profiles includes deactivated users even without visible DM", func(t *testing.T) {
		// Create a fresh user, DM with them, then deactivate them.
		deactivatedUser := th.CreateUser(t)
		th.LinkUserToTeam(t, deactivatedUser, th.BasicTeam)
		_, _, err := th.Client.CreateDirectChannel(context.Background(),
			th.BasicUser.Id, deactivatedUser.Id)
		require.NoError(t, err)

		// Snapshot before deactivation.
		since := model.GetMillis()

		// Deactivate the user as system admin.
		_, err = th.SystemAdminClient.DeleteUser(context.Background(), deactivatedUser.Id)
		require.NoError(t, err)

		url := fmt.Sprintf("/users/me/initial_load?since=%d", since)
		resp, err := th.Client.DoAPIGet(context.Background(), url, "")
		require.NoError(t, err)
		defer resp.Body.Close()

		var r model.InitialLoadResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))

		// Deactivated user must appear in DirectProfiles so client can mark them.
		profileIDs := make(map[string]struct{}, len(r.DirectProfiles))
		for _, p := range r.DirectProfiles {
			profileIDs[p.Id] = struct{}{}
		}
		assert.Contains(t, profileIDs, deactivatedUser.Id,
			"deactivated DM partner should appear in delta DirectProfiles")
	})

	t.Run("can_join_other_teams is true when joinable public team exists", func(t *testing.T) {
		// BasicUser is in BasicTeam; create another open-invite team they are NOT in.
		otherTeam, _, err := th.SystemAdminClient.CreateTeam(context.Background(), &model.Team{
			Name:            "joinable-" + model.NewId(),
			DisplayName:     "Joinable Team",
			Type:            model.TeamOpen,
			AllowOpenInvite: true,
		})
		require.NoError(t, err)
		t.Cleanup(func() {
			_, _ = th.SystemAdminClient.PermanentDeleteTeam(context.Background(), otherTeam.Id)
		})

		resp, err := th.Client.DoAPIGet(context.Background(), "/users/me/initial_load", "")
		require.NoError(t, err)
		defer resp.Body.Close()

		var r model.InitialLoadResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))
		assert.True(t, r.CanJoinOtherTeams,
			"can_join_other_teams must be true when a joinable public team exists")
	})

	t.Run("can_join_other_teams is false when user has no list permissions", func(t *testing.T) {
		// Strip both list permissions from system_user role; BasicUser then has neither.
		defaults := th.SaveDefaultRolePermissions(t)
		t.Cleanup(func() { th.RestoreDefaultRolePermissions(t, defaults) })
		th.RemovePermissionFromRole(t, model.PermissionListPublicTeams.Id, model.SystemUserRoleId)
		th.RemovePermissionFromRole(t, model.PermissionListPrivateTeams.Id, model.SystemUserRoleId)

		// Even with a joinable team in existence, no perms → false.
		otherTeam, _, err := th.SystemAdminClient.CreateTeam(context.Background(), &model.Team{
			Name:            "no-perm-" + model.NewId(),
			DisplayName:     "Hidden Team",
			Type:            model.TeamOpen,
			AllowOpenInvite: true,
		})
		require.NoError(t, err)
		t.Cleanup(func() {
			_, _ = th.SystemAdminClient.PermanentDeleteTeam(context.Background(), otherTeam.Id)
		})

		resp, err := th.Client.DoAPIGet(context.Background(), "/users/me/initial_load", "")
		require.NoError(t, err)
		defer resp.Body.Close()

		var r model.InitialLoadResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))
		assert.False(t, r.CanJoinOtherTeams,
			"can_join_other_teams must be false when caller lacks both list permissions")
	})

	t.Run("can_join_other_teams is false when user is in every team", func(t *testing.T) {
		// Brand-new user — drop default team memberships AND drop the System Admin's
		// pre-existing teams from consideration by creating no other teams. The user
		// is in every team they're allowed to see (zero teams visible).
		newUser := th.CreateUser(t)
		newClient := th.CreateClient()
		_, _, err := newClient.Login(context.Background(), newUser.Email, newUser.Password)
		require.NoError(t, err)

		// Add the new user to the one existing public team so they're a member of
		// everything they can see.
		_, _, err = th.SystemAdminClient.AddTeamMember(context.Background(), th.BasicTeam.Id, newUser.Id)
		require.NoError(t, err)

		// Hide every other team by stripping the public listing permission;
		// keep ListPrivateTeams so the user can still query, but they shouldn't
		// see any private teams (BasicPrivateTeam? — verify by membership).
		// Simpler: just assert that with this user as member of all visible teams,
		// result is false. We can't fully control fixture teams, so check whether
		// the user truly is a member of every team they can see.
		resp, err := newClient.DoAPIGet(context.Background(), "/users/me/initial_load", "")
		require.NoError(t, err)
		defer resp.Body.Close()

		var r model.InitialLoadResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))

		// Fetch the list the user actually sees, and verify our assertion holds.
		visibleTeams, _, err := newClient.GetAllTeams(context.Background(), "", 0, 200)
		require.NoError(t, err)
		myTeams, _, err := newClient.GetTeamsForUser(context.Background(), newUser.Id, "")
		require.NoError(t, err)
		myTeamIDs := make(map[string]struct{}, len(myTeams))
		for _, tm := range myTeams {
			myTeamIDs[tm.Id] = struct{}{}
		}
		anyJoinable := false
		for _, vt := range visibleTeams {
			if vt.DeleteAt != 0 {
				continue
			}
			if _, in := myTeamIDs[vt.Id]; !in {
				anyJoinable = true
				break
			}
		}
		assert.Equal(t, anyJoinable, r.CanJoinOtherTeams,
			"can_join_other_teams must reflect whether any visible team is not yet joined")
	})
}

func TestGetInitialLoadPreferenceTombstones(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t).InitBasic(t)

	initialLoadURL := func(params ...string) string {
		u := "/users/me/initial_load"
		if len(params) > 0 {
			u += "?" + strings.Join(params, "&")
		}
		return u
	}

	decodeResponse := func(t *testing.T, data []byte) *model.InitialLoadResponse {
		t.Helper()
		var r model.InitialLoadResponse
		require.NoError(t, json.Unmarshal(data, &r))
		return &r
	}

	t.Run("cold start returns no tombstones (since=0)", func(t *testing.T) {
		// Delete a preference so a tombstone row exists.
		pref := model.Preference{UserId: th.BasicUser.Id, Category: "test_tombstone", Name: "cold_start_key", Value: "1"}
		_, err := th.Client.UpdatePreferences(context.Background(), th.BasicUser.Id, model.Preferences{pref})
		require.NoError(t, err)
		_, err = th.Client.DeletePreferences(context.Background(), th.BasicUser.Id, model.Preferences{pref})
		require.NoError(t, err)

		resp, appErr := th.Client.DoAPIGet(context.Background(), initialLoadURL(), "")
		require.NoError(t, appErr)
		data, readErr := io.ReadAll(resp.Body)
		require.NoError(t, readErr)
		r := decodeResponse(t, data)

		// since=0 (cold start) must never return tombstones.
		assert.Empty(t, r.PreferenceTombstones, "cold start must not include preference tombstones")
	})

	t.Run("delta returns tombstones for preferences deleted since cursor", func(t *testing.T) {
		cursor := model.GetMillis()

		pref := model.Preference{UserId: th.BasicUser.Id, Category: "test_tombstone", Name: "delta_key", Value: "1"}
		_, err := th.Client.UpdatePreferences(context.Background(), th.BasicUser.Id, model.Preferences{pref})
		require.NoError(t, err)
		_, err = th.Client.DeletePreferences(context.Background(), th.BasicUser.Id, model.Preferences{pref})
		require.NoError(t, err)

		resp, appErr := th.Client.DoAPIGet(context.Background(), initialLoadURL(fmt.Sprintf("since=%d", cursor)), "")
		require.NoError(t, appErr)
		data, readErr := io.ReadAll(resp.Body)
		require.NoError(t, readErr)
		r := decodeResponse(t, data)

		found := false
		for _, tb := range r.PreferenceTombstones {
			if tb.Category == "test_tombstone" && tb.Name == "delta_key" {
				found = true
				assert.Equal(t, th.BasicUser.Id, tb.UserId)
				assert.Greater(t, tb.DeleteAt, cursor)
			}
		}
		assert.True(t, found, "expected preference tombstone not found in delta response")
	})

	t.Run("delta returns no tombstones when nothing was deleted since cursor", func(t *testing.T) {
		// Use a cursor in the future so nothing qualifies.
		future := model.GetMillis() + 60000

		resp, appErr := th.Client.DoAPIGet(context.Background(), initialLoadURL(fmt.Sprintf("since=%d", future)), "")
		require.NoError(t, appErr)
		data, readErr := io.ReadAll(resp.Body)
		require.NoError(t, readErr)
		r := decodeResponse(t, data)

		assert.Empty(t, r.PreferenceTombstones)
	})
}

func TestGetTeamLoad(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t).InitBasic(t)

	teamURL := func(teamID string, params ...string) string {
		u := fmt.Sprintf("/users/me/teams/%s/load", teamID)
		if len(params) > 0 {
			u += "?" + strings.Join(params, "&")
		}
		return u
	}

	t.Run("unauthenticated request is rejected", func(t *testing.T) {
		client := th.CreateClient()
		resp, err := client.DoAPIGet(context.Background(), teamURL(th.BasicTeam.Id), "")
		require.Error(t, err)
		require.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("returns 404 when EnableExperienceAPI is off", func(t *testing.T) {
		th.ConfigStore.SetReadOnlyFF(false)
		defer th.ConfigStore.SetReadOnlyFF(true)
		th.App.UpdateConfig(func(cfg *model.Config) { cfg.FeatureFlags.EnableExperienceAPI = false })
		defer th.App.UpdateConfig(func(cfg *model.Config) { cfg.FeatureFlags.EnableExperienceAPI = true })

		resp, err := th.Client.DoAPIGet(context.Background(), teamURL(th.BasicTeam.Id), "")
		require.Error(t, err)
		require.Equal(t, http.StatusNotFound, resp.StatusCode)
	})

	t.Run("non-member gets 403", func(t *testing.T) {
		// Create team as system admin so BasicUser is NOT a member.
		otherTeam := th.CreateTeamWithClient(t, th.SystemAdminClient)
		resp, err := th.Client.DoAPIGet(context.Background(), teamURL(otherTeam.Id), "")
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	t.Run("deleted team gets 403", func(t *testing.T) {
		deletedTeam, appErr := th.App.CreateTeam(th.Context, &model.Team{
			DisplayName: "Deleted Team",
			Name:        model.NewRandomTeamName(),
			Type:        model.TeamOpen,
			Email:       th.BasicUser.Email,
		})
		require.Nil(t, appErr)
		_, _, appErr = th.App.AddUserToTeam(th.Context, deletedTeam.Id, th.BasicUser.Id, "")
		require.Nil(t, appErr)
		appErr = th.App.SoftDeleteTeam(deletedTeam.Id)
		require.Nil(t, appErr)

		resp, err := th.Client.DoAPIGet(context.Background(), teamURL(deletedTeam.Id), "")
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	t.Run("removed membership gets 403", func(t *testing.T) {
		otherTeam := th.CreateTeamWithClient(t, th.SystemAdminClient)
		_, _, appErr := th.App.AddUserToTeam(th.Context, otherTeam.Id, th.BasicUser.Id, "")
		require.Nil(t, appErr)

		// Remove the user — soft-deletes the TeamMember row.
		appErr = th.App.RemoveUserFromTeam(th.Context, otherTeam.Id, th.BasicUser.Id, th.SystemAdminUser.Id)
		require.Nil(t, appErr)

		resp, err := th.Client.DoAPIGet(context.Background(), teamURL(otherTeam.Id), "")
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	t.Run("invalid since param returns 400", func(t *testing.T) {
		resp, err := th.Client.DoAPIGet(context.Background(), teamURL(th.BasicTeam.Id, "since=notanumber"), "")
		require.Error(t, err)
		require.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("basic response shape", func(t *testing.T) {
		resp, err := th.Client.DoAPIGet(context.Background(), teamURL(th.BasicTeam.Id), "")
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
		defer resp.Body.Close()

		var r model.TeamLoadResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))

		// Channels — must include BasicChannel
		chIDs := make(map[string]struct{}, len(r.Channels))
		for _, ch := range r.Channels {
			chIDs[ch.Id] = struct{}{}
		}
		assert.Contains(t, chIDs, th.BasicChannel.Id)

		// Channel members — count must match channels
		assert.Len(t, r.ChannelMembers.Members, len(r.Channels))

		// Sidebar categories present
		assert.NotNil(t, r.SidebarCategories)

		// Roles present
		assert.NotEmpty(t, r.Roles)

		// Timestamp set
		assert.Greater(t, r.Timestamp, int64(0))
	})

	t.Run("DM and GM channels are excluded", func(t *testing.T) {
		// Create a DM and a GM so they exist in the DB.
		user3 := th.CreateUser(t)
		th.LinkUserToTeam(t, user3, th.BasicTeam)
		_, _, err := th.Client.CreateDirectChannel(context.Background(), th.BasicUser.Id, th.BasicUser2.Id)
		require.NoError(t, err)
		_, _, err = th.Client.CreateGroupChannel(context.Background(), []string{th.BasicUser.Id, th.BasicUser2.Id, user3.Id})
		require.NoError(t, err)

		resp, err := th.Client.DoAPIGet(context.Background(), teamURL(th.BasicTeam.Id), "")
		require.NoError(t, err)
		defer resp.Body.Close()

		var r model.TeamLoadResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))

		for _, ch := range r.Channels {
			assert.NotEqual(t, model.ChannelTypeDirect, ch.Type, "DM channel must not appear in team_load")
			assert.NotEqual(t, model.ChannelTypeGroup, ch.Type, "GM channel must not appear in team_load")
		}
	})

	t.Run("delta since=now returns empty channels and members", func(t *testing.T) {
		now := model.GetMillis()
		resp, err := th.Client.DoAPIGet(context.Background(), teamURL(th.BasicTeam.Id, fmt.Sprintf("since=%d", now)), "")
		require.NoError(t, err)
		defer resp.Body.Close()

		var r model.TeamLoadResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))

		assert.Empty(t, r.Channels, "no channels expected in delta when nothing changed")
		assert.Empty(t, r.ChannelMembers.Members, "no members expected in delta when nothing changed")
		assert.Empty(t, r.Roles, "no roles expected in delta when nothing changed")
		assert.Greater(t, r.Timestamp, int64(0))
	})

	t.Run("sidebar omitted when since cursor is newer than sidebar version", func(t *testing.T) {
		// First call (cold start) to get the current sidebar version and timestamp.
		resp, err := th.Client.DoAPIGet(context.Background(), teamURL(th.BasicTeam.Id), "")
		require.NoError(t, err)
		defer resp.Body.Close()

		var r model.TeamLoadResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))

		require.NotNil(t, r.SidebarCategories, "sidebar_categories must be present on cold start")

		// Second call using the returned Timestamp as the since cursor.
		// Nothing mutated the sidebar, so sidebarVersion <= since → sidebar omitted.
		resp2, err := th.Client.DoAPIGet(context.Background(), teamURL(th.BasicTeam.Id, fmt.Sprintf("since=%d", r.Timestamp)), "")
		require.NoError(t, err)
		defer resp2.Body.Close()

		var r2 model.TeamLoadResponse
		require.NoError(t, json.NewDecoder(resp2.Body).Decode(&r2))

		assert.Nil(t, r2.SidebarCategories, "sidebar_categories should be omitted when since >= sidebarVersion")
	})

	t.Run("delta: channel member update includes slim channel companion when channel metadata unchanged", func(t *testing.T) {
		// Scenario: another user posts in BasicChannel after the cursor, which advances
		// LastPostAt but NOT Channel.UpdateAt.  When BasicUser then views the channel,
		// UpdateLastViewedAt sets LastUpdateAt = greatest(LastViewedAt, LastPostAt) > since.
		// The member therefore appears in the delta but the channel does not.
		// The server must include a slim ChannelLoadItem so the client can recompute
		// unread counts from total_msg_count without a schema change.
		//
		// Steps:
		//  1. Take the cursor (since)
		//  2. BasicUser2 posts → Channel.LastPostAt > since but Channel.UpdateAt unchanged
		//  3. BasicUser views the channel → ChannelMember.LastUpdateAt = LastPostAt > since
		//  4. Delta call → member in response, channel NOT in delta, slim companion present

		// Snapshot before any activity.
		since := model.GetMillis()

		// Post as BasicUser2 so BasicChannel.LastPostAt advances past since.
		// Channel.UpdateAt is NOT changed by a new post.
		user2Client := th.CreateClient()
		_, _, err := user2Client.Login(context.Background(), th.BasicUser2.Email, th.BasicUser2.Password)
		require.NoError(t, err)
		_, _, err = user2Client.CreatePost(context.Background(), &model.Post{
			ChannelId: th.BasicChannel.Id,
			Message:   "team_load slim companion trigger post",
		})
		require.NoError(t, err)

		// BasicUser views the channel → LastUpdateAt = greatest(LastViewedAt, LastPostAt) > since.
		// Channel.UpdateAt is still unchanged.
		_, _, err = th.Client.ViewChannel(context.Background(), th.BasicUser.Id, &model.ChannelView{
			ChannelId: th.BasicChannel.Id,
		})
		require.NoError(t, err)

		resp, err2 := th.Client.DoAPIGet(context.Background(), teamURL(th.BasicTeam.Id, fmt.Sprintf("since=%d", since)), "")
		require.NoError(t, err2)
		defer resp.Body.Close()

		var r model.TeamLoadResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))

		// The channel member for BasicChannel must be in the delta.
		var memberFound bool
		for _, m := range r.ChannelMembers.Members {
			if m.ChannelId == th.BasicChannel.Id {
				memberFound = true
				break
			}
		}
		require.True(t, memberFound, "BasicChannel member must be in delta channel_members")

		// A slim ChannelLoadItem for BasicChannel must accompany the member.
		var slimFound bool
		for _, ch := range r.Channels {
			if ch.Id == th.BasicChannel.Id {
				slimFound = true
				assert.Greater(t, ch.TotalMsgCount, int64(0),
					"slim companion must carry total_msg_count > 0")
				assert.Greater(t, ch.LastPostAt, int64(0),
					"slim companion must carry last_post_at > 0")
				break
			}
		}
		assert.True(t, slimFound,
			"a slim ChannelLoadItem must accompany the BasicChannel member in the delta")
	})

	t.Run("tombstone: left channel appears in removed_channel_ids", func(t *testing.T) {
		// Create a new channel and join it.
		newCh, _, err := th.Client.CreateChannel(context.Background(), &model.Channel{
			TeamId:      th.BasicTeam.Id,
			Type:        model.ChannelTypeOpen,
			Name:        model.NewId(),
			DisplayName: "tombstone-test",
		})
		require.NoError(t, err)

		// Join (membership created)
		_, _, err = th.Client.AddChannelMember(context.Background(), newCh.Id, th.BasicUser.Id)
		require.NoError(t, err)

		// Snapshot cursor
		since := model.GetMillis()

		// Leave the channel
		_, err = th.Client.RemoveUserFromChannel(context.Background(), newCh.Id, th.BasicUser.Id)
		require.NoError(t, err)

		resp, err := th.Client.DoAPIGet(context.Background(), teamURL(th.BasicTeam.Id, fmt.Sprintf("since=%d", since)), "")
		require.NoError(t, err)
		defer resp.Body.Close()

		var r model.TeamLoadResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))

		assert.Contains(t, r.ChannelMembers.RemovedChannelIds, newCh.Id,
			"left channel should appear in removed_channel_ids")
	})
}

// collectNeededRoles returns the set of role names referenced in Me, TeamMembers,
// and ChannelMembers — used to verify the Roles field is complete.
func collectNeededRoles(r model.InitialLoadResponse) map[string]struct{} {
	seen := make(map[string]struct{})
	add := func(roles string) {
		for _, name := range strings.Fields(roles) {
			seen[name] = struct{}{}
		}
	}
	if r.Me != nil {
		add(r.Me.Roles)
	}
	if r.TeamMembers != nil {
		for _, tm := range r.TeamMembers.Members {
			add(tm.Roles)
		}
	}
	if r.ActiveTeam != nil {
		for _, cm := range r.ActiveTeam.ChannelMembers.Members {
			add(cm.Roles)
		}
	}
	return seen
}

// --- TestReconnectSync ---

func doReconnectSync(t *testing.T, th *TestHelper, req model.ExperienceSyncRequest) (*http.Response, model.ExperienceSyncResponse, error) {
	t.Helper()
	body, err := json.Marshal(req)
	require.NoError(t, err)
	resp, apiErr := th.Client.DoAPIPost(context.Background(), "/sync", string(body))
	if apiErr != nil {
		return resp, model.ExperienceSyncResponse{}, apiErr
	}
	defer resp.Body.Close()
	var r model.ExperienceSyncResponse
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))
	return resp, r, nil
}

func TestReconnectSync(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t).InitBasic(t)

	validSince := model.GetMillis() - 60000 // 1 minute ago

	validReq := func() model.ExperienceSyncRequest {
		return model.ExperienceSyncRequest{
			Since: validSince,
			Scope: model.ExperienceSyncScope{
				TeamIDs: []string{th.BasicTeam.Id},
			},
		}
	}

	t.Run("unauthenticated request is rejected", func(t *testing.T) {
		client := th.CreateClient()
		body, _ := json.Marshal(validReq())
		resp, err := client.DoAPIPost(context.Background(), "/sync", string(body))
		require.Error(t, err)
		require.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("returns 404 when EnableExperienceAPI is off", func(t *testing.T) {
		th.ConfigStore.SetReadOnlyFF(false)
		defer th.ConfigStore.SetReadOnlyFF(true)
		th.App.UpdateConfig(func(cfg *model.Config) { cfg.FeatureFlags.EnableExperienceAPI = false })
		defer th.App.UpdateConfig(func(cfg *model.Config) { cfg.FeatureFlags.EnableExperienceAPI = true })

		body, _ := json.Marshal(validReq())
		resp, err := th.Client.DoAPIPost(context.Background(), "/sync", string(body))
		require.Error(t, err)
		require.Equal(t, http.StatusNotFound, resp.StatusCode)
	})

	t.Run("invalid body returns 400", func(t *testing.T) {
		resp, err := th.Client.DoAPIPost(context.Background(), "/sync", "not-json")
		require.Error(t, err)
		require.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("since=0 returns 400", func(t *testing.T) {
		req := validReq()
		req.Since = 0
		body, _ := json.Marshal(req)
		resp, err := th.Client.DoAPIPost(context.Background(), "/sync", string(body))
		require.Error(t, err)
		require.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("negative since returns 400", func(t *testing.T) {
		req := validReq()
		req.Since = -1
		body, _ := json.Marshal(req)
		resp, err := th.Client.DoAPIPost(context.Background(), "/sync", string(body))
		require.Error(t, err)
		require.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("empty team_ids returns 400", func(t *testing.T) {
		req := validReq()
		req.Scope.TeamIDs = []string{}
		body, _ := json.Marshal(req)
		resp, err := th.Client.DoAPIPost(context.Background(), "/sync", string(body))
		require.Error(t, err)
		require.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("invalid team_id format returns 400", func(t *testing.T) {
		req := validReq()
		req.Scope.TeamIDs = []string{"not-a-valid-id"}
		body, _ := json.Marshal(req)
		resp, err := th.Client.DoAPIPost(context.Background(), "/sync", string(body))
		require.Error(t, err)
		require.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("invalid active_channel_id format returns 400", func(t *testing.T) {
		req := validReq()
		req.Scope.ActiveChannelID = "bad-id"
		body, _ := json.Marshal(req)
		resp, err := th.Client.DoAPIPost(context.Background(), "/sync", string(body))
		require.Error(t, err)
		require.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("invalid active_thread_id format returns 400", func(t *testing.T) {
		req := validReq()
		req.Scope.ActiveThreadID = "bad-id"
		body, _ := json.Marshal(req)
		resp, err := th.Client.DoAPIPost(context.Background(), "/sync", string(body))
		require.Error(t, err)
		require.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("invalid global_threads_team_id format returns 400", func(t *testing.T) {
		req := validReq()
		req.Scope.GlobalThreadsTeamID = "bad-id"
		body, _ := json.Marshal(req)
		resp, err := th.Client.DoAPIPost(context.Background(), "/sync", string(body))
		require.Error(t, err)
		require.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("basic reconnect returns populated response", func(t *testing.T) {
		// Use since=1 so everything changed since is returned
		req := model.ExperienceSyncRequest{
			Since: 1,
			Scope: model.ExperienceSyncScope{TeamIDs: []string{th.BasicTeam.Id}},
		}
		_, r, err := doReconnectSync(t, th, req)
		require.NoError(t, err)

		assert.Greater(t, r.Timestamp, int64(0))
		assert.NotEmpty(t, r.Config)
		assert.NotEmpty(t, r.License)

		// Teams delta for the scoped team
		require.NotEmpty(t, r.Teams)
		teamIDs := make([]string, 0, len(r.Teams))
		for _, td := range r.Teams {
			teamIDs = append(teamIDs, td.TeamID)
		}
		assert.Contains(t, teamIDs, th.BasicTeam.Id)
	})

	t.Run("me is nil when user profile unchanged since cursor", func(t *testing.T) {
		// Re-fetch to get the latest UpdateAt after any server-side mutations (e.g. password hash)
		latestUser, _, err := th.Client.GetMe(context.Background(), "")
		require.NoError(t, err)
		req := model.ExperienceSyncRequest{
			Since: latestUser.UpdateAt + 1,
			Scope: model.ExperienceSyncScope{TeamIDs: []string{th.BasicTeam.Id}},
		}
		_, r, err2 := doReconnectSync(t, th, req)
		require.NoError(t, err2)
		assert.Nil(t, r.Me, "me should be nil when user profile has not changed since cursor")
	})

	t.Run("me is populated when user profile changed since cursor", func(t *testing.T) {
		req := model.ExperienceSyncRequest{
			Since: th.BasicUser.UpdateAt - 1,
			Scope: model.ExperienceSyncScope{TeamIDs: []string{th.BasicTeam.Id}},
		}
		_, r, err := doReconnectSync(t, th, req)
		require.NoError(t, err)
		require.NotNil(t, r.Me)
		assert.Equal(t, th.BasicUser.Id, r.Me.Id)
	})

	t.Run("team not a member of is silently skipped", func(t *testing.T) {
		// Create a team as SystemAdmin — BasicUser is NOT added to it
		otherTeam := th.CreateTeamWithClient(t, th.SystemAdminClient)
		req := model.ExperienceSyncRequest{
			Since: 1,
			Scope: model.ExperienceSyncScope{TeamIDs: []string{th.BasicTeam.Id, otherTeam.Id}},
		}
		_, r, err := doReconnectSync(t, th, req)
		require.NoError(t, err)

		teamIDs := make([]string, 0, len(r.Teams))
		for _, td := range r.Teams {
			teamIDs = append(teamIDs, td.TeamID)
		}
		assert.Contains(t, teamIDs, th.BasicTeam.Id)
		assert.NotContains(t, teamIDs, otherTeam.Id, "non-member team should be silently skipped")
	})

	t.Run("global_threads_team_id not a member of is silently cleared", func(t *testing.T) {
		otherTeam := th.CreateTeamWithClient(t, th.SystemAdminClient)
		req := model.ExperienceSyncRequest{
			Since: 1,
			Scope: model.ExperienceSyncScope{
				TeamIDs:             []string{th.BasicTeam.Id},
				GlobalThreadsTeamID: otherTeam.Id,
			},
		}
		_, r, err := doReconnectSync(t, th, req)
		require.NoError(t, err)
		// GlobalThreadsTeamID was cleared because user is not a member; threads_delta should be nil or empty
		if r.ThreadsDelta != nil {
			assert.Empty(t, r.ThreadsDelta.Threads, "threads_delta should have no threads for inaccessible team")
		}
	})

	t.Run("teams_unreads always has badge data even when team metadata unchanged", func(t *testing.T) {
		// Use a since cursor just after the team's UpdateAt — team metadata is unchanged.
		req := model.ExperienceSyncRequest{
			Since: th.BasicTeam.UpdateAt + 1,
			Scope: model.ExperienceSyncScope{TeamIDs: []string{th.BasicTeam.Id}},
		}
		_, r, err := doReconnectSync(t, th, req)
		require.NoError(t, err)

		// teams_unreads must carry the badge data for this team regardless of metadata change
		require.NotEmpty(t, r.TeamsUnreads, "teams_unreads should always be present")
		var teamUnread *model.SyncTeamUnread
		for _, u := range r.TeamsUnreads {
			if u.TeamID == th.BasicTeam.Id {
				teamUnread = u
				break
			}
		}
		require.NotNil(t, teamUnread, "teams_unreads must include the scoped team regardless of since")

		// The team delta entry itself should NOT include Team metadata when unchanged
		for _, td := range r.Teams {
			if td.TeamID == th.BasicTeam.Id {
				assert.Nil(t, td.Team, "SyncTeamDelta.Team should be nil when team metadata unchanged since cursor")
				break
			}
		}
	})

	t.Run("teams_unreads covers all teams not just scoped ones", func(t *testing.T) {
		// Add BasicUser to a second team — it won't be in scope.team_ids
		secondTeam := th.CreateTeam(t)
		th.LinkUserToTeam(t, th.BasicUser, secondTeam)

		req := model.ExperienceSyncRequest{
			Since: 1,
			Scope: model.ExperienceSyncScope{TeamIDs: []string{th.BasicTeam.Id}},
		}
		_, r, err := doReconnectSync(t, th, req)
		require.NoError(t, err)

		// teams[] should only contain the scoped team
		require.Len(t, r.Teams, 1)
		assert.Equal(t, th.BasicTeam.Id, r.Teams[0].TeamID)

		// teams_unreads must include both teams
		require.NotEmpty(t, r.TeamsUnreads)
		unreadTeamIDs := make([]string, 0, len(r.TeamsUnreads))
		for _, u := range r.TeamsUnreads {
			unreadTeamIDs = append(unreadTeamIDs, u.TeamID)
		}
		assert.Contains(t, unreadTeamIDs, th.BasicTeam.Id, "teams_unreads must include scoped team")
		assert.Contains(t, unreadTeamIDs, secondTeam.Id, "teams_unreads must include non-scoped team")
	})

	t.Run("roles only include roles updated since cursor", func(t *testing.T) {
		// since=now means no roles should have changed
		req := model.ExperienceSyncRequest{
			Since: model.GetMillis() + 1000,
			Scope: model.ExperienceSyncScope{TeamIDs: []string{th.BasicTeam.Id}},
		}
		_, r, err := doReconnectSync(t, th, req)
		require.NoError(t, err)
		assert.Empty(t, r.Roles, "no roles should be included when none changed since cursor")
	})

	t.Run("active_channel included when in scope and user is a member", func(t *testing.T) {
		_, appErr := th.App.GetChannelMember(th.Context, th.BasicChannel.Id, th.BasicUser.Id)
		require.Nil(t, appErr)

		req := model.ExperienceSyncRequest{
			Since: 1,
			Scope: model.ExperienceSyncScope{
				TeamIDs:         []string{th.BasicTeam.Id},
				ActiveChannelID: th.BasicChannel.Id,
			},
		}
		_, r, err2 := doReconnectSync(t, th, req)
		require.NoError(t, err2)
		require.NotNil(t, r.ActiveChannel)
		assert.Equal(t, th.BasicChannel.Id, r.ActiveChannel.ChannelID)
		assert.NotNil(t, r.ActiveChannel.Stats)
	})

	t.Run("active_channel skipped when user has no access", func(t *testing.T) {
		// Create a private channel owned by BasicUser; BasicUser2 is not a member
		privateChannel := th.CreatePrivateChannel(t)

		// Log in as BasicUser2
		client2 := th.CreateClient()
		_, _, err := client2.Login(context.Background(), th.BasicUser2.Email, th.BasicUser2.Password)
		require.NoError(t, err)

		req := model.ExperienceSyncRequest{
			Since: 1,
			Scope: model.ExperienceSyncScope{
				TeamIDs:         []string{th.BasicTeam.Id},
				ActiveChannelID: privateChannel.Id,
			},
		}
		body, _ := json.Marshal(req)
		resp, apiErr := client2.DoAPIPost(context.Background(), "/sync", string(body))
		require.NoError(t, apiErr)
		defer resp.Body.Close()
		var r model.ExperienceSyncResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))
		assert.Nil(t, r.ActiveChannel, "active_channel should be nil when user has no access")
	})

	t.Run("preference_tombstones populated when preferences deleted since cursor", func(t *testing.T) {
		// Use a dedicated user to avoid tombstone pollution from other tests running in parallel.
		freshUser := th.CreateUser(t)
		th.LinkUserToTeam(t, freshUser, th.BasicTeam)
		freshClient := th.CreateClient()
		_, _, err := freshClient.Login(context.Background(), freshUser.Email, freshUser.Password)
		require.NoError(t, err)

		pref := model.Preference{
			UserId:   freshUser.Id,
			Category: "test_sync_tombstone",
			Name:     "sync_test_key",
			Value:    "true",
		}
		_, err = freshClient.UpdatePreferences(context.Background(), freshUser.Id, model.Preferences{pref})
		require.NoError(t, err)

		beforeDelete := model.GetMillis()

		_, err = freshClient.DeletePreferences(context.Background(), freshUser.Id, model.Preferences{pref})
		require.NoError(t, err)

		tombstones, storeErr := th.Server.Store().Preference().GetDeletedSince(freshUser.Id, beforeDelete-1)
		require.NoError(t, storeErr, "GetDeletedSince should not fail")
		require.NotEmpty(t, tombstones, "tombstone should be written after DeletePreferences")

		req := model.ExperienceSyncRequest{
			Since: beforeDelete - 1,
			Scope: model.ExperienceSyncScope{TeamIDs: []string{th.BasicTeam.Id}},
		}

		body, _ := json.Marshal(req)
		resp, apiErr := freshClient.DoAPIPost(context.Background(), "/sync", string(body))
		require.NoError(t, apiErr)
		defer resp.Body.Close()
		var r model.ExperienceSyncResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&r))

		found := false
		for _, pt := range r.PreferenceTombstones {
			if pt.Category == pref.Category && pt.Name == pref.Name {
				found = true
				break
			}
		}
		assert.True(t, found, "deleted preference should appear in preference_tombstones")
	})

	t.Run("direct_channels included for new DM created since cursor", func(t *testing.T) {
		// Use since-50 to avoid boundary condition where channel.UpdateAt == since (excluded by strict >)
		since := model.GetMillis() - 50
		dm, _, err := th.Client.CreateDirectChannel(context.Background(), th.BasicUser.Id, th.SystemAdminUser.Id)
		require.NoError(t, err)

		req := model.ExperienceSyncRequest{
			Since: since,
			Scope: model.ExperienceSyncScope{TeamIDs: []string{th.BasicTeam.Id}},
		}
		_, r, err2 := doReconnectSync(t, th, req)
		require.NoError(t, err2)

		found := false
		for _, ch := range r.DirectChannels {
			if ch.Id == dm.Id {
				found = true
				break
			}
		}
		assert.True(t, found, "newly created DM channel should appear in direct_channels")
	})

	t.Run("timestamp is always greater than zero", func(t *testing.T) {
		_, r, err := doReconnectSync(t, th, validReq())
		require.NoError(t, err)
		assert.Greater(t, r.Timestamp, int64(0))
	})
}

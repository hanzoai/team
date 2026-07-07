// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mattermost/mattermost/server/public/model"
)

// --- resolveSyncAuthorsAndGroups ---

func TestResolveSyncAuthorsAndGroups(t *testing.T) {
	th := Setup(t).InitBasic(t)

	post := func(userID, message string) *model.Post {
		return &model.Post{Id: model.NewId(), UserId: userID, Message: message}
	}

	t.Run("thread participant already known is not fetched from DB again", func(t *testing.T) {
		posts := []*model.Post{post(th.BasicUser.Id, "hello")}
		authors, _ := th.App.resolveSyncAuthorsAndGroups(th.Context, posts, []*model.User{th.BasicUser}, nil)
		found := false
		for _, u := range authors {
			if u.Id == th.BasicUser.Id {
				found = true
			}
		}
		assert.True(t, found)
	})

	t.Run("post author not in participants is fetched from DB", func(t *testing.T) {
		// BasicUser2 not passed as participant but authors a post — must be fetched.
		posts := []*model.Post{post(th.BasicUser2.Id, "hello")}
		authors, _ := th.App.resolveSyncAuthorsAndGroups(th.Context, posts, nil, nil)
		found := false
		for _, u := range authors {
			if u.Id == th.BasicUser2.Id {
				found = true
			}
		}
		assert.True(t, found)
	})

	t.Run("same user in participants and as post author appears exactly once", func(t *testing.T) {
		posts := []*model.Post{post(th.BasicUser.Id, "hi")}
		authors, _ := th.App.resolveSyncAuthorsAndGroups(th.Context, posts, []*model.User{th.BasicUser}, nil)
		count := 0
		for _, u := range authors {
			if u.Id == th.BasicUser.Id {
				count++
			}
		}
		assert.Equal(t, 1, count)
	})

	t.Run("@mention matching an author username is not returned as a group", func(t *testing.T) {
		posts := []*model.Post{post(th.BasicUser.Id, "@"+th.BasicUser.Username)}
		_, groups := th.App.resolveSyncAuthorsAndGroups(th.Context, posts, []*model.User{th.BasicUser}, nil)
		for _, g := range groups {
			assert.NotEqual(t, th.BasicUser.Username, g.Name)
		}
	})

	t.Run("@mention matching a real group name returns that group", func(t *testing.T) {
		group := th.CreateGroup(t)
		posts := []*model.Post{post(th.BasicUser.Id, "@"+*group.Name)}
		_, groups := th.App.resolveSyncAuthorsAndGroups(th.Context, posts, []*model.User{th.BasicUser}, nil)
		found := false
		for _, g := range groups {
			if g.Id == group.Id {
				found = true
			}
		}
		assert.True(t, found, "group mentioned in post should be returned")
	})

	t.Run("nil participant entries are safely ignored", func(t *testing.T) {
		posts := []*model.Post{post(th.BasicUser.Id, "hi")}
		assert.NotPanics(t, func() {
			th.App.resolveSyncAuthorsAndGroups(th.Context, posts, []*model.User{nil, th.BasicUser}, []*model.User{nil})
		})
	})
}

// --- resolveActiveTeam ---

func TestResolveActiveTeam(t *testing.T) {
	th := Setup(t)

	team := func(id, displayName string) *model.Team {
		return &model.Team{Id: id, DisplayName: displayName}
	}
	teamsOrderPref := func(order string) model.Preferences {
		return model.Preferences{{Category: preferenceTeamsOrder, Name: preferenceTeamsOrder, Value: order}}
	}

	teams := []*model.Team{team("t1", "Bravo"), team("t2", "Alpha"), team("t3", "Charlie")}

	t.Run("empty teams list returns empty string", func(t *testing.T) {
		assert.Empty(t, th.App.resolveActiveTeam("", nil, nil, "en"))
	})

	t.Run("valid hint returns the hinted team", func(t *testing.T) {
		assert.Equal(t, "t2", th.App.resolveActiveTeam("t2", teams, nil, "en"))
	})

	t.Run("invalid hint falls through to teams_order pref", func(t *testing.T) {
		result := th.App.resolveActiveTeam("unknown", teams, teamsOrderPref("t3,t1"), "en")
		assert.Equal(t, "t3", result)
	})

	t.Run("teams_order pref skips IDs not in the teams list", func(t *testing.T) {
		result := th.App.resolveActiveTeam("", teams, teamsOrderPref("missing,t3"), "en")
		assert.Equal(t, "t3", result)
	})

	t.Run("no hint and no pref falls back to alphabetical first team", func(t *testing.T) {
		// "Alpha" < "Bravo" < "Charlie" so t2 wins
		assert.Equal(t, "t2", th.App.resolveActiveTeam("", teams, nil, "en"))
	})

	t.Run("single team returned regardless of hint or pref", func(t *testing.T) {
		single := []*model.Team{team("t1", "OnlyTeam")}
		assert.Equal(t, "t1", th.App.resolveActiveTeam("", single, nil, "en"))
	})
}

// --- extractSyncAtMentions ---

func TestExtractSyncAtMentions(t *testing.T) {
	out := func(p *model.Post) map[string]struct{} {
		m := make(map[string]struct{})
		extractSyncAtMentions(p, m)
		return m
	}

	t.Run("extracts mention from message", func(t *testing.T) {
		p := &model.Post{Message: "hello @alice how are you"}
		assert.Contains(t, out(p), "alice")
	})

	t.Run("excludes special mentions: all, channel, here", func(t *testing.T) {
		p := &model.Post{Message: "@all @channel @here @alice"}
		result := out(p)
		assert.NotContains(t, result, "all")
		assert.NotContains(t, result, "channel")
		assert.NotContains(t, result, "here")
		assert.Contains(t, result, "alice")
	})

	t.Run("mention names are lowercased", func(t *testing.T) {
		p := &model.Post{Message: "@Alice @BOB"}
		result := out(p)
		assert.Contains(t, result, "alice")
		assert.Contains(t, result, "bob")
		assert.NotContains(t, result, "Alice")
	})

	t.Run("no @ produces empty output", func(t *testing.T) {
		assert.Empty(t, out(&model.Post{Message: "no mentions here"}))
	})

	t.Run("duplicate mentions appear once in map", func(t *testing.T) {
		p := &model.Post{Message: "@alice and @alice again"}
		assert.Len(t, out(p), 1)
	})

	t.Run("extracts mentions from attachment title and text", func(t *testing.T) {
		p := &model.Post{
			Message: "",
			Props: model.StringInterface{
				"attachments": []interface{}{
					map[string]interface{}{
						"title": "@carol",
						"text":  "@dave is here",
					},
				},
			},
		}
		result := out(p)
		assert.Contains(t, result, "carol")
		assert.Contains(t, result, "dave")
	})

	t.Run("extracts mentions from attachment pretext", func(t *testing.T) {
		p := &model.Post{
			Props: model.StringInterface{
				"attachments": []interface{}{
					map[string]interface{}{
						"pretext": "@eve check this out",
					},
				},
			},
		}
		assert.Contains(t, out(p), "eve")
	})
}

// --- deduplicateSyncPosts ---

func TestDeduplicateSyncPosts(t *testing.T) {
	post := func(id string, deleted bool) *model.Post {
		p := &model.Post{Id: id}
		if deleted {
			p.DeleteAt = 1
		}
		return p
	}
	postList := func(posts ...*model.Post) *model.PostList {
		pl := model.NewPostList()
		for _, p := range posts {
			pl.AddPost(p)
			pl.AddOrder(p.Id)
		}
		return pl
	}

	t.Run("post appearing in both lists is only in merged once", func(t *testing.T) {
		p1 := post("p1", false)
		p2 := post("p2", false)
		// p1 is in both channel and thread lists
		merged, chOrder, thOrder := deduplicateSyncPosts(postList(p1), postList(p1, p2))
		// merged must contain exactly 2 unique posts, not 3
		assert.Len(t, merged, 2)
		// verify each ID appears exactly once
		seen := map[string]int{}
		for _, p := range merged {
			seen[p.Id]++
		}
		assert.Equal(t, 1, seen["p1"], "p1 must appear exactly once in merged")
		assert.Equal(t, 1, seen["p2"], "p2 must appear exactly once in merged")
		// order slices are per-list and independent of dedup
		assert.Equal(t, []string{"p1"}, chOrder)
		assert.Equal(t, []string{"p1", "p2"}, thOrder)
	})

	t.Run("deleted post is excluded from order but present in merged", func(t *testing.T) {
		p1 := post("p1", true)
		merged, chOrder, _ := deduplicateSyncPosts(postList(p1), nil)
		assert.Len(t, merged, 1)
		assert.Empty(t, chOrder)
	})

	t.Run("nil post lists produce nil outputs", func(t *testing.T) {
		merged, chOrder, thOrder := deduplicateSyncPosts(nil, nil)
		assert.Nil(t, merged)
		assert.Nil(t, chOrder)
		assert.Nil(t, thOrder)
	})

	t.Run("post unique to thread list appears only in thOrder", func(t *testing.T) {
		p1 := post("p1", false)
		p2 := post("p2", false)
		merged, chOrder, thOrder := deduplicateSyncPosts(postList(p1), postList(p2))
		assert.Len(t, merged, 2)
		assert.Equal(t, []string{"p1"}, chOrder)
		assert.Equal(t, []string{"p2"}, thOrder)
	})
}

// --- filterAutoclosedDMEntries ---

func TestFilterAutoclosedDMEntries(t *testing.T) {
	ch := func(id string) *model.Channel {
		return &model.Channel{Id: id, Type: model.ChannelTypeDirect}
	}
	entry := func(c *model.Channel, lastViewed int64, unread bool) dmEntry {
		return dmEntry{ch: c, lastViewed: lastViewed, unread: unread}
	}

	t.Run("channel pinned elsewhere goes to pinned slice not dmCat", func(t *testing.T) {
		c1 := ch("c1")
		pinned := map[string]struct{}{"c1": {}}
		dmCat, pinnedChs := filterAutoclosedDMEntries([]dmEntry{entry(c1, 100, false)}, "", "u1", nil, 20, pinned)
		assert.Empty(t, dmCat)
		require.Len(t, pinnedChs, 1)
		assert.Equal(t, "c1", pinnedChs[0].Id)
	})

	t.Run("channel with no lastViewed and not unread is excluded", func(t *testing.T) {
		dmCat, _ := filterAutoclosedDMEntries([]dmEntry{entry(ch("c1"), 0, false)}, "", "u1", nil, 20, nil)
		assert.Empty(t, dmCat)
	})

	t.Run("unread channel with no lastViewed is included", func(t *testing.T) {
		dmCat, _ := filterAutoclosedDMEntries([]dmEntry{entry(ch("c1"), 0, true)}, "", "u1", nil, 20, nil)
		assert.Len(t, dmCat, 1)
	})

	t.Run("deactivated user DM excluded when not unread and deactivated after last view", func(t *testing.T) {
		c := ch("c1")
		profiles := map[string][]*model.User{"c1": {{Id: "partner", DeleteAt: 500}}}
		dmCat, _ := filterAutoclosedDMEntries([]dmEntry{entry(c, 100, false)}, "", "u1", profiles, 20, nil)
		assert.Empty(t, dmCat)
	})

	t.Run("deactivated user DM included when unread even if deactivated after last view", func(t *testing.T) {
		c := ch("c1")
		profiles := map[string][]*model.User{"c1": {{Id: "partner", DeleteAt: 500}}}
		dmCat, _ := filterAutoclosedDMEntries([]dmEntry{entry(c, 100, true)}, "", "u1", profiles, 20, nil)
		assert.Len(t, dmCat, 1)
	})

	t.Run("dmLimit caps the list; unread count sets a floor beyond the limit", func(t *testing.T) {
		var entries []dmEntry
		for i := 0; i < 3; i++ { // 3 unreads
			entries = append(entries, entry(ch(model.NewId()), 100, true))
		}
		for i := 0; i < 5; i++ { // 5 read channels
			entries = append(entries, entry(ch(model.NewId()), 100, false))
		}
		// dmLimit=4: 3 unreads preserved + 1 read channel = 4 total
		dmCat, _ := filterAutoclosedDMEntries(entries, "", "u1", nil, 4, nil)
		assert.Len(t, dmCat, 4)
		unreads := 0
		for _, e := range dmCat {
			if e.unread {
				unreads++
			}
		}
		assert.Equal(t, 3, unreads)
	})

	t.Run("current channel is sorted first", func(t *testing.T) {
		c1 := ch("c1")
		current := ch("current")
		entries := []dmEntry{entry(c1, 200, false), entry(current, 100, false)}
		dmCat, _ := filterAutoclosedDMEntries(entries, "current", "u1", nil, 20, nil)
		require.Len(t, dmCat, 2)
		assert.Equal(t, "current", dmCat[0].ch.Id)
	})
}

// --- filterManuallyClosedDMEntries ---

func TestFilterManuallyClosedDMEntries(t *testing.T) {
	ch := func(id, name string, chType model.ChannelType) *model.Channel {
		return &model.Channel{Id: id, Name: name, Type: chType}
	}
	entry := func(c *model.Channel, unread bool) dmEntry {
		return dmEntry{ch: c, unread: unread}
	}
	hideDM := func(teammateID string) model.Preferences {
		return model.Preferences{{Category: model.PreferenceCategoryDirectChannelShow, Name: teammateID, Value: "false"}}
	}
	hideGM := func(chID string) model.Preferences {
		return model.Preferences{{Category: model.PreferenceCategoryGroupChannelShow, Name: chID, Value: "false"}}
	}

	t.Run("unread DM kept even when hidden by pref", func(t *testing.T) {
		// DM name "partner__u1": userID is the second part, so teammate = "partner"
		dm := ch("c1", "partner__u1", model.ChannelTypeDirect)
		result := filterManuallyClosedDMEntries([]dmEntry{entry(dm, true)}, hideDM("partner"), "u1", nil)
		assert.Len(t, result, 1)
	})

	t.Run("read DM hidden by pref is excluded", func(t *testing.T) {
		dm := ch("c1", "partner__u1", model.ChannelTypeDirect)
		result := filterManuallyClosedDMEntries([]dmEntry{entry(dm, false)}, hideDM("partner"), "u1", nil)
		assert.Empty(t, result)
	})

	t.Run("DM name: userID is first part, teammate is second", func(t *testing.T) {
		// Name "u1__partner": parts[0]=="u1" matches userID so teammate=parts[1]="partner"
		dm := ch("c1", "u1__partner", model.ChannelTypeDirect)
		result := filterManuallyClosedDMEntries([]dmEntry{entry(dm, false)}, hideDM("partner"), "u1", nil)
		assert.Empty(t, result)
	})

	t.Run("read GM hidden by pref is excluded", func(t *testing.T) {
		gm := ch("gm1", "gm1", model.ChannelTypeGroup)
		result := filterManuallyClosedDMEntries([]dmEntry{entry(gm, false)}, hideGM("gm1"), "u1", nil)
		assert.Empty(t, result)
	})

	t.Run("channel pinned elsewhere is kept even when hidden by pref", func(t *testing.T) {
		dm := ch("c1", "partner__u1", model.ChannelTypeDirect)
		pinned := map[string]struct{}{"c1": {}}
		result := filterManuallyClosedDMEntries([]dmEntry{entry(dm, false)}, hideDM("partner"), "u1", pinned)
		assert.Len(t, result, 1)
	})

	t.Run("DM with no matching pref is kept", func(t *testing.T) {
		dm := ch("c1", "other__u1", model.ChannelTypeDirect)
		result := filterManuallyClosedDMEntries([]dmEntry{entry(dm, false)}, hideDM("partner"), "u1", nil)
		assert.Len(t, result, 1)
	})
}

// --- buildDirectUnreads ---

func TestBuildDirectUnreads(t *testing.T) {
	dmMember := func(chID string, msgCount, mentionCount, mentionCountRoot, urgentCount, msgCountRoot int64, muted bool) model.ChannelMemberWithTeamData {
		np := model.StringMap{}
		if muted {
			np[model.MarkUnreadNotifyProp] = model.ChannelMarkUnreadMention
		}
		return model.ChannelMemberWithTeamData{
			ChannelMember: model.ChannelMember{
				ChannelId:          chID,
				UserId:             "u1",
				MsgCount:           msgCount,
				MentionCount:       mentionCount,
				MentionCountRoot:   mentionCountRoot,
				UrgentMentionCount: urgentCount,
				MsgCountRoot:       msgCountRoot,
				NotifyProps:        np,
			},
			TeamName: "", // empty TeamName = DM/GM channel
		}
	}

	t.Run("returns nil when all counts are zero and no thread counts", func(t *testing.T) {
		members := model.ChannelMembersWithTeamData{dmMember("c1", 0, 0, 0, 0, 0, false)}
		assert.Nil(t, buildDirectUnreads("u1", members, nil, nil, false, false, 0, 0))
	})

	t.Run("non-CRT: accumulates MentionCount and sets HasUnreads from MsgCount", func(t *testing.T) {
		members := model.ChannelMembersWithTeamData{dmMember("c1", 3, 2, 0, 0, 0, false)}
		result := buildDirectUnreads("u1", members, nil, nil, false, false, 0, 0)
		require.NotNil(t, result)
		assert.Equal(t, int64(2), result.MentionCount)
		assert.True(t, result.HasUnreads)
	})

	t.Run("CRT: uses MentionCountRoot and MsgCountRoot", func(t *testing.T) {
		members := model.ChannelMembersWithTeamData{dmMember("c1", 0, 5, 3, 0, 2, false)}
		result := buildDirectUnreads("u1", members, nil, nil, true, false, 0, 0)
		require.NotNil(t, result)
		assert.Equal(t, int64(3), result.MentionCount)
		assert.Equal(t, int64(3), result.MentionCountRoot)
		assert.True(t, result.HasUnreads)
	})

	t.Run("muted channel is excluded entirely", func(t *testing.T) {
		members := model.ChannelMembersWithTeamData{dmMember("c1", 5, 5, 0, 0, 0, true)}
		assert.Nil(t, buildDirectUnreads("u1", members, nil, nil, false, false, 0, 0))
	})

	t.Run("regular team channel (TeamName != empty) is skipped", func(t *testing.T) {
		m := dmMember("c1", 5, 5, 0, 0, 0, false)
		m.TeamName = "someteam"
		assert.Nil(t, buildDirectUnreads("u1", model.ChannelMembersWithTeamData{m}, nil, nil, false, false, 0, 0))
	})

	t.Run("DM with deactivated user deactivated after last view is excluded", func(t *testing.T) {
		m := dmMember("c1", 5, 2, 0, 0, 0, false)
		m.LastViewedAt = 100
		profiles := map[string][]*model.User{"c1": {{Id: "partner", DeleteAt: 500}}}
		// partner.DeleteAt=500 > lastViewedAt=100 → excluded
		assert.Nil(t, buildDirectUnreads("u1", model.ChannelMembersWithTeamData{m}, profiles, nil, false, false, 0, 0))
	})

	t.Run("DM with deactivated user deactivated before last view is included", func(t *testing.T) {
		m := dmMember("c1", 5, 2, 0, 0, 0, false)
		m.LastViewedAt = 1000
		profiles := map[string][]*model.User{"c1": {{Id: "partner", DeleteAt: 500}}}
		// partner.DeleteAt=500 < lastViewedAt=1000 → included
		result := buildDirectUnreads("u1", model.ChannelMembersWithTeamData{m}, profiles, nil, false, false, 0, 0)
		require.NotNil(t, result)
		assert.Equal(t, int64(2), result.MentionCount)
	})

	t.Run("thread counts populate the result even with no channel unreads", func(t *testing.T) {
		result := buildDirectUnreads("u1", nil, nil, nil, true, true, 3, 1)
		require.NotNil(t, result)
		assert.Equal(t, int64(3), result.ThreadMentionCount)
		assert.Equal(t, int64(1), result.ThreadUrgentMentionCount)
		assert.True(t, result.ThreadHasUnreads)
	})

	t.Run("multiple channels accumulate counts", func(t *testing.T) {
		members := model.ChannelMembersWithTeamData{
			dmMember("c1", 1, 1, 0, 0, 0, false),
			dmMember("c2", 1, 2, 0, 0, 0, false),
		}
		result := buildDirectUnreads("u1", members, nil, nil, false, false, 0, 0)
		require.NotNil(t, result)
		assert.Equal(t, int64(3), result.MentionCount)
	})
}

// --- buildExperienceChannelLists ---

func TestBuildExperienceChannelLists(t *testing.T) {
	ch := func(id, teamID string, chType model.ChannelType) *model.Channel {
		return &model.Channel{Id: id, TeamId: teamID, Type: chType, DisplayName: "name-" + id}
	}
	member := func(chID string) model.ChannelMemberWithTeamData {
		return model.ChannelMemberWithTeamData{
			ChannelMember: model.ChannelMember{ChannelId: chID, UserId: "u1"},
		}
	}
	includeAll := func(_ *model.Channel) bool { return true }
	onlyTeam := func(teamID string) func(*model.Channel) bool {
		return func(c *model.Channel) bool { return c.TeamId == teamID }
	}

	t.Run("changed channel appears as full item", func(t *testing.T) {
		c1 := ch("c1", "t1", model.ChannelTypeOpen)
		chList, _ := buildExperienceChannelLists(model.ChannelList{c1}, model.ChannelList{c1}, nil, includeAll, nil)
		require.Len(t, chList, 1)
		assert.Equal(t, "c1", chList[0].Id)
		assert.Equal(t, "name-c1", chList[0].DisplayName) // full item, not slim
	})

	t.Run("include filter excludes non-matching channels", func(t *testing.T) {
		c1 := ch("c1", "t1", model.ChannelTypeOpen)
		c2 := ch("c2", "t2", model.ChannelTypeOpen)
		all := model.ChannelList{c1, c2}
		chList, _ := buildExperienceChannelLists(all, all, nil, onlyTeam("t1"), nil)
		require.Len(t, chList, 1)
		assert.Equal(t, "c1", chList[0].Id)
	})

	t.Run("changed member with unchanged channel produces slim companion", func(t *testing.T) {
		c1 := ch("c1", "t1", model.ChannelTypeOpen)
		chList, cmList := buildExperienceChannelLists(model.ChannelList{c1}, model.ChannelList{}, model.ChannelMembersWithTeamData{member("c1")}, includeAll, nil)
		require.Len(t, cmList, 1)
		require.Len(t, chList, 1)
		assert.Empty(t, chList[0].DisplayName) // slim item carries no display metadata
	})

	t.Run("changed member whose channel also changed produces no duplicate channel entry", func(t *testing.T) {
		c1 := ch("c1", "t1", model.ChannelTypeOpen)
		chList, _ := buildExperienceChannelLists(model.ChannelList{c1}, model.ChannelList{c1}, model.ChannelMembersWithTeamData{member("c1")}, includeAll, nil)
		assert.Len(t, chList, 1)
	})

	t.Run("GM channel gets MemberCount from gmMemberCounts", func(t *testing.T) {
		gm := ch("gm1", "", model.ChannelTypeGroup)
		counts := map[string]int64{"gm1": 5}
		chList, _ := buildExperienceChannelLists(model.ChannelList{gm}, model.ChannelList{gm}, nil, includeAll, counts)
		require.Len(t, chList, 1)
		assert.Equal(t, int64(5), chList[0].MemberCount)
	})

	t.Run("changed member whose channel is excluded by include produces no slim companion", func(t *testing.T) {
		c1 := ch("c1", "t2", model.ChannelTypeOpen)
		chList, cmList := buildExperienceChannelLists(model.ChannelList{c1}, model.ChannelList{}, model.ChannelMembersWithTeamData{member("c1")}, onlyTeam("t1"), nil)
		assert.Len(t, cmList, 1, "member is still included")
		assert.Empty(t, chList, "no companion because channel excluded by filter")
	})

	t.Run("changed member for unknown channel produces no slim companion", func(t *testing.T) {
		chList, cmList := buildExperienceChannelLists(model.ChannelList{}, model.ChannelList{}, model.ChannelMembersWithTeamData{member("unknown")}, includeAll, nil)
		assert.Len(t, cmList, 1)
		assert.Empty(t, chList)
	})
}

// --- buildDMLastViewedAt ---

func TestBuildDMLastViewedAt(t *testing.T) {
	cm := func(chID string, lastViewedAt int64) map[string]*model.ChannelMemberWithTeamData {
		return map[string]*model.ChannelMemberWithTeamData{
			chID: {ChannelMember: model.ChannelMember{ChannelId: chID, LastViewedAt: lastViewedAt}},
		}
	}
	pref := func(category, name, value string) model.Preference {
		return model.Preference{UserId: "u1", Category: category, Name: name, Value: value}
	}

	t.Run("uses LastViewedAt when no overriding preference", func(t *testing.T) {
		lva := buildDMLastViewedAt(cm("c1", 500), nil)
		assert.Equal(t, int64(500), lva["c1"])
	})

	t.Run("channel_approximate_view_time wins when greater", func(t *testing.T) {
		prefs := model.Preferences{pref(preferenceChannelApproximateViewTime, "c1", "1000")}
		lva := buildDMLastViewedAt(cm("c1", 500), prefs)
		assert.Equal(t, int64(1000), lva["c1"])
	})

	t.Run("channel_open_time wins when greater", func(t *testing.T) {
		prefs := model.Preferences{pref(preferenceChannelOpenTime, "c1", "800")}
		lva := buildDMLastViewedAt(cm("c1", 500), prefs)
		assert.Equal(t, int64(800), lva["c1"])
	})

	t.Run("LastViewedAt wins when greater than preference value", func(t *testing.T) {
		prefs := model.Preferences{pref(preferenceChannelApproximateViewTime, "c1", "200")}
		lva := buildDMLastViewedAt(cm("c1", 500), prefs)
		assert.Equal(t, int64(500), lva["c1"])
	})

	t.Run("invalid preference value is ignored", func(t *testing.T) {
		prefs := model.Preferences{pref(preferenceChannelApproximateViewTime, "c1", "not-a-number")}
		lva := buildDMLastViewedAt(cm("c1", 500), prefs)
		assert.Equal(t, int64(500), lva["c1"])
	})

	t.Run("preference for unknown channel does not panic", func(t *testing.T) {
		prefs := model.Preferences{pref(preferenceChannelApproximateViewTime, "unknown", "1000")}
		lva := buildDMLastViewedAt(cm("c1", 500), prefs)
		assert.Equal(t, int64(500), lva["c1"])
		assert.Equal(t, int64(1000), lva["unknown"]) // initialised from pref only
	})
}

// --- toExperienceTeamMemberList ---

func TestToExperienceTeamMemberList(t *testing.T) {
	member := func(teamID string) *model.TeamMember {
		return &model.TeamMember{TeamId: teamID, UserId: "u1", Roles: "member", SchemeUser: true}
	}

	t.Run("tombstoned members excluded from Members and appear in RemovedTeamIds", func(t *testing.T) {
		members := []*model.TeamMember{member("t1"), member("t2")}
		tombstoned := map[string]struct{}{"t2": {}}
		result := toExperienceTeamMemberList(members, tombstoned)
		assert.Len(t, result.Members, 1)
		assert.Equal(t, "t1", result.Members[0].TeamId)
		assert.Contains(t, result.RemovedTeamIds, "t2")
	})

	t.Run("no tombstones: all members included, RemovedTeamIds empty", func(t *testing.T) {
		members := []*model.TeamMember{member("t1"), member("t2")}
		result := toExperienceTeamMemberList(members, map[string]struct{}{})
		assert.Len(t, result.Members, 2)
		assert.Empty(t, result.RemovedTeamIds)
	})

	t.Run("tombstone with no matching member still appears in RemovedTeamIds", func(t *testing.T) {
		tombstoned := map[string]struct{}{"t-ghost": {}}
		result := toExperienceTeamMemberList(nil, tombstoned)
		assert.Empty(t, result.Members)
		assert.Contains(t, result.RemovedTeamIds, "t-ghost")
	})

	t.Run("member fields are correctly mapped", func(t *testing.T) {
		m := &model.TeamMember{TeamId: "t1", UserId: "u1", Roles: "team_admin", DeleteAt: 0, SchemeGuest: false, SchemeUser: true, SchemeAdmin: true}
		result := toExperienceTeamMemberList([]*model.TeamMember{m}, map[string]struct{}{})
		require.Len(t, result.Members, 1)
		em := result.Members[0]
		assert.Equal(t, "t1", em.TeamId)
		assert.Equal(t, "u1", em.UserId)
		assert.Equal(t, "team_admin", em.Roles)
		assert.True(t, em.SchemeAdmin)
	})
}

// --- toExperienceTeamUnreads ---

func TestToExperienceTeamUnreads(t *testing.T) {
	unread := &model.TeamUnread{
		TeamId:                   "t1",
		MentionCount:             5,
		MentionCountRoot:         3,
		MsgCount:                 10,
		ThreadMentionCount:       2,
		ThreadUrgentMentionCount: 1,
		ThreadCount:              4,
	}

	t.Run("non-CRT uses full MentionCount", func(t *testing.T) {
		u := toExperienceTeamUnreads("t1", unread, false)
		assert.Equal(t, "t1", u.TeamID)
		assert.Equal(t, int64(5), u.MentionCount)
		assert.Equal(t, int64(0), u.MentionCountRoot)
	})

	t.Run("CRT uses MentionCountRoot for both MentionCount and MentionCountRoot", func(t *testing.T) {
		u := toExperienceTeamUnreads("t1", unread, true)
		assert.Equal(t, int64(3), u.MentionCount)
		assert.Equal(t, int64(3), u.MentionCountRoot)
	})

	t.Run("HasUnreads true when MsgCount > 0", func(t *testing.T) {
		u := toExperienceTeamUnreads("t1", unread, false)
		assert.True(t, u.HasUnreads)
	})

	t.Run("HasUnreads false when MsgCount == 0", func(t *testing.T) {
		u := toExperienceTeamUnreads("t1", &model.TeamUnread{MsgCount: 0}, false)
		assert.False(t, u.HasUnreads)
	})

	t.Run("ThreadHasUnreads true when ThreadCount > 0", func(t *testing.T) {
		u := toExperienceTeamUnreads("t1", &model.TeamUnread{ThreadCount: 1}, false)
		assert.True(t, u.ThreadHasUnreads)
	})

	t.Run("ThreadHasUnreads true when ThreadMentionCount > 0 even with no ThreadCount", func(t *testing.T) {
		u := toExperienceTeamUnreads("t1", &model.TeamUnread{ThreadMentionCount: 1}, false)
		assert.True(t, u.ThreadHasUnreads)
	})

	t.Run("ThreadHasUnreads false when both ThreadCount and ThreadMentionCount are zero", func(t *testing.T) {
		u := toExperienceTeamUnreads("t1", &model.TeamUnread{}, false)
		assert.False(t, u.ThreadHasUnreads)
	})

	t.Run("nil unread returns zero counts with TeamID preserved", func(t *testing.T) {
		u := toExperienceTeamUnreads("t1", nil, false)
		assert.Equal(t, "t1", u.TeamID)
		assert.Equal(t, int64(0), u.MentionCount)
		assert.False(t, u.HasUnreads)
		assert.False(t, u.ThreadHasUnreads)
	})
}

// --- buildTombstonedTeamIDs ---

func TestBuildTombstonedTeamIDs(t *testing.T) {
	t.Run("soft-deleted membership is tombstoned", func(t *testing.T) {
		members := []*model.TeamMember{
			{TeamId: "t1", DeleteAt: 1},
			{TeamId: "t2", DeleteAt: 0},
		}
		result := buildTombstonedTeamIDs(members, nil)
		assert.Contains(t, result, "t1")
		assert.NotContains(t, result, "t2")
	})

	t.Run("archived team is tombstoned", func(t *testing.T) {
		result := buildTombstonedTeamIDs(nil, []*model.Team{{Id: "t3"}})
		assert.Contains(t, result, "t3")
	})

	t.Run("team appearing in both sources is not duplicated", func(t *testing.T) {
		members := []*model.TeamMember{{TeamId: "t1", DeleteAt: 1}}
		deleted := []*model.Team{{Id: "t1"}}
		result := buildTombstonedTeamIDs(members, deleted)
		assert.Len(t, result, 1)
	})

	t.Run("nil inputs return empty map", func(t *testing.T) {
		result := buildTombstonedTeamIDs(nil, nil)
		assert.Empty(t, result)
	})
}

// --- filterChannelsSince ---

func TestFilterChannelsSince(t *testing.T) {
	ch := func(id string, updatedAt int64, chType model.ChannelType) *model.Channel {
		return &model.Channel{Id: id, UpdateAt: updatedAt, Type: chType}
	}
	user := func(updatedAt int64) *model.User {
		return &model.User{Id: model.NewId(), UpdateAt: updatedAt}
	}
	const since = int64(100)

	t.Run("regular channel updated after cursor is included", func(t *testing.T) {
		out := filterChannelsSince(model.ChannelList{ch("c1", 200, model.ChannelTypeOpen)}, nil, since)
		assert.Len(t, out, 1)
	})

	t.Run("regular channel updated at or before cursor is excluded", func(t *testing.T) {
		out := filterChannelsSince(model.ChannelList{ch("c1", 100, model.ChannelTypeOpen)}, nil, since)
		assert.Empty(t, out)
	})

	t.Run("DM channel unchanged but member profile updated is included", func(t *testing.T) {
		dm := ch("dm1", 50, model.ChannelTypeDirect)
		profiles := map[string][]*model.User{"dm1": {user(200)}}
		out := filterChannelsSince(model.ChannelList{dm}, profiles, since)
		assert.Len(t, out, 1)
	})

	t.Run("GM channel unchanged but member profile updated is included", func(t *testing.T) {
		gm := ch("gm1", 50, model.ChannelTypeGroup)
		profiles := map[string][]*model.User{"gm1": {user(50), user(200)}}
		out := filterChannelsSince(model.ChannelList{gm}, profiles, since)
		assert.Len(t, out, 1)
	})

	t.Run("DM channel unchanged and all profiles unchanged is excluded", func(t *testing.T) {
		dm := ch("dm1", 50, model.ChannelTypeDirect)
		profiles := map[string][]*model.User{"dm1": {user(50)}}
		out := filterChannelsSince(model.ChannelList{dm}, profiles, since)
		assert.Empty(t, out)
	})

	t.Run("DM channel updated after cursor is included even without profiles", func(t *testing.T) {
		dm := ch("dm1", 200, model.ChannelTypeDirect)
		out := filterChannelsSince(model.ChannelList{dm}, nil, since)
		assert.Len(t, out, 1)
	})

	t.Run("channel not duplicated when both channel and profile changed", func(t *testing.T) {
		dm := ch("dm1", 200, model.ChannelTypeDirect)
		profiles := map[string][]*model.User{"dm1": {user(200)}}
		out := filterChannelsSince(model.ChannelList{dm}, profiles, since)
		assert.Len(t, out, 1)
	})
}

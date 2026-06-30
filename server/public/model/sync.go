// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package model

type ExperienceSyncRequest struct {
	Since int64               `json:"since"`
	Scope ExperienceSyncScope `json:"scope"`
}

type ExperienceSyncScope struct {
	TeamIDs             []string `json:"team_ids"`
	ActiveChannelID     string   `json:"active_channel_id,omitempty"`
	ActiveThreadID      string   `json:"active_thread_id,omitempty"`
	GlobalThreadsTeamID string   `json:"global_threads_team_id,omitempty"`
}

type ExperienceSyncResponse struct {
	Config  map[string]string `json:"config,omitempty"`
	License map[string]string `json:"license,omitempty"`

	Me             *User    `json:"me,omitempty"`
	RemovedTeamIDs []string `json:"removed_team_ids,omitempty"`

	TeamsUnreads         []*SyncTeamUnread               `json:"teams_unreads,omitempty"`
	Teams                []*ExperienceSyncTeamDelta      `json:"teams,omitempty"`
	DirectChannels       []*ChannelLoadItem              `json:"direct_channels,omitempty"`
	DirectChannelMembers ChannelMemberLoadList           `json:"direct_channel_members"`
	DirectChannelCounts  *InitialLoadDirectCounts        `json:"direct_channel_counts,omitempty"`
	Preferences          Preferences                     `json:"preferences,omitempty"`
	PreferenceTombstones []PreferenceTombstone           `json:"preference_tombstones,omitempty"`
	GroupMemberships     *InitialLoadGroupMembershipList `json:"group_memberships,omitempty"`
	Roles                []*RoleLoadItem                 `json:"roles,omitempty"`

	Posts   []*Post  `json:"posts,omitempty"`
	Authors []*User  `json:"authors,omitempty"`
	Groups  []*Group `json:"groups,omitempty"`

	ActiveChannel *ExperienceSyncActiveChannel `json:"active_channel,omitempty"`
	ActiveThread  *ExperienceSyncActiveThread  `json:"active_thread,omitempty"`
	ThreadsDelta  *ExperienceSyncThreadsDelta  `json:"threads_delta,omitempty"`

	Timestamp int64 `json:"timestamp"`
}

type ExperienceSyncTeamDelta struct {
	TeamID         string                   `json:"team_id"`
	Team           *InitialLoadTeam         `json:"team,omitempty"`
	Memberships    []*InitialLoadTeamMember `json:"memberships,omitempty"`
	Channels       []*ChannelLoadItem       `json:"channels,omitempty"`
	ChannelMembers ChannelMemberLoadList    `json:"channel_members"`
}

type ExperienceSyncActiveChannel struct {
	ChannelID         string                         `json:"channel_id"`
	PostsOrder        []string                       `json:"posts_order,omitempty"`
	Stats             *ChannelStats                  `json:"stats,omitempty"`
	Bookmarks         []*ChannelBookmarkWithFileInfo `json:"bookmarks,omitempty"`
	ConstrainedGroups []*GroupWithSchemeAdmin        `json:"constrained_groups,omitempty"`
}

type ExperienceSyncActiveThread struct {
	RootID     string   `json:"root_id"`
	PostsOrder []string `json:"posts_order,omitempty"`
}

type ExperienceSyncThreadsDelta struct {
	TeamID              string                  `json:"team_id"`
	Threads             []*ExperienceSyncThread `json:"threads,omitempty"`
	Total               int64                   `json:"total"`
	TotalUnreadMentions int64                   `json:"total_unread_mentions"`
	TotalUnreadThreads  int64                   `json:"total_unread_threads"`
}

type ExperienceSyncThread struct {
	ID             string `json:"id"`
	ReplyCount     int64  `json:"reply_count"`
	LastReplyAt    int64  `json:"last_reply_at"`
	LastViewedAt   int64  `json:"last_viewed_at"`
	UnreadReplies  int64  `json:"unread_replies"`
	UnreadMentions int64  `json:"unread_mentions"`
	IsFollowing    bool   `json:"is_following"`
	DeleteAt       int64  `json:"delete_at,omitempty"`
}

// SyncTeamUnread carries badge counts for one team. Same fields as
// InitialLoadDirectCounts but scoped to a specific team_id.
type SyncTeamUnread struct {
	TeamID                   string `json:"team_id"`
	MentionCount             int64  `json:"mention_count"`
	MentionCountRoot         int64  `json:"mention_count_root,omitempty"`
	UrgentMentionCount       int64  `json:"urgent_mention_count,omitempty"`
	HasUnreads               bool   `json:"has_unreads"`
	ThreadMentionCount       int64  `json:"thread_mention_count,omitempty"`
	ThreadUrgentMentionCount int64  `json:"thread_urgent_mention_count,omitempty"`
	ThreadHasUnreads         bool   `json:"thread_has_unreads,omitempty"`
}

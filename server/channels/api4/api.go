// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package api4

import (
	"net/http"

	"github.com/gorilla/mux"
	_ "github.com/mattermost/go-i18n/i18n"

	"github.com/hanzoai/team/server/public/model"
	"github.com/hanzoai/team/server/v8/channels/app"
	"github.com/hanzoai/team/server/v8/channels/manualtesting"
	"github.com/hanzoai/team/server/v8/channels/web"
)

type Routes struct {
	Root    *mux.Router // ''
	APIRoot *mux.Router // 'v1/team'

	Users          *mux.Router // 'v1/team/users'
	User           *mux.Router // 'v1/team/users/{user_id:[A-Za-z0-9]+}'
	UserByUsername *mux.Router // 'v1/team/users/username/{username:[A-Za-z0-9\\_\\-\\.]+}'
	UserByEmail    *mux.Router // 'v1/team/users/email/{email:.+}'

	Bots *mux.Router // 'v1/team/bots'
	Bot  *mux.Router // 'v1/team/bots/{bot_user_id:[A-Za-z0-9]+}'

	Teams              *mux.Router // 'v1/team/teams'
	TeamsForUser       *mux.Router // 'v1/team/users/{user_id:[A-Za-z0-9]+}/teams'
	Team               *mux.Router // 'v1/team/teams/{team_id:[A-Za-z0-9]+}'
	TeamForUser        *mux.Router // 'v1/team/users/{user_id:[A-Za-z0-9]+}/teams/{team_id:[A-Za-z0-9]+}'
	UserThreads        *mux.Router // 'v1/team/users/{user_id:[A-Za-z0-9]+}/teams/{team_id:[A-Za-z0-9]+}/threads'
	UserThread         *mux.Router // 'v1/team/users/{user_id:[A-Za-z0-9]+}/teams/{team_id:[A-Za-z0-9]+}/threads/{thread_id:[A-Za-z0-9]+}'
	TeamByName         *mux.Router // 'v1/team/teams/name/{team_name:[A-Za-z0-9_-]+}'
	TeamMembers        *mux.Router // 'v1/team/teams/{team_id:[A-Za-z0-9]+}/members'
	TeamMember         *mux.Router // 'v1/team/teams/{team_id:[A-Za-z0-9]+}/members/{user_id:[A-Za-z0-9]+}'
	TeamMembersForUser *mux.Router // 'v1/team/users/{user_id:[A-Za-z0-9]+}/teams/members'

	Channels                 *mux.Router // 'v1/team/channels'
	Channel                  *mux.Router // 'v1/team/channels/{channel_id:[A-Za-z0-9]+}'
	ChannelForUser           *mux.Router // 'v1/team/users/{user_id:[A-Za-z0-9]+}/channels/{channel_id:[A-Za-z0-9]+}'
	ChannelByName            *mux.Router // 'v1/team/teams/{team_id:[A-Za-z0-9]+}/channels/name/{channel_name:[A-Za-z0-9_-]+}'
	ChannelByNameForTeamName *mux.Router // 'v1/team/teams/name/{team_name:[A-Za-z0-9_-]+}/channels/name/{channel_name:[A-Za-z0-9_-]+}'
	ChannelsForTeam          *mux.Router // 'v1/team/teams/{team_id:[A-Za-z0-9]+}/channels'
	ChannelMembers           *mux.Router // 'v1/team/channels/{channel_id:[A-Za-z0-9]+}/members'
	ChannelMember            *mux.Router // 'v1/team/channels/{channel_id:[A-Za-z0-9]+}/members/{user_id:[A-Za-z0-9]+}'
	ChannelMembersForUser    *mux.Router // 'v1/team/users/{user_id:[A-Za-z0-9]+}/teams/{team_id:[A-Za-z0-9]+}/channels/members'
	ChannelModerations       *mux.Router // 'v1/team/channels/{channel_id:[A-Za-z0-9]+}/moderations'
	ChannelCategories        *mux.Router // 'v1/team/users/{user_id:[A-Za-z0-9]+}/teams/{team_id:[A-Za-z0-9]+}/channels/categories'
	ChannelBookmarks         *mux.Router // 'v1/team/channels/{channel_id:[A-Za-z0-9]+}/bookmarks'
	ChannelBookmark          *mux.Router // 'v1/team/channels/{channel_id:[A-Za-z0-9]+}/bookmarks/{bookmark_id:[A-Za-z0-9]+}'
	ChannelViews             *mux.Router // 'v1/team/channels/{channel_id:[A-Za-z0-9]+}/views'
	ChannelView              *mux.Router // 'v1/team/channels/{channel_id:[A-Za-z0-9]+}/views/{view_id:[A-Za-z0-9]+}'
	ChannelViewPosts         *mux.Router // 'v1/team/channels/{channel_id:[A-Za-z0-9]+}/views/{view_id:[A-Za-z0-9]+}/posts'

	Posts           *mux.Router // 'v1/team/posts'
	Post            *mux.Router // 'v1/team/posts/{post_id:[A-Za-z0-9]+}'
	PostsForChannel *mux.Router // 'v1/team/channels/{channel_id:[A-Za-z0-9]+}/posts'
	PostsForUser    *mux.Router // 'v1/team/users/{user_id:[A-Za-z0-9]+}/posts'
	PostForUser     *mux.Router // 'v1/team/users/{user_id:[A-Za-z0-9]+}/posts/{post_id:[A-Za-z0-9]+}'

	Files *mux.Router // 'v1/team/files'
	File  *mux.Router // 'v1/team/files/{file_id:[A-Za-z0-9]+}'

	Uploads *mux.Router // 'v1/team/uploads'
	Upload  *mux.Router // 'v1/team/uploads/{upload_id:[A-Za-z0-9]+}'

	Plugins *mux.Router // 'v1/team/plugins'
	Plugin  *mux.Router // 'v1/team/plugins/{plugin_id:[A-Za-z0-9\\_\\-\\.]+}'

	PublicFile *mux.Router // '/files/{file_id:[A-Za-z0-9]+}/public'

	Commands *mux.Router // 'v1/team/commands'
	Command  *mux.Router // 'v1/team/commands/{command_id:[A-Za-z0-9]+}'

	Hooks         *mux.Router // 'v1/team/hooks'
	IncomingHooks *mux.Router // 'v1/team/hooks/incoming'
	IncomingHook  *mux.Router // 'v1/team/hooks/incoming/{hook_id:[A-Za-z0-9]+}'
	OutgoingHooks *mux.Router // 'v1/team/hooks/outgoing'
	OutgoingHook  *mux.Router // 'v1/team/hooks/outgoing/{hook_id:[A-Za-z0-9]+}'

	OAuth     *mux.Router // 'v1/team/oauth'
	OAuthApps *mux.Router // 'v1/team/oauth/apps'
	OAuthApp  *mux.Router // 'v1/team/oauth/apps/{app_id:[A-Za-z0-9]+}'

	SAML       *mux.Router // 'v1/team/saml'
	Compliance *mux.Router // 'v1/team/compliance'
	Cluster    *mux.Router // 'v1/team/cluster'

	Image *mux.Router // 'v1/team/image'

	LDAP *mux.Router // 'v1/team/ldap'

	Elasticsearch *mux.Router // 'v1/team/elasticsearch'

	DataRetention *mux.Router // 'v1/team/data_retention'

	Brand *mux.Router // 'v1/team/brand'

	System *mux.Router // 'v1/team/system'

	Jobs *mux.Router // 'v1/team/jobs'

	Recaps *mux.Router // 'v1/team/recaps'

	ScheduledRecaps *mux.Router // 'v1/team/scheduled_recaps'
	ScheduledRecap  *mux.Router // 'v1/team/scheduled_recaps/{scheduled_recap_id:[A-Za-z0-9]+}'

	Preferences *mux.Router // 'v1/team/users/{user_id:[A-Za-z0-9]+}/preferences'

	License *mux.Router // 'v1/team/license'

	Public *mux.Router // 'v1/team/public'

	Reactions *mux.Router // 'v1/team/reactions'

	Roles   *mux.Router // 'v1/team/roles'
	Schemes *mux.Router // 'v1/team/schemes'

	Emojis      *mux.Router // 'v1/team/emoji'
	Emoji       *mux.Router // 'v1/team/emoji/{emoji_id:[A-Za-z0-9]+}'
	EmojiByName *mux.Router // 'v1/team/emoji/name/{emoji_name:[A-Za-z0-9\\_\\-\\+]+}'

	ReactionByNameForPostForUser *mux.Router // 'v1/team/users/{user_id:[A-Za-z0-9]+}/posts/{post_id:[A-Za-z0-9]+}/reactions/{emoji_name:[A-Za-z0-9\\_\\-\\+]+}'

	TermsOfService *mux.Router // 'v1/team/terms_of_service'
	Groups         *mux.Router // 'v1/team/groups'

	Imports *mux.Router // 'v1/team/imports'
	Import  *mux.Router // 'v1/team/imports/{import_name:.+\\.zip}'

	Exports *mux.Router // 'v1/team/exports'
	Export  *mux.Router // 'v1/team/exports/{export_name:.+\\.zip}'

	RemoteCluster        *mux.Router // 'v1/team/remotecluster'
	SharedChannels       *mux.Router // 'v1/team/sharedchannels'
	ChannelForRemote     *mux.Router // 'v1/team/remotecluster/{remote_id:[A-Za-z0-9]+}/channels/{channel_id:[A-Za-z0-9]+}'
	SharedChannelRemotes *mux.Router // 'v1/team/remotecluster/{remote_id:[A-Za-z0-9]+}/sharedchannelremotes'

	Permissions *mux.Router // 'v1/team/permissions'

	Usage *mux.Router // 'v1/team/usage'

	HostedCustomer *mux.Router // 'v1/team/hosted_customer'

	Drafts *mux.Router // 'v1/team/drafts'

	Reports *mux.Router // 'v1/team/reports'

	OutgoingOAuthConnections *mux.Router // 'v1/team/oauth/outgoing_connections'
	OutgoingOAuthConnection  *mux.Router // 'v1/team/oauth/outgoing_connections/{outgoing_oauth_connection_id:[A-Za-z0-9]+}'

	CustomProfileAttributes       *mux.Router // 'v1/team/custom_profile_attributes'
	CustomProfileAttributesFields *mux.Router // 'v1/team/custom_profile_attributes/fields'
	CustomProfileAttributesField  *mux.Router // 'v1/team/custom_profile_attributes/fields/{field_id:[A-Za-z0-9]+}'
	CustomProfileAttributesValues *mux.Router // 'v1/team/custom_profile_attributes/values'

	AuditLogs *mux.Router // 'v1/team/audit_logs'

	AccessControlPolicies *mux.Router // 'v1/team/access_control_policies'
	AccessControlPolicy   *mux.Router // 'v1/team/access_control_policies/{policy_id:[A-Za-z0-9]+}'

	ContentFlagging *mux.Router // 'v1/team/content_flagging'

	Agents      *mux.Router // 'v1/team/agents'
	LLMServices *mux.Router // 'v1/team/llmservices'

	Boards *mux.Router // 'v1/team/boards'

	Properties           *mux.Router // 'v1/team/properties'
	PropertyFields       *mux.Router // 'v1/team/properties/groups/{group_name:[a-z][a-z0-9_]*}/{object_type:[a-z]+}/fields'
	PropertyField        *mux.Router // 'v1/team/properties/groups/{group_name:[a-z][a-z0-9_]*}/{object_type:[a-z]+}/fields/{field_id:[A-Za-z0-9]+}'
	PropertyFieldsSearch *mux.Router // 'v1/team/properties/groups/{group_name:[a-z][a-z0-9_]*}/fields/search'
	PropertyValues       *mux.Router // 'v1/team/properties/groups/{group_name:[a-z][a-z0-9_]*}/{object_type:[a-z]+}/values/{target_id:[A-Za-z0-9]+}'
	PropertySystemValues *mux.Router // 'v1/team/properties/groups/{group_name:[a-z][a-z0-9_]*}/system/values'
}

type API struct {
	srv        *app.Server
	BaseRoutes *Routes
}

func Init(srv *app.Server) (*API, error) {
	api := &API{
		srv:        srv,
		BaseRoutes: &Routes{},
	}

	api.BaseRoutes.Root = srv.Router
	api.BaseRoutes.APIRoot = srv.Router.PathPrefix(model.APIURLSuffix).Subrouter()

	api.BaseRoutes.Users = api.BaseRoutes.APIRoot.PathPrefix("/users").Subrouter()
	api.BaseRoutes.User = api.BaseRoutes.APIRoot.PathPrefix("/users/{user_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.UserByUsername = api.BaseRoutes.Users.PathPrefix("/username/{username:[A-Za-z0-9\\_\\-\\.]+}").Subrouter()
	api.BaseRoutes.UserByEmail = api.BaseRoutes.Users.PathPrefix("/email/{email:.+}").Subrouter()

	api.BaseRoutes.Bots = api.BaseRoutes.APIRoot.PathPrefix("/bots").Subrouter()
	api.BaseRoutes.Bot = api.BaseRoutes.APIRoot.PathPrefix("/bots/{bot_user_id:[A-Za-z0-9]+}").Subrouter()

	api.BaseRoutes.Teams = api.BaseRoutes.APIRoot.PathPrefix("/teams").Subrouter()
	api.BaseRoutes.TeamsForUser = api.BaseRoutes.User.PathPrefix("/teams").Subrouter()
	api.BaseRoutes.Team = api.BaseRoutes.Teams.PathPrefix("/{team_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.TeamForUser = api.BaseRoutes.TeamsForUser.PathPrefix("/{team_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.UserThreads = api.BaseRoutes.TeamForUser.PathPrefix("/threads").Subrouter()
	api.BaseRoutes.UserThread = api.BaseRoutes.TeamForUser.PathPrefix("/threads/{thread_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.TeamByName = api.BaseRoutes.Teams.PathPrefix("/name/{team_name:[A-Za-z0-9_-]+}").Subrouter()
	api.BaseRoutes.TeamMembers = api.BaseRoutes.Team.PathPrefix("/members").Subrouter()
	api.BaseRoutes.TeamMember = api.BaseRoutes.TeamMembers.PathPrefix("/{user_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.TeamMembersForUser = api.BaseRoutes.User.PathPrefix("/teams/members").Subrouter()

	api.BaseRoutes.Channels = api.BaseRoutes.APIRoot.PathPrefix("/channels").Subrouter()
	api.BaseRoutes.Channel = api.BaseRoutes.Channels.PathPrefix("/{channel_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.ChannelForUser = api.BaseRoutes.User.PathPrefix("/channels/{channel_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.ChannelByName = api.BaseRoutes.Team.PathPrefix("/channels/name/{channel_name:[A-Za-z0-9_-]+}").Subrouter()
	api.BaseRoutes.ChannelByNameForTeamName = api.BaseRoutes.TeamByName.PathPrefix("/channels/name/{channel_name:[A-Za-z0-9_-]+}").Subrouter()
	api.BaseRoutes.ChannelsForTeam = api.BaseRoutes.Team.PathPrefix("/channels").Subrouter()
	api.BaseRoutes.ChannelMembers = api.BaseRoutes.Channel.PathPrefix("/members").Subrouter()
	api.BaseRoutes.ChannelMember = api.BaseRoutes.ChannelMembers.PathPrefix("/{user_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.ChannelMembersForUser = api.BaseRoutes.User.PathPrefix("/teams/{team_id:[A-Za-z0-9]+}/channels/members").Subrouter()
	api.BaseRoutes.ChannelModerations = api.BaseRoutes.Channel.PathPrefix("/moderations").Subrouter()
	api.BaseRoutes.ChannelCategories = api.BaseRoutes.User.PathPrefix("/teams/{team_id:[A-Za-z0-9]+}/channels/categories").Subrouter()
	api.BaseRoutes.ChannelBookmarks = api.BaseRoutes.Channel.PathPrefix("/bookmarks").Subrouter()
	api.BaseRoutes.ChannelBookmark = api.BaseRoutes.ChannelBookmarks.PathPrefix("/{bookmark_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.ChannelViews = api.BaseRoutes.Channel.PathPrefix("/views").Subrouter()
	api.BaseRoutes.ChannelView = api.BaseRoutes.ChannelViews.PathPrefix("/{view_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.ChannelViewPosts = api.BaseRoutes.ChannelView.PathPrefix("/posts").Subrouter()

	api.BaseRoutes.Posts = api.BaseRoutes.APIRoot.PathPrefix("/posts").Subrouter()
	api.BaseRoutes.Post = api.BaseRoutes.Posts.PathPrefix("/{post_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.PostsForChannel = api.BaseRoutes.Channel.PathPrefix("/posts").Subrouter()
	api.BaseRoutes.PostsForUser = api.BaseRoutes.User.PathPrefix("/posts").Subrouter()
	api.BaseRoutes.PostForUser = api.BaseRoutes.PostsForUser.PathPrefix("/{post_id:[A-Za-z0-9]+}").Subrouter()

	api.BaseRoutes.Files = api.BaseRoutes.APIRoot.PathPrefix("/files").Subrouter()
	api.BaseRoutes.File = api.BaseRoutes.Files.PathPrefix("/{file_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.PublicFile = api.BaseRoutes.Root.PathPrefix("/files/{file_id:[A-Za-z0-9]+}/public").Subrouter()

	api.BaseRoutes.Uploads = api.BaseRoutes.APIRoot.PathPrefix("/uploads").Subrouter()
	api.BaseRoutes.Upload = api.BaseRoutes.Uploads.PathPrefix("/{upload_id:[A-Za-z0-9]+}").Subrouter()

	api.BaseRoutes.Plugins = api.BaseRoutes.APIRoot.PathPrefix("/plugins").Subrouter()
	api.BaseRoutes.Plugin = api.BaseRoutes.Plugins.PathPrefix("/{plugin_id:[A-Za-z0-9\\_\\-\\.]+}").Subrouter()

	api.BaseRoutes.Commands = api.BaseRoutes.APIRoot.PathPrefix("/commands").Subrouter()
	api.BaseRoutes.Command = api.BaseRoutes.Commands.PathPrefix("/{command_id:[A-Za-z0-9]+}").Subrouter()

	api.BaseRoutes.Hooks = api.BaseRoutes.APIRoot.PathPrefix("/hooks").Subrouter()
	api.BaseRoutes.IncomingHooks = api.BaseRoutes.Hooks.PathPrefix("/incoming").Subrouter()
	api.BaseRoutes.IncomingHook = api.BaseRoutes.IncomingHooks.PathPrefix("/{hook_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.OutgoingHooks = api.BaseRoutes.Hooks.PathPrefix("/outgoing").Subrouter()
	api.BaseRoutes.OutgoingHook = api.BaseRoutes.OutgoingHooks.PathPrefix("/{hook_id:[A-Za-z0-9]+}").Subrouter()

	api.BaseRoutes.SAML = api.BaseRoutes.APIRoot.PathPrefix("/saml").Subrouter()

	api.BaseRoutes.OAuth = api.BaseRoutes.APIRoot.PathPrefix("/oauth").Subrouter()
	api.BaseRoutes.OAuthApps = api.BaseRoutes.OAuth.PathPrefix("/apps").Subrouter()
	api.BaseRoutes.OAuthApp = api.BaseRoutes.OAuthApps.PathPrefix("/{app_id:[A-Za-z0-9]+}").Subrouter()

	api.BaseRoutes.Compliance = api.BaseRoutes.APIRoot.PathPrefix("/compliance").Subrouter()
	api.BaseRoutes.Cluster = api.BaseRoutes.APIRoot.PathPrefix("/cluster").Subrouter()
	api.BaseRoutes.LDAP = api.BaseRoutes.APIRoot.PathPrefix("/ldap").Subrouter()
	api.BaseRoutes.Brand = api.BaseRoutes.APIRoot.PathPrefix("/brand").Subrouter()
	api.BaseRoutes.System = api.BaseRoutes.APIRoot.PathPrefix("/system").Subrouter()
	api.BaseRoutes.Preferences = api.BaseRoutes.User.PathPrefix("/preferences").Subrouter()
	api.BaseRoutes.License = api.BaseRoutes.APIRoot.PathPrefix("/license").Subrouter()
	api.BaseRoutes.Public = api.BaseRoutes.APIRoot.PathPrefix("/public").Subrouter()
	api.BaseRoutes.Reactions = api.BaseRoutes.APIRoot.PathPrefix("/reactions").Subrouter()
	api.BaseRoutes.Jobs = api.BaseRoutes.APIRoot.PathPrefix("/jobs").Subrouter()
	api.BaseRoutes.Recaps = api.BaseRoutes.APIRoot.PathPrefix("/recaps").Subrouter()
	api.BaseRoutes.ScheduledRecaps = api.BaseRoutes.APIRoot.PathPrefix("/scheduled_recaps").Subrouter()
	api.BaseRoutes.ScheduledRecap = api.BaseRoutes.ScheduledRecaps.PathPrefix("/{scheduled_recap_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.Elasticsearch = api.BaseRoutes.APIRoot.PathPrefix("/elasticsearch").Subrouter()
	api.BaseRoutes.DataRetention = api.BaseRoutes.APIRoot.PathPrefix("/data_retention").Subrouter()

	api.BaseRoutes.Emojis = api.BaseRoutes.APIRoot.PathPrefix("/emoji").Subrouter()
	api.BaseRoutes.Emoji = api.BaseRoutes.APIRoot.PathPrefix("/emoji/{emoji_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.EmojiByName = api.BaseRoutes.Emojis.PathPrefix("/name/{emoji_name:[A-Za-z0-9\\_\\-\\+]+}").Subrouter()

	api.BaseRoutes.ReactionByNameForPostForUser = api.BaseRoutes.PostForUser.PathPrefix("/reactions/{emoji_name:[A-Za-z0-9\\_\\-\\+]+}").Subrouter()

	api.BaseRoutes.Roles = api.BaseRoutes.APIRoot.PathPrefix("/roles").Subrouter()
	api.BaseRoutes.Schemes = api.BaseRoutes.APIRoot.PathPrefix("/schemes").Subrouter()

	api.BaseRoutes.Image = api.BaseRoutes.APIRoot.PathPrefix("/image").Subrouter()

	api.BaseRoutes.TermsOfService = api.BaseRoutes.APIRoot.PathPrefix("/terms_of_service").Subrouter()
	api.BaseRoutes.Groups = api.BaseRoutes.APIRoot.PathPrefix("/groups").Subrouter()

	api.BaseRoutes.Imports = api.BaseRoutes.APIRoot.PathPrefix("/imports").Subrouter()
	api.BaseRoutes.Import = api.BaseRoutes.Imports.PathPrefix("/{import_name:.+\\.zip}").Subrouter()
	api.BaseRoutes.Exports = api.BaseRoutes.APIRoot.PathPrefix("/exports").Subrouter()
	api.BaseRoutes.Export = api.BaseRoutes.Exports.PathPrefix("/{export_name:.+\\.zip}").Subrouter()

	api.BaseRoutes.RemoteCluster = api.BaseRoutes.APIRoot.PathPrefix("/remotecluster").Subrouter()
	api.BaseRoutes.SharedChannels = api.BaseRoutes.APIRoot.PathPrefix("/sharedchannels").Subrouter()
	api.BaseRoutes.SharedChannelRemotes = api.BaseRoutes.RemoteCluster.PathPrefix("/{remote_id:[A-Za-z0-9]+}/sharedchannelremotes").Subrouter()
	api.BaseRoutes.ChannelForRemote = api.BaseRoutes.RemoteCluster.PathPrefix("/{remote_id:[A-Za-z0-9]+}/channels/{channel_id:[A-Za-z0-9]+}").Subrouter()

	api.BaseRoutes.Permissions = api.BaseRoutes.APIRoot.PathPrefix("/permissions").Subrouter()

	api.BaseRoutes.Usage = api.BaseRoutes.APIRoot.PathPrefix("/usage").Subrouter()

	api.BaseRoutes.HostedCustomer = api.BaseRoutes.APIRoot.PathPrefix("/hosted_customer").Subrouter()

	api.BaseRoutes.Drafts = api.BaseRoutes.APIRoot.PathPrefix("/drafts").Subrouter()

	api.BaseRoutes.Reports = api.BaseRoutes.APIRoot.PathPrefix("/reports").Subrouter()

	api.BaseRoutes.OutgoingOAuthConnections = api.BaseRoutes.APIRoot.PathPrefix("/oauth/outgoing_connections").Subrouter()
	api.BaseRoutes.OutgoingOAuthConnection = api.BaseRoutes.OutgoingOAuthConnections.PathPrefix("/{outgoing_oauth_connection_id:[A-Za-z0-9]+}").Subrouter()

	api.BaseRoutes.CustomProfileAttributes = api.BaseRoutes.APIRoot.PathPrefix("/custom_profile_attributes").Subrouter()
	api.BaseRoutes.CustomProfileAttributesFields = api.BaseRoutes.CustomProfileAttributes.PathPrefix("/fields").Subrouter()
	api.BaseRoutes.CustomProfileAttributesField = api.BaseRoutes.CustomProfileAttributesFields.PathPrefix("/{field_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.CustomProfileAttributesValues = api.BaseRoutes.CustomProfileAttributes.PathPrefix("/values").Subrouter()

	api.BaseRoutes.AuditLogs = api.BaseRoutes.APIRoot.PathPrefix("/audit_logs").Subrouter()

	api.BaseRoutes.AccessControlPolicies = api.BaseRoutes.APIRoot.PathPrefix("/access_control_policies").Subrouter()
	api.BaseRoutes.AccessControlPolicy = api.BaseRoutes.APIRoot.PathPrefix("/access_control_policies/{policy_id:[A-Za-z0-9]+}").Subrouter()

	api.BaseRoutes.ContentFlagging = api.BaseRoutes.APIRoot.PathPrefix("/content_flagging").Subrouter()

	api.BaseRoutes.Agents = api.BaseRoutes.APIRoot.PathPrefix("/agents").Subrouter()
	api.BaseRoutes.LLMServices = api.BaseRoutes.APIRoot.PathPrefix("/llmservices").Subrouter()

	api.BaseRoutes.Boards = api.BaseRoutes.APIRoot.PathPrefix("/boards").Subrouter()

	api.BaseRoutes.Properties = api.BaseRoutes.APIRoot.PathPrefix("/properties").Subrouter()
	api.BaseRoutes.PropertyFields = api.BaseRoutes.Properties.PathPrefix("/groups/{group_name:[a-z][a-z0-9_]*}/{object_type:[a-z]+}/fields").Subrouter()
	api.BaseRoutes.PropertyField = api.BaseRoutes.PropertyFields.PathPrefix("/{field_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.PropertyFieldsSearch = api.BaseRoutes.Properties.PathPrefix("/groups/{group_name:[a-z][a-z0-9_]*}/fields/search").Subrouter()
	api.BaseRoutes.PropertyValues = api.BaseRoutes.Properties.PathPrefix("/groups/{group_name:[a-z][a-z0-9_]*}/{object_type:[a-z]+}/values/{target_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.PropertySystemValues = api.BaseRoutes.Properties.PathPrefix("/groups/{group_name:[a-z][a-z0-9_]*}/system/values").Subrouter()

	api.InitUser()
	api.InitBot()
	api.InitTeam()
	api.InitChannel()
	api.InitPost()
	api.InitFile()
	api.InitUpload()
	api.InitSystem()
	api.InitAIBridgeTestHelper()
	api.InitLicense()
	api.InitConfig()
	api.InitWebhook()
	api.InitPreference()
	api.InitSaml()
	api.InitCompliance()
	api.InitCluster()
	api.InitLdap()
	api.InitElasticsearch()
	api.InitDataRetention()
	api.InitBrand()
	api.InitJob()
	api.InitRecap()
	api.InitScheduledRecap()
	api.InitCommand()
	api.InitStatus()
	api.InitWebSocket()
	api.InitEmoji()
	api.InitOAuth()
	api.InitReaction()
	api.InitPlugin()
	api.InitRole()
	api.InitScheme()
	api.InitImage()
	api.InitTermsOfService()
	api.InitGroup()
	api.InitAction()
	api.InitImport()
	api.InitRemoteCluster()
	api.InitSharedChannels()
	api.InitPermissions()
	api.InitExport()
	api.InitUsage()
	api.InitHostedCustomer()
	api.InitDrafts()
	api.InitChannelBookmarks()
	api.InitView()
	api.InitBoard()
	api.InitReports()
	api.InitOutgoingOAuthConnection()
	api.InitClientPerformanceMetrics()
	api.InitScheduledPost()
	api.InitCustomProfileAttributes()
	api.InitAuditLogging()
	api.InitAccessControlPolicy()
	api.InitContentFlagging()
	api.InitAgents()
	api.InitProperties()

	// If we allow testing then listen for manual testing URL hits
	if *srv.Config().ServiceSettings.EnableTesting {
		api.BaseRoutes.Root.Handle("/manualtest", api.APIHandler(manualtesting.ManualTest)).Methods(http.MethodGet)
	}

	srv.Router.Handle(model.APIURLSuffix+"/{anything:.*}", http.HandlerFunc(api.Handle404))

	InitLocal(srv)

	return api, nil
}

func InitLocal(srv *app.Server) *API {
	api := &API{
		srv:        srv,
		BaseRoutes: &Routes{},
	}

	api.BaseRoutes.Root = srv.LocalRouter
	api.BaseRoutes.APIRoot = srv.LocalRouter.PathPrefix(model.APIURLSuffix).Subrouter()

	api.BaseRoutes.Users = api.BaseRoutes.APIRoot.PathPrefix("/users").Subrouter()
	api.BaseRoutes.User = api.BaseRoutes.Users.PathPrefix("/{user_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.UserByUsername = api.BaseRoutes.Users.PathPrefix("/username/{username:[A-Za-z0-9\\_\\-\\.]+}").Subrouter()
	api.BaseRoutes.UserByEmail = api.BaseRoutes.Users.PathPrefix("/email/{email:.+}").Subrouter()

	api.BaseRoutes.Bots = api.BaseRoutes.APIRoot.PathPrefix("/bots").Subrouter()
	api.BaseRoutes.Bot = api.BaseRoutes.APIRoot.PathPrefix("/bots/{bot_user_id:[A-Za-z0-9]+}").Subrouter()

	api.BaseRoutes.Teams = api.BaseRoutes.APIRoot.PathPrefix("/teams").Subrouter()
	api.BaseRoutes.Team = api.BaseRoutes.Teams.PathPrefix("/{team_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.TeamByName = api.BaseRoutes.Teams.PathPrefix("/name/{team_name:[A-Za-z0-9_-]+}").Subrouter()
	api.BaseRoutes.TeamMembers = api.BaseRoutes.Team.PathPrefix("/members").Subrouter()
	api.BaseRoutes.TeamMember = api.BaseRoutes.TeamMembers.PathPrefix("/{user_id:[A-Za-z0-9]+}").Subrouter()

	api.BaseRoutes.Channels = api.BaseRoutes.APIRoot.PathPrefix("/channels").Subrouter()
	api.BaseRoutes.Channel = api.BaseRoutes.Channels.PathPrefix("/{channel_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.ChannelByName = api.BaseRoutes.Team.PathPrefix("/channels/name/{channel_name:[A-Za-z0-9_-]+}").Subrouter()

	api.BaseRoutes.ChannelByNameForTeamName = api.BaseRoutes.TeamByName.PathPrefix("/channels/name/{channel_name:[A-Za-z0-9_-]+}").Subrouter()
	api.BaseRoutes.ChannelsForTeam = api.BaseRoutes.Team.PathPrefix("/channels").Subrouter()
	api.BaseRoutes.ChannelMembers = api.BaseRoutes.Channel.PathPrefix("/members").Subrouter()
	api.BaseRoutes.ChannelMember = api.BaseRoutes.ChannelMembers.PathPrefix("/{user_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.ChannelMembersForUser = api.BaseRoutes.User.PathPrefix("/teams/{team_id:[A-Za-z0-9]+}/channels/members").Subrouter()

	api.BaseRoutes.Plugins = api.BaseRoutes.APIRoot.PathPrefix("/plugins").Subrouter()
	api.BaseRoutes.Plugin = api.BaseRoutes.Plugins.PathPrefix("/{plugin_id:[A-Za-z0-9\\_\\-\\.]+}").Subrouter()

	api.BaseRoutes.Commands = api.BaseRoutes.APIRoot.PathPrefix("/commands").Subrouter()
	api.BaseRoutes.Command = api.BaseRoutes.Commands.PathPrefix("/{command_id:[A-Za-z0-9]+}").Subrouter()

	api.BaseRoutes.Hooks = api.BaseRoutes.APIRoot.PathPrefix("/hooks").Subrouter()
	api.BaseRoutes.IncomingHooks = api.BaseRoutes.Hooks.PathPrefix("/incoming").Subrouter()
	api.BaseRoutes.IncomingHook = api.BaseRoutes.IncomingHooks.PathPrefix("/{hook_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.OutgoingHooks = api.BaseRoutes.Hooks.PathPrefix("/outgoing").Subrouter()
	api.BaseRoutes.OutgoingHook = api.BaseRoutes.OutgoingHooks.PathPrefix("/{hook_id:[A-Za-z0-9]+}").Subrouter()

	api.BaseRoutes.License = api.BaseRoutes.APIRoot.PathPrefix("/license").Subrouter()

	api.BaseRoutes.Groups = api.BaseRoutes.APIRoot.PathPrefix("/groups").Subrouter()

	api.BaseRoutes.LDAP = api.BaseRoutes.APIRoot.PathPrefix("/ldap").Subrouter()
	api.BaseRoutes.System = api.BaseRoutes.APIRoot.PathPrefix("/system").Subrouter()
	api.BaseRoutes.Preferences = api.BaseRoutes.User.PathPrefix("/preferences").Subrouter()
	api.BaseRoutes.Posts = api.BaseRoutes.APIRoot.PathPrefix("/posts").Subrouter()
	api.BaseRoutes.Post = api.BaseRoutes.Posts.PathPrefix("/{post_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.PostsForChannel = api.BaseRoutes.Channel.PathPrefix("/posts").Subrouter()

	api.BaseRoutes.Roles = api.BaseRoutes.APIRoot.PathPrefix("/roles").Subrouter()

	api.BaseRoutes.Uploads = api.BaseRoutes.APIRoot.PathPrefix("/uploads").Subrouter()
	api.BaseRoutes.Upload = api.BaseRoutes.Uploads.PathPrefix("/{upload_id:[A-Za-z0-9]+}").Subrouter()

	api.BaseRoutes.Imports = api.BaseRoutes.APIRoot.PathPrefix("/imports").Subrouter()
	api.BaseRoutes.Import = api.BaseRoutes.Imports.PathPrefix("/{import_name:.+\\.zip}").Subrouter()
	api.BaseRoutes.Exports = api.BaseRoutes.APIRoot.PathPrefix("/exports").Subrouter()
	api.BaseRoutes.Export = api.BaseRoutes.Exports.PathPrefix("/{export_name:.+\\.zip}").Subrouter()

	api.BaseRoutes.Jobs = api.BaseRoutes.APIRoot.PathPrefix("/jobs").Subrouter()

	api.BaseRoutes.SAML = api.BaseRoutes.APIRoot.PathPrefix("/saml").Subrouter()

	api.BaseRoutes.CustomProfileAttributes = api.BaseRoutes.APIRoot.PathPrefix("/custom_profile_attributes").Subrouter()
	api.BaseRoutes.CustomProfileAttributesFields = api.BaseRoutes.CustomProfileAttributes.PathPrefix("/fields").Subrouter()
	api.BaseRoutes.CustomProfileAttributesField = api.BaseRoutes.CustomProfileAttributesFields.PathPrefix("/{field_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.CustomProfileAttributesValues = api.BaseRoutes.CustomProfileAttributes.PathPrefix("/values").Subrouter()

	api.BaseRoutes.AccessControlPolicies = api.BaseRoutes.APIRoot.PathPrefix("/access_control_policies").Subrouter()
	api.BaseRoutes.AccessControlPolicy = api.BaseRoutes.APIRoot.PathPrefix("/access_control_policies/{policy_id:[A-Za-z0-9]+}").Subrouter()

	api.InitUserLocal()
	api.InitTeamLocal()
	api.InitChannelLocal()
	api.InitConfigLocal()
	api.InitWebhookLocal()
	api.InitPluginLocal()
	api.InitCommandLocal()
	api.InitLicenseLocal()
	api.InitBotLocal()
	api.InitGroupLocal()
	api.InitLdapLocal()
	api.InitSystemLocal()
	api.InitPostLocal()
	api.InitPreferenceLocal()
	api.InitRoleLocal()
	api.InitUploadLocal()
	api.InitImportLocal()
	api.InitExportLocal()
	api.InitJobLocal()
	api.InitSamlLocal()
	api.InitCustomProfileAttributesLocal()
	api.InitAccessControlPolicyLocal()
	api.InitStatusLocal()

	srv.LocalRouter.Handle(model.APIURLSuffix+"/{anything:.*}", http.HandlerFunc(api.Handle404))

	return api
}

func (api *API) Handle404(w http.ResponseWriter, r *http.Request) {
	app := app.New(app.ServerConnector(api.srv.Channels()))
	web.Handle404(app, w, r)
}

var ReturnStatusOK = web.ReturnStatusOK

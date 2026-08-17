// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package oauthhanzo

import (
	"encoding/json"
	"errors"
	"io"
	"strings"

	"github.com/hanzoai/authz"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/einterfaces"
)

// Provider reads Hanzo IAM's UserInfo response. The claim set is the one
// hanzo.id advertises at /.well-known/openid-configuration.
type Provider struct{}

type IAMUser struct {
	Sub               string `json:"sub"`
	Email             string `json:"email"`
	EmailVerified     bool   `json:"email_verified"`
	Name              string `json:"name"`
	PreferredUsername string `json:"preferred_username"`
	DisplayName       string `json:"displayName"`
	Picture           string `json:"picture"`

	// Owner is the IAM org slug and the tenant boundary. Organization is its
	// display name, which is presentational only -- never key on it.
	Owner        string `json:"owner"`
	Organization string `json:"organization"`

	// Orgs is the set of orgs this person is a member of, home org first. Owner
	// says where they are ANCHORED; this says what they may act in, and the two
	// are different questions -- an operator is anchored in an ordinary brand org
	// and holds the reserved org alongside it.
	Orgs []authz.Membership `json:"orgs"`
}

func init() {
	einterfaces.RegisterOAuthProvider(model.UserAuthServiceHanzo, &Provider{})
}

func (u *IAMUser) IsValid() error {
	if u.Sub == "" {
		return errors.New("hanzo iam: subject claim is empty")
	}
	if u.Email == "" {
		return errors.New("hanzo iam: email claim is empty")
	}
	if u.Owner == "" {
		return errors.New("hanzo iam: owner claim is empty, cannot place the user in a tenant")
	}
	return nil
}

func userFromIAMUser(logger mlog.LoggerIFace, iu *IAMUser, settings *model.SSOSettings) *model.User {
	user := &model.User{}

	name := iu.PreferredUsername
	if name == "" {
		name = iu.Name
	}
	// A preferred_username may be an address; the local part is the username.
	user.Username = model.CleanUsername(logger, strings.Split(name, "@")[0])

	display := iu.DisplayName
	if display == "" {
		display = iu.Name
	}
	if first, last, ok := strings.Cut(display, " "); ok {
		user.FirstName, user.LastName = first, last
	} else {
		user.FirstName = display
	}

	user.Email = strings.ToLower(iu.Email)
	user.EmailVerified = iu.EmailVerified

	// sub is IAM's stable identifier. Email and username both move; sub does not.
	sub := iu.Sub
	user.AuthData = &sub
	user.AuthService = model.UserAuthServiceHanzo

	user.SetProp(model.UserPropOrg, iu.Owner)

	// Who administers this server is IAM's answer, and it is asked through IAM's
	// own predicate rather than restated here: platform authority is membership of
	// the reserved org, held at any position, which is not the same question as
	// which org someone is anchored in. Re-deriving it locally is how a check that
	// reads correctly comes to disagree with the issuer.
	//
	// An identity carrying no membership set -- a machine token, or an IAM that
	// does not send `orgs` -- is not an operator, so this fails closed.
	user.Roles = model.SystemUserRoleId
	if (&authz.Claims{Orgs: iu.Orgs}).PlatformSudo() {
		user.Roles = model.SystemAdminRoleId + " " + model.SystemUserRoleId
	}

	return user
}

func (p *Provider) GetUserFromJSON(rctx request.CTX, data io.Reader, tokenUser *model.User, settings *model.SSOSettings) (*model.User, error) {
	var iu IAMUser
	if err := json.NewDecoder(data).Decode(&iu); err != nil {
		return nil, err
	}
	if err := iu.IsValid(); err != nil {
		return nil, err
	}
	return userFromIAMUser(rctx.Logger(), &iu, settings), nil
}

func (p *Provider) GetSSOSettings(_ request.CTX, config *model.Config, service string) (*model.SSOSettings, error) {
	return &config.HanzoSettings, nil
}

func (p *Provider) GetUserFromIdToken(_ request.CTX, idToken string) (*model.User, error) {
	return nil, nil
}

func (p *Provider) IsSameUser(_ request.CTX, dbUser, oauthUser *model.User) bool {
	if dbUser.AuthData != nil && oauthUser.AuthData != nil && *dbUser.AuthData == *oauthUser.AuthData {
		return true
	}
	// An account already carrying a different subject stays with it: an
	// identity is never moved from one subject to another.
	if dbUser.AuthService == model.UserAuthServiceHanzo {
		return false
	}
	// hanzo.id issues every identity here and vouches for the address, so the
	// account holding it is this user, whatever it signed in with before.
	return oauthUser.Email != "" && dbUser.Email == oauthUser.Email
}

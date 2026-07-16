// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package api4

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/v8/channels/utils/testutils"
	"github.com/stretchr/testify/require"
)

func setBasicCommonReviewerConfig(th *TestHelper) *model.AppError {
	config := model.ContentFlaggingSettingsRequest{
		ContentFlaggingSettingsBase: model.ContentFlaggingSettingsBase{
			EnableContentFlagging: new(true),
		},
		ReviewerSettings: &model.ReviewSettingsRequest{
			ReviewerSettings: model.ReviewerSettings{
				CommonReviewers: new(true),
			},
			ReviewerIDsSettings: model.ReviewerIDsSettings{
				CommonReviewerIds: []string{th.BasicUser.Id},
			},
		},
	}
	config.SetDefaults(false)
	return th.App.SaveContentFlaggingConfig(th.Context, config)
}

func setNonReviewerConfig(th *TestHelper) *model.AppError {
	config := model.ContentFlaggingSettingsRequest{
		ContentFlaggingSettingsBase: model.ContentFlaggingSettingsBase{
			EnableContentFlagging: new(true),
		},
		ReviewerSettings: &model.ReviewSettingsRequest{
			ReviewerSettings: model.ReviewerSettings{
				CommonReviewers: new(false),
			},
			ReviewerIDsSettings: model.ReviewerIDsSettings{
				TeamReviewersSetting: map[string]*model.TeamReviewerSetting{
					th.BasicTeam.Id: {
						Enabled:     new(true),
						ReviewerIds: []string{},
					},
				},
			},
		},
	}
	config.SetDefaults(false)
	return th.App.SaveContentFlaggingConfig(th.Context, config)
}

func setBasicTeamReviewerConfig(th *TestHelper, extraReviewerIds ...string) *model.AppError {
	ids := []string{th.BasicUser.Id}
	ids = append(ids, extraReviewerIds...)
	config := model.ContentFlaggingSettingsRequest{
		ContentFlaggingSettingsBase: model.ContentFlaggingSettingsBase{
			EnableContentFlagging: new(true),
		},
		ReviewerSettings: &model.ReviewSettingsRequest{
			ReviewerSettings: model.ReviewerSettings{
				CommonReviewers: new(false),
			},
			ReviewerIDsSettings: model.ReviewerIDsSettings{
				TeamReviewersSetting: map[string]*model.TeamReviewerSetting{
					th.BasicTeam.Id: {
						Enabled:     new(true),
						ReviewerIds: ids,
					},
				},
			},
		},
	}
	config.SetDefaults(false)
	return th.App.SaveContentFlaggingConfig(th.Context, config)
}

func setCommonReviewerWithRequiredCommentConfig(th *TestHelper) *model.AppError {
	config := model.ContentFlaggingSettingsRequest{
		ContentFlaggingSettingsBase: model.ContentFlaggingSettingsBase{
			EnableContentFlagging: new(true),
			AdditionalSettings: &model.AdditionalContentFlaggingSettings{
				ReviewerCommentRequired: new(true),
			},
		},
		ReviewerSettings: &model.ReviewSettingsRequest{
			ReviewerSettings: model.ReviewerSettings{
				CommonReviewers: new(true),
			},
			ReviewerIDsSettings: model.ReviewerIDsSettings{
				CommonReviewerIds: []string{th.BasicUser.Id},
			},
		},
	}
	config.SetDefaults(false)
	return th.App.SaveContentFlaggingConfig(th.Context, config)
}

func setPostDeliveryTrackingFF(th *TestHelper, enabled bool) {
	th.App.Srv().Platform().SetConfigReadOnlyFF(false)
	th.App.UpdateConfig(func(cfg *model.Config) {
		cfg.FeatureFlags.PostDeliveryTracking = enabled
		cfg.DeliveryTrackingSettings.Enable = model.NewPointer(enabled)
	})
}

func flagPostViaAPI(t *testing.T, client *model.Client4, postId string) {
	t.Helper()
	flagRequest := &model.FlagContentRequest{
		Reason:  "Classification mismatch",
		Comment: "This is sensitive content",
	}
	resp, err := client.FlagPostForContentReview(context.Background(), postId, flagRequest)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, resp.StatusCode)
}

func uploadFileAndCreatePost(t *testing.T, th *TestHelper, client *model.Client4) (*model.Post, *model.FileInfo) {
	t.Helper()
	data, err := testutils.ReadTestFile("test.png")
	require.NoError(t, err)

	fileResponse, _, err := client.UploadFile(context.Background(), data, th.BasicChannel.Id, "test.png")
	require.NoError(t, err)
	require.Equal(t, 1, len(fileResponse.FileInfos))
	fileInfo := fileResponse.FileInfos[0]

	post := th.CreatePostInChannelWithFiles(t, th.BasicChannel, fileInfo)
	return post, fileInfo
}

func TestRequireContentFlaggingEnabled(t *testing.T) {
	th := Setup(t).InitBasic(t)

	t.Run("Should set error when license is not valid", func(t *testing.T) {
		th.RemoveLicense(t)
		c := &Context{
			App:    th.App,
			Logger: th.App.Log(),
		}

		requireContentFlaggingEnabled(c)
		require.NotNil(t, c.Err)
		require.Equal(t, "api.data_spillage.error.license", c.Err.Id)
		require.Equal(t, http.StatusNotImplemented, c.Err.StatusCode)
	})

	t.Run("Should set error when feature is disabled in config", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		th.App.UpdateConfig(func(config *model.Config) {
			config.ContentFlaggingSettings.EnableContentFlagging = new(false)
			config.ContentFlaggingSettings.SetDefaults()
		})

		c := &Context{
			App:    th.App,
			Logger: th.App.Log(),
		}

		requireContentFlaggingEnabled(c)
		require.NotNil(t, c.Err)
		require.Equal(t, "api.data_spillage.error.disabled", c.Err.Id)
		require.Equal(t, http.StatusNotImplemented, c.Err.StatusCode)
	})

	t.Run("Should not set error when license is valid and feature is enabled", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		th.App.UpdateConfig(func(config *model.Config) {
			config.ContentFlaggingSettings.EnableContentFlagging = new(true)
			config.ContentFlaggingSettings.SetDefaults()
		})

		c := &Context{
			App:    th.App,
			Logger: th.App.Log(),
		}

		requireContentFlaggingEnabled(c)
		require.Nil(t, c.Err)
	})
}

func TestGetFlaggingConfiguration(t *testing.T) {
	th := Setup(t).InitBasic(t)

	client := th.Client

	t.Run("Should return 501 when feature is disabled", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		th.App.UpdateConfig(func(config *model.Config) {
			config.ContentFlaggingSettings.EnableContentFlagging = new(false)
			config.ContentFlaggingSettings.SetDefaults()
		})

		status, resp, err := client.GetFlaggingConfiguration(context.Background())
		require.Error(t, err)
		require.Equal(t, http.StatusNotImplemented, resp.StatusCode)
		require.Nil(t, status)
	})

	t.Run("Should successfully return configuration without team_id for any authenticated user", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		th.App.UpdateConfig(func(config *model.Config) {
			config.ContentFlaggingSettings.EnableContentFlagging = new(true)
			config.ContentFlaggingSettings.SetDefaults()
		})

		config, resp, err := client.GetFlaggingConfiguration(context.Background())
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
		require.NotNil(t, config)
		require.NotEmpty(t, config.Reasons)
		require.NotNil(t, config.ReporterCommentRequired)
		require.NotNil(t, config.ReviewerCommentRequired)
		// Reviewer-only fields should be nil when not requesting as a reviewer
		require.Nil(t, config.NotifyReporterOnRemoval)
		require.Nil(t, config.NotifyReporterOnDismissal)
	})

	t.Run("Should return 403 when team_id is provided but user is not a reviewer", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		appErr := setNonReviewerConfig(th)
		require.Nil(t, appErr)

		flagConfig, resp, err := client.GetFlaggingConfigurationForTeam(context.Background(), th.BasicTeam.Id)
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
		require.Nil(t, flagConfig)
	})

	t.Run("Should successfully return configuration with reviewer fields when user is a reviewer", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		appErr := setBasicCommonReviewerConfig(th)
		require.Nil(t, appErr)

		config, resp, err := client.GetFlaggingConfigurationForTeam(context.Background(), th.BasicTeam.Id)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
		require.NotNil(t, config)
		require.NotEmpty(t, config.Reasons)
		require.NotNil(t, config.ReporterCommentRequired)
		require.NotNil(t, config.ReviewerCommentRequired)
		// Reviewer-only fields should be present when requesting as a reviewer
		require.NotNil(t, config.NotifyReporterOnRemoval)
		require.NotNil(t, config.NotifyReporterOnDismissal)
	})

	t.Run("Should successfully return configuration with reviewer fields when user is a team reviewer", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		appErr := setBasicTeamReviewerConfig(th)
		require.Nil(t, appErr)

		flagConfig, resp, err := client.GetFlaggingConfigurationForTeam(context.Background(), th.BasicTeam.Id)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
		require.NotNil(t, flagConfig)
		require.NotEmpty(t, flagConfig.Reasons)
		require.NotNil(t, flagConfig.ReporterCommentRequired)
		require.NotNil(t, flagConfig.ReviewerCommentRequired)
		// Reviewer-only fields should be present when requesting as a team reviewer
		require.NotNil(t, flagConfig.NotifyReporterOnRemoval)
		require.NotNil(t, flagConfig.NotifyReporterOnDismissal)
	})
}

func TestSaveContentFlaggingSettings(t *testing.T) {
	th := Setup(t).InitBasic(t)

	client := th.Client

	t.Run("Should return 403 when user does not have manage system permission", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		config := model.ContentFlaggingSettingsRequest{
			ContentFlaggingSettingsBase: model.ContentFlaggingSettingsBase{
				EnableContentFlagging: new(true),
			},
			ReviewerSettings: &model.ReviewSettingsRequest{
				ReviewerSettings: model.ReviewerSettings{
					CommonReviewers: new(true),
				},
				ReviewerIDsSettings: model.ReviewerIDsSettings{
					CommonReviewerIds: []string{th.BasicUser.Id},
				},
			},
		}

		// Use basic user who doesn't have manage system permission
		th.LoginBasic(t)
		resp, err := client.SaveContentFlaggingSettings(context.Background(), &config)
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	t.Run("Should return 400 when config is invalid", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		// Invalid config - missing required fields
		config := model.ContentFlaggingSettingsRequest{
			ReviewerSettings: &model.ReviewSettingsRequest{
				ReviewerSettings: model.ReviewerSettings{
					CommonReviewers:       new(true),
					TeamAdminsAsReviewers: new(false),
				},
				ReviewerIDsSettings: model.ReviewerIDsSettings{
					CommonReviewerIds: []string{},
				},
			},
		}
		config.SetDefaults(false)

		th.LoginSystemAdmin(t)
		resp, err := th.SystemAdminClient.SaveContentFlaggingSettings(context.Background(), &config)
		require.Error(t, err)
		require.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("Should successfully save content flagging settings when user has manage system permission", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		config := model.ContentFlaggingSettingsRequest{
			ContentFlaggingSettingsBase: model.ContentFlaggingSettingsBase{
				EnableContentFlagging: new(true),
			},
			ReviewerSettings: &model.ReviewSettingsRequest{
				ReviewerSettings: model.ReviewerSettings{
					CommonReviewers: new(true),
				},
				ReviewerIDsSettings: model.ReviewerIDsSettings{
					CommonReviewerIds: []string{th.BasicUser.Id},
				},
			},
		}

		// Use system admin who has manage system permission
		resp, err := th.SystemAdminClient.SaveContentFlaggingSettings(context.Background(), &config)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("Should persist delivery tracking settings when the feature flag is enabled", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		setPostDeliveryTrackingFF(th, true)
		defer setPostDeliveryTrackingFF(th, false)

		config := model.ContentFlaggingSettingsRequest{
			ContentFlaggingSettingsBase: model.ContentFlaggingSettingsBase{
				EnableContentFlagging: new(true),
			},
			ReviewerSettings: &model.ReviewSettingsRequest{
				ReviewerSettings: model.ReviewerSettings{
					CommonReviewers: new(true),
				},
				ReviewerIDsSettings: model.ReviewerIDsSettings{
					CommonReviewerIds: []string{th.BasicUser.Id},
				},
			},
			DeliveryTracking: &model.DeliveryTrackingConfig{
				Enable:               new(true),
				EnableForAllChannels: new(false),
				ChannelIds:           []string{th.BasicChannel.Id},
			},
		}

		resp, err := th.SystemAdminClient.SaveContentFlaggingSettings(context.Background(), &config)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)

		// Read the settings back and verify delivery tracking round-tripped.
		settings, resp, err := th.SystemAdminClient.GetContentFlaggingSettings(context.Background())
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
		require.NotNil(t, settings.DeliveryTracking)
		require.True(t, *settings.DeliveryTracking.Enable)
		require.False(t, *settings.DeliveryTracking.EnableForAllChannels)
		require.Equal(t, []string{th.BasicChannel.Id}, settings.DeliveryTracking.ChannelIds)
	})

	t.Run("Should return 400 when delivery tracking is invalid and the feature flag is enabled", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		setPostDeliveryTrackingFF(th, true)
		defer setPostDeliveryTrackingFF(th, false)

		config := model.ContentFlaggingSettingsRequest{
			ContentFlaggingSettingsBase: model.ContentFlaggingSettingsBase{
				EnableContentFlagging: new(true),
			},
			ReviewerSettings: &model.ReviewSettingsRequest{
				ReviewerSettings: model.ReviewerSettings{
					CommonReviewers: new(true),
				},
				ReviewerIDsSettings: model.ReviewerIDsSettings{
					CommonReviewerIds: []string{th.BasicUser.Id},
				},
			},
			// Selected-channels mode with no channels is invalid.
			DeliveryTracking: &model.DeliveryTrackingConfig{
				Enable:               new(true),
				EnableForAllChannels: new(false),
				ChannelIds:           []string{},
			},
		}

		resp, err := th.SystemAdminClient.SaveContentFlaggingSettings(context.Background(), &config)
		require.Error(t, err)
		require.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("Should ignore delivery tracking settings when the feature flag is disabled", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		// Feature flag defaults to off; set it explicitly to make the intent clear.
		setPostDeliveryTrackingFF(th, false)

		config := model.ContentFlaggingSettingsRequest{
			ContentFlaggingSettingsBase: model.ContentFlaggingSettingsBase{
				EnableContentFlagging: new(true),
			},
			ReviewerSettings: &model.ReviewSettingsRequest{
				ReviewerSettings: model.ReviewerSettings{
					CommonReviewers: new(true),
				},
				ReviewerIDsSettings: model.ReviewerIDsSettings{
					CommonReviewerIds: []string{th.BasicUser.Id},
				},
			},
			// This payload should be dropped because the feature flag is disabled.
			DeliveryTracking: &model.DeliveryTrackingConfig{
				Enable:               new(true),
				EnableForAllChannels: new(false),
				ChannelIds:           []string{th.BasicChannel.Id},
			},
		}

		resp, err := th.SystemAdminClient.SaveContentFlaggingSettings(context.Background(), &config)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)

		settings, resp, err := th.SystemAdminClient.GetContentFlaggingSettings(context.Background())
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
		require.Nil(t, settings.DeliveryTracking)
	})
}

func TestGetContentFlaggingSettings(t *testing.T) {
	th := Setup(t).InitBasic(t)

	t.Run("Should return 403 when user does not have manage system permission", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		// Use basic user who doesn't have manage system permission
		th.LoginBasic(t)
		settings, resp, err := th.Client.GetContentFlaggingSettings(context.Background())
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
		require.Nil(t, settings)
	})

	t.Run("Should successfully get content flagging settings when user has manage system permission", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		// First save some settings
		appErr := setBasicCommonReviewerConfig(th)
		require.Nil(t, appErr)

		// Use system admin who has manage system permission
		settings, resp, err := th.SystemAdminClient.GetContentFlaggingSettings(context.Background())
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
		require.NotNil(t, settings)
		require.NotNil(t, settings.EnableContentFlagging)
		require.True(t, *settings.EnableContentFlagging)
		require.NotNil(t, settings.ReviewerSettings)
		require.NotNil(t, settings.ReviewerSettings.CommonReviewers)
		require.True(t, *settings.ReviewerSettings.CommonReviewers)
		require.NotNil(t, settings.ReviewerSettings.CommonReviewerIds)
		require.Contains(t, settings.ReviewerSettings.CommonReviewerIds, th.BasicUser.Id)

		// With the PostDeliveryTracking feature flag off, delivery tracking is omitted.
		require.Nil(t, settings.DeliveryTracking)
	})

	t.Run("Should include delivery tracking settings when the feature flag is enabled", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		setPostDeliveryTrackingFF(th, true)
		defer setPostDeliveryTrackingFF(th, false)

		config := model.ContentFlaggingSettingsRequest{
			ContentFlaggingSettingsBase: model.ContentFlaggingSettingsBase{
				EnableContentFlagging: new(true),
			},
			ReviewerSettings: &model.ReviewSettingsRequest{
				ReviewerSettings: model.ReviewerSettings{
					CommonReviewers: new(true),
				},
				ReviewerIDsSettings: model.ReviewerIDsSettings{
					CommonReviewerIds: []string{th.BasicUser.Id},
				},
			},
			DeliveryTracking: &model.DeliveryTrackingConfig{
				Enable:               new(true),
				EnableForAllChannels: new(false),
				ChannelIds:           []string{th.BasicChannel.Id},
			},
		}
		config.SetDefaults(true)
		appErr := th.App.SaveContentFlaggingConfig(th.Context, config)
		require.Nil(t, appErr)

		settings, resp, err := th.SystemAdminClient.GetContentFlaggingSettings(context.Background())
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
		require.NotNil(t, settings.DeliveryTracking)
		require.True(t, *settings.DeliveryTracking.Enable)
		require.False(t, *settings.DeliveryTracking.EnableForAllChannels)
		require.Equal(t, []string{th.BasicChannel.Id}, settings.DeliveryTracking.ChannelIds)
	})
}

func TestGetPostPropertyValues(t *testing.T) {
	th := Setup(t).InitBasic(t)

	client := th.Client

	t.Run("Should return 501 when feature is disabled", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		th.App.UpdateConfig(func(config *model.Config) {
			config.ContentFlaggingSettings.EnableContentFlagging = new(false)
			config.ContentFlaggingSettings.SetDefaults()
		})

		post := th.CreatePost(t)
		propertyValues, resp, err := client.GetPostPropertyValues(context.Background(), post.Id)
		require.Error(t, err)
		require.Equal(t, http.StatusNotImplemented, resp.StatusCode)
		require.Nil(t, propertyValues)
	})

	t.Run("Should return 403 when user is not a reviewer", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		th.App.UpdateConfig(func(config *model.Config) {
			config.ContentFlaggingSettings.EnableContentFlagging = new(true)
			config.ContentFlaggingSettings.SetDefaults()
		})

		post := th.CreatePost(t)
		propertyValues, resp, err := client.GetPostPropertyValues(context.Background(), post.Id)
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
		require.Nil(t, propertyValues)
	})

	t.Run("Should successfully get property values when user is a reviewer", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		appErr := setBasicCommonReviewerConfig(th)
		require.Nil(t, appErr)

		post := th.CreatePost(t)
		flagPostViaAPI(t, client, post.Id)

		// Now get the property values
		propertyValues, resp, err := client.GetPostPropertyValues(context.Background(), post.Id)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
		require.NotNil(t, propertyValues)
		// status, reporting user, reporting reason, reporting comment, reporting
		// time, delivery_tracking_status, plus manage-by-content-flagging (added
		// because HideFlaggedContent defaults on).
		require.Len(t, propertyValues, 7)
	})
}

func TestGetFlaggedPost(t *testing.T) {
	th := Setup(t).InitBasic(t)

	client := th.Client

	t.Run("Should return 501 when feature is disabled", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		th.App.UpdateConfig(func(config *model.Config) {
			config.ContentFlaggingSettings.EnableContentFlagging = new(false)
			config.ContentFlaggingSettings.SetDefaults()
		})

		post := th.CreatePost(t)
		flaggedPost, resp, err := client.GetContentFlaggedPost(context.Background(), post.Id)
		require.Error(t, err)
		require.Equal(t, http.StatusNotImplemented, resp.StatusCode)
		require.Nil(t, flaggedPost)
	})

	t.Run("Should return 403 when user is not a reviewer", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))

		appErr := setNonReviewerConfig(th)
		require.Nil(t, appErr)

		post := th.CreatePost(t)
		flaggedPost, resp, err := client.GetContentFlaggedPost(context.Background(), post.Id)
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
		require.Nil(t, flaggedPost)
	})

	t.Run("Should return 404 when post is not flagged", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))

		appErr := setBasicCommonReviewerConfig(th)
		require.Nil(t, appErr)

		post := th.CreatePost(t)
		flaggedPost, resp, err := client.GetContentFlaggedPost(context.Background(), post.Id)
		require.Error(t, err)
		require.Equal(t, http.StatusNotFound, resp.StatusCode)
		require.Nil(t, flaggedPost)
	})

	t.Run("Should successfully get flagged post when user is a reviewer and post is flagged", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))

		appErr := setBasicCommonReviewerConfig(th)
		require.Nil(t, appErr)

		post := th.CreatePost(t)
		flagPostViaAPI(t, client, post.Id)

		// Now get the flagged post
		flaggedPost, resp, err := client.GetContentFlaggedPost(context.Background(), post.Id)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
		require.NotNil(t, flaggedPost)
		require.Equal(t, post.Id, flaggedPost.Id)
	})

	t.Run("Should return flagged post's file info", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))

		appErr := setBasicCommonReviewerConfig(th)
		require.Nil(t, appErr)

		post, fileInfo := uploadFileAndCreatePost(t, th, client)
		flagPostViaAPI(t, client, post.Id)

		flaggedPost, resp, err := client.GetContentFlaggedPost(context.Background(), post.Id)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
		require.Equal(t, 1, len(flaggedPost.Metadata.Files))
		require.Equal(t, fileInfo.Id, flaggedPost.Metadata.Files[0].Id)
	})
}

func TestFlagPost(t *testing.T) {
	th := Setup(t).InitBasic(t)

	// Enable BurnOnRead feature flag
	th.App.UpdateConfig(func(cfg *model.Config) { cfg.FeatureFlags.BurnOnRead = true })

	client := th.Client

	t.Run("Should return 501 when feature is disabled", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		th.App.UpdateConfig(func(config *model.Config) {
			config.ContentFlaggingSettings.EnableContentFlagging = new(false)
			config.ContentFlaggingSettings.SetDefaults()
		})

		post := th.CreatePost(t)
		flagRequest := &model.FlagContentRequest{
			Reason:  "spam",
			Comment: "This is spam content",
		}

		resp, err := client.FlagPostForContentReview(context.Background(), post.Id, flagRequest)
		require.Error(t, err)
		require.Equal(t, http.StatusNotImplemented, resp.StatusCode)
	})

	t.Run("Should return 403 when user does not have permission to view post", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		th.App.UpdateConfig(func(config *model.Config) {
			config.ContentFlaggingSettings.EnableContentFlagging = new(true)
			config.ContentFlaggingSettings.SetDefaults()
		})

		// Create a private channel and post
		privateChannel := th.CreatePrivateChannel(t)
		post := th.CreatePostWithClient(t, th.Client, privateChannel)
		th.RemoveUserFromChannel(t, th.BasicUser, privateChannel)

		flagRequest := &model.FlagContentRequest{
			Reason:  "spam",
			Comment: "This is spam content",
		}

		resp, err := client.FlagPostForContentReview(context.Background(), post.Id, flagRequest)
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	t.Run("Should return 400 when content flagging is not enabled for the team", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		config := model.ContentFlaggingSettingsRequest{
			ContentFlaggingSettingsBase: model.ContentFlaggingSettingsBase{
				EnableContentFlagging: new(true),
			},
			ReviewerSettings: &model.ReviewSettingsRequest{
				ReviewerSettings: model.ReviewerSettings{
					CommonReviewers: new(false),
				},
				ReviewerIDsSettings: model.ReviewerIDsSettings{
					TeamReviewersSetting: map[string]*model.TeamReviewerSetting{
						th.BasicTeam.Id: {Enabled: new(false)},
					},
				},
			},
		}
		config.SetDefaults(false)
		appErr := th.App.SaveContentFlaggingConfig(th.Context, config)
		require.Nil(t, appErr)

		post := th.CreatePost(t)
		flagRequest := &model.FlagContentRequest{
			Reason:  "spam",
			Comment: "This is spam content",
		}

		resp, err := client.FlagPostForContentReview(context.Background(), post.Id, flagRequest)
		require.Error(t, err)
		require.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("Should successfully flag a post when all conditions are met", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		appErr := setBasicCommonReviewerConfig(th)
		require.Nil(t, appErr)

		post := th.CreatePost(t)
		flagRequest := &model.FlagContentRequest{
			Reason:  "Classification mismatch",
			Comment: "This is sensitive data",
		}

		resp, err := client.FlagPostForContentReview(context.Background(), post.Id, flagRequest)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("Should not allow flagging a burn on read post", func(t *testing.T) {
		enableBurnOnReadFeature(th)
		defer th.RemoveLicense(t)

		th.App.UpdateConfig(func(config *model.Config) {
			config.ContentFlaggingSettings.EnableContentFlagging = new(true)
			config.ContentFlaggingSettings.SetDefaults()
		})

		post := &model.Post{
			UserId:    th.BasicUser.Id,
			ChannelId: th.BasicChannel.Id,
			Message:   "This is a burn on read post",
			Type:      model.PostTypeBurnOnRead,
		}

		createdPost, response, err := client.CreatePost(context.Background(), post)
		require.NoError(t, err)
		CheckCreatedStatus(t, response)

		flagRequest := &model.FlagContentRequest{
			Reason:  "spam",
			Comment: "This is spam content",
		}

		response, err = client.FlagPostForContentReview(context.Background(), createdPost.Id, flagRequest)
		require.Error(t, err)
		CheckBadRequestStatus(t, response)
	})
}

func TestGetTeamPostReportingFeatureStatus(t *testing.T) {
	th := Setup(t)

	client := th.Client

	t.Run("Should return 501 when feature is disabled", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		th.App.UpdateConfig(func(config *model.Config) {
			config.ContentFlaggingSettings.EnableContentFlagging = new(false)
			config.ContentFlaggingSettings.SetDefaults()
		})

		status, resp, err := client.GetTeamPostFlaggingFeatureStatus(context.Background(), model.NewId())
		require.Error(t, err)
		require.Equal(t, http.StatusNotImplemented, resp.StatusCode)
		require.Nil(t, status)
	})

	t.Run("Should return Forbidden error when calling for a team without the team membership", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		config := model.ContentFlaggingSettingsRequest{
			ContentFlaggingSettingsBase: model.ContentFlaggingSettingsBase{
				EnableContentFlagging: new(true),
			},
			ReviewerSettings: &model.ReviewSettingsRequest{
				ReviewerSettings: model.ReviewerSettings{
					CommonReviewers: new(true),
				},
				ReviewerIDsSettings: model.ReviewerIDsSettings{
					CommonReviewerIds: []string{"reviewer_user_id_1", "reviewer_user_id_2"},
				},
			},
		}
		config.SetDefaults(false)
		appErr := th.App.SaveContentFlaggingConfig(th.Context, config)
		require.Nil(t, appErr)

		// using basic user because the default user is a system admin, and they have
		// access to all teams even without being an explicit team member
		th.LoginBasic(t)
		team := th.CreateTeam(t)
		// unlinking from the created team as by default the team's creator is
		// a team member, so we need to leave the team explicitly
		th.UnlinkUserFromTeam(t, th.BasicUser, team)

		status, resp, err := client.GetTeamPostFlaggingFeatureStatus(context.Background(), team.Id)
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
		require.Nil(t, status)

		// now we will join the team and that will allow us to call the endpoint without error
		th.LinkUserToTeam(t, th.BasicUser, team)
		status, resp, err = client.GetTeamPostFlaggingFeatureStatus(context.Background(), team.Id)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
		require.True(t, status["enabled"])
	})
}

func TestSearchReviewers(t *testing.T) {
	th := Setup(t).InitBasic(t)

	client := th.Client

	t.Run("Should return 501 when feature is disabled", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		th.App.UpdateConfig(func(config *model.Config) {
			config.ContentFlaggingSettings.EnableContentFlagging = new(false)
			config.ContentFlaggingSettings.SetDefaults()
		})

		reviewers, resp, err := client.SearchContentFlaggingReviewers(context.Background(), th.BasicTeam.Id, "test")
		require.Error(t, err)
		require.Equal(t, http.StatusNotImplemented, resp.StatusCode)
		require.Nil(t, reviewers)
	})

	t.Run("Should return 403 when user is not a reviewer", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		appErr := setNonReviewerConfig(th)
		require.Nil(t, appErr)

		reviewers, resp, err := client.SearchContentFlaggingReviewers(context.Background(), th.BasicTeam.Id, "test")
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
		require.Nil(t, reviewers)
	})

	t.Run("Should successfully search reviewers when user is a reviewer", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		appErr := setBasicCommonReviewerConfig(th)
		require.Nil(t, appErr)

		reviewers, resp, err := client.SearchContentFlaggingReviewers(context.Background(), th.BasicTeam.Id, "basic")
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
		require.NotNil(t, reviewers)
	})

	t.Run("Should successfully search reviewers when user is a team reviewer", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		appErr := setBasicTeamReviewerConfig(th)
		require.Nil(t, appErr)

		reviewers, resp, err := client.SearchContentFlaggingReviewers(context.Background(), th.BasicTeam.Id, "basic")
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
		require.NotNil(t, reviewers)
	})
}

func TestAssignContentFlaggingReviewer(t *testing.T) {
	th := Setup(t).InitBasic(t)

	client := th.Client

	t.Run("Should return 501 when feature is disabled", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		th.App.UpdateConfig(func(config *model.Config) {
			config.ContentFlaggingSettings.EnableContentFlagging = new(false)
			config.ContentFlaggingSettings.SetDefaults()
		})

		post := th.CreatePost(t)
		resp, err := client.AssignContentFlaggingReviewer(context.Background(), post.Id, th.BasicUser.Id)
		require.Error(t, err)
		require.Equal(t, http.StatusNotImplemented, resp.StatusCode)
	})

	t.Run("Should return 400 when user ID is invalid", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		appErr := setBasicCommonReviewerConfig(th)
		require.Nil(t, appErr)

		post := th.CreatePost(t)
		resp, err := client.AssignContentFlaggingReviewer(context.Background(), post.Id, "invalidUserId")
		require.Error(t, err)
		require.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("Should return 403 when assigning user is not a reviewer", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		appErr := setNonReviewerConfig(th)
		require.Nil(t, appErr)

		post := th.CreatePost(t)
		resp, err := client.AssignContentFlaggingReviewer(context.Background(), post.Id, th.BasicUser.Id)
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	t.Run("Should return 400 when assignee is not a reviewer", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		// Create another user who will not be a reviewer
		nonReviewerUser := th.CreateUser(t)
		th.LinkUserToTeam(t, nonReviewerUser, th.BasicTeam)

		config := model.ContentFlaggingSettingsRequest{
			ContentFlaggingSettingsBase: model.ContentFlaggingSettingsBase{
				EnableContentFlagging: new(true),
			},
			ReviewerSettings: &model.ReviewSettingsRequest{
				ReviewerSettings: model.ReviewerSettings{
					CommonReviewers: new(true),
				},
				ReviewerIDsSettings: model.ReviewerIDsSettings{
					CommonReviewerIds: []string{th.BasicUser.Id}, // Only BasicUser is a reviewer
				},
			},
		}
		config.SetDefaults(false)
		appErr := th.App.SaveContentFlaggingConfig(th.Context, config)
		require.Nil(t, appErr)

		post := th.CreatePost(t)
		// Try to assign non-reviewer user
		resp, err := client.AssignContentFlaggingReviewer(context.Background(), post.Id, nonReviewerUser.Id)
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	t.Run("Should successfully assign reviewer when all conditions are met", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		// Create another reviewer user
		reviewerUser := th.CreateUser(t)
		th.LinkUserToTeam(t, reviewerUser, th.BasicTeam)

		appErr := setBasicCommonReviewerConfig(th)
		require.Nil(t, appErr)

		// Also add reviewerUser as a common reviewer
		config := model.ContentFlaggingSettingsRequest{
			ContentFlaggingSettingsBase: model.ContentFlaggingSettingsBase{
				EnableContentFlagging: new(true),
			},
			ReviewerSettings: &model.ReviewSettingsRequest{
				ReviewerSettings: model.ReviewerSettings{
					CommonReviewers: new(true),
				},
				ReviewerIDsSettings: model.ReviewerIDsSettings{
					CommonReviewerIds: []string{th.BasicUser.Id, reviewerUser.Id},
				},
			},
		}
		config.SetDefaults(false)
		appErr = th.App.SaveContentFlaggingConfig(th.Context, config)
		require.Nil(t, appErr)

		post := th.CreatePost(t)
		flagPostViaAPI(t, client, post.Id)

		// Now assign the reviewer
		resp, err := client.AssignContentFlaggingReviewer(context.Background(), post.Id, reviewerUser.Id)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("Should successfully assign reviewer when user is team reviewer", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		// Create another reviewer user
		reviewerUser := th.CreateUser(t)
		th.LinkUserToTeam(t, reviewerUser, th.BasicTeam)

		appErr := setBasicTeamReviewerConfig(th, reviewerUser.Id)
		require.Nil(t, appErr)

		post := th.CreatePost(t)
		flagPostViaAPI(t, client, post.Id)

		// Now assign the reviewer
		resp, err := client.AssignContentFlaggingReviewer(context.Background(), post.Id, reviewerUser.Id)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
	})
}

func TestRemoveFlaggedPost(t *testing.T) {
	th := Setup(t).InitBasic(t)

	client := th.Client

	t.Run("Should return 501 when feature is disabled", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		th.App.UpdateConfig(func(config *model.Config) {
			config.ContentFlaggingSettings.EnableContentFlagging = new(false)
			config.ContentFlaggingSettings.SetDefaults()
		})

		post := th.CreatePost(t)
		actionRequest := &model.FlagContentActionRequest{
			Comment: "Removing this post",
		}

		resp, err := client.RemoveFlaggedPost(context.Background(), post.Id, actionRequest)
		require.Error(t, err)
		require.Equal(t, http.StatusNotImplemented, resp.StatusCode)
	})

	t.Run("Should return 403 when user is not a reviewer", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		appErr := setNonReviewerConfig(th)
		require.Nil(t, appErr)

		post := th.CreatePost(t)
		actionRequest := &model.FlagContentActionRequest{
			Comment: "Removing this post",
		}

		resp, err := client.RemoveFlaggedPost(context.Background(), post.Id, actionRequest)
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	t.Run("Should return 400 when comment is required but not provided", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		appErr := setCommonReviewerWithRequiredCommentConfig(th)
		require.Nil(t, appErr)

		post := th.CreatePost(t)
		flagPostViaAPI(t, client, post.Id)

		// Try to remove without comment
		actionRequest := &model.FlagContentActionRequest{
			Comment: "", // Empty comment when required
		}

		resp, err := client.RemoveFlaggedPost(context.Background(), post.Id, actionRequest)
		require.Error(t, err)
		require.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("Should successfully remove flagged post when all conditions are met", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		appErr := setBasicCommonReviewerConfig(th)
		require.Nil(t, appErr)

		post := th.CreatePost(t)
		flagPostViaAPI(t, client, post.Id)

		// Now remove the flagged post
		actionRequest := &model.FlagContentActionRequest{
			Comment: "Removing this post due to policy violation",
		}

		resp, err := client.RemoveFlaggedPost(context.Background(), post.Id, actionRequest)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)

		// Verify the post was deleted
		_, resp, err = client.GetPost(context.Background(), post.Id, "")
		require.Error(t, err)
		require.Equal(t, http.StatusNotFound, resp.StatusCode)
	})

	t.Run("Should successfully remove flagged post when user is team reviewer", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		appErr := setBasicTeamReviewerConfig(th)
		require.Nil(t, appErr)

		post := th.CreatePost(t)
		flagPostViaAPI(t, client, post.Id)

		// Now remove the flagged post
		actionRequest := &model.FlagContentActionRequest{
			Comment: "Removing this post due to policy violation",
		}

		resp, err := client.RemoveFlaggedPost(context.Background(), post.Id, actionRequest)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("Should remove file attachments and edit history when removing flagged post", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		appErr := setBasicCommonReviewerConfig(th)
		require.Nil(t, appErr)

		post, fileInfo := uploadFileAndCreatePost(t, th, client)

		// Verify file info exists for the post
		fileInfos, err2 := th.App.Srv().Store().FileInfo().GetForPost(post.Id, true, false, false)
		require.NoError(t, err2)
		require.Len(t, fileInfos, 1)
		require.Equal(t, fileInfo.Id, fileInfos[0].Id)

		// Update the post to create edit history
		post.Message = "Updated message to create edit history"
		updatedPost, _, err := client.UpdatePost(context.Background(), post.Id, post)
		require.NoError(t, err)
		require.NotNil(t, updatedPost)
		require.Equal(t, "Updated message to create edit history", updatedPost.Message)

		// Verify edit history exists
		editHistory, appErr := th.App.GetEditHistoryForPost(post.Id)
		require.Nil(t, appErr)
		require.NotEmpty(t, editHistory)
		editHistoryPostId := editHistory[0].Id

		flagPostViaAPI(t, client, post.Id)

		// Remove the flagged post
		actionRequest := &model.FlagContentActionRequest{
			Comment: "Removing this post due to policy violation",
		}

		resp, err := client.RemoveFlaggedPost(context.Background(), post.Id, actionRequest)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)

		// Verify file attachments are removed from database
		fileInfosAfter, err2 := th.App.Srv().Store().FileInfo().GetForPost(post.Id, true, true, false)
		require.NoError(t, err2)
		require.Empty(t, fileInfosAfter, "File attachments should be removed from database after removing flagged post")

		// Verify edit history posts are removed from database
		editHistoryAfter, appErr := th.App.GetEditHistoryForPost(post.Id)
		require.NotNil(t, appErr)
		require.Equal(t, http.StatusNotFound, appErr.StatusCode, "Edit history should be removed from database after removing flagged post")
		require.Empty(t, editHistoryAfter)

		// Verify the edit history post is also permanently deleted
		_, err2 = th.App.Srv().Store().Post().GetSingle(th.Context, editHistoryPostId, true)
		require.Error(t, err2, "Edit history post should be permanently deleted")
	})
}

func TestKeepFlaggedPost(t *testing.T) {
	th := Setup(t).InitBasic(t)

	client := th.Client

	t.Run("Should return 501 when feature is disabled", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		th.App.UpdateConfig(func(config *model.Config) {
			config.ContentFlaggingSettings.EnableContentFlagging = new(false)
			config.ContentFlaggingSettings.SetDefaults()
		})

		post := th.CreatePost(t)
		actionRequest := &model.FlagContentActionRequest{
			Comment: "Keeping this post",
		}

		resp, err := client.KeepFlaggedPost(context.Background(), post.Id, actionRequest)
		require.Error(t, err)
		require.Equal(t, http.StatusNotImplemented, resp.StatusCode)
	})

	t.Run("Should return 403 when user is not a reviewer", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		appErr := setNonReviewerConfig(th)
		require.Nil(t, appErr)

		post := th.CreatePost(t)
		actionRequest := &model.FlagContentActionRequest{
			Comment: "Keeping this post",
		}

		resp, err := client.KeepFlaggedPost(context.Background(), post.Id, actionRequest)
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	t.Run("Should return 400 when comment is required but not provided", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		appErr := setCommonReviewerWithRequiredCommentConfig(th)
		require.Nil(t, appErr)

		post := th.CreatePost(t)
		flagPostViaAPI(t, client, post.Id)

		// Try to keep without comment
		actionRequest := &model.FlagContentActionRequest{
			Comment: "", // Empty comment when required
		}

		resp, err := client.KeepFlaggedPost(context.Background(), post.Id, actionRequest)
		require.Error(t, err)
		require.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("Should successfully keep flagged post when all conditions are met", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		appErr := setBasicCommonReviewerConfig(th)
		require.Nil(t, appErr)

		post := th.CreatePost(t)
		flagPostViaAPI(t, client, post.Id)

		// Now keep the flagged post
		actionRequest := &model.FlagContentActionRequest{
			Comment: "Keeping this post after review",
		}

		resp, err := client.KeepFlaggedPost(context.Background(), post.Id, actionRequest)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)

		// Verify the post still exists
		fetchedPost, resp, err := client.GetPost(context.Background(), post.Id, "")
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
		require.NotNil(t, fetchedPost)
		require.Equal(t, post.Id, fetchedPost.Id)
	})

	t.Run("Should successfully keep flagged post when user is team reviewer", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		appErr := setBasicTeamReviewerConfig(th)
		require.Nil(t, appErr)

		post := th.CreatePost(t)
		flagPostViaAPI(t, client, post.Id)

		// Now keep the flagged post
		actionRequest := &model.FlagContentActionRequest{
			Comment: "Keeping this post after review",
		}

		resp, err := client.KeepFlaggedPost(context.Background(), post.Id, actionRequest)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("Should preserve file attachments and edit history when keeping flagged post", func(t *testing.T) {
		t.Skip("Skipped due to flakiness — tracked in https://mattermost.atlassian.net/browse/MM-69511")

		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		appErr := setBasicCommonReviewerConfig(th)
		require.Nil(t, appErr)

		post, fileInfo := uploadFileAndCreatePost(t, th, client)

		// Verify file info exists for the post
		fileInfos, err2 := th.App.Srv().Store().FileInfo().GetForPost(post.Id, true, false, false)
		require.NoError(t, err2)
		require.Len(t, fileInfos, 1)
		require.Equal(t, fileInfo.Id, fileInfos[0].Id)

		// Update the post to create edit history
		post.Message = "Updated message to create edit history"
		updatedPost, _, err := client.UpdatePost(context.Background(), post.Id, post)
		require.NoError(t, err)
		require.NotNil(t, updatedPost)
		require.Equal(t, "Updated message to create edit history", updatedPost.Message)

		// Verify edit history exists
		editHistory, appErr := th.App.GetEditHistoryForPost(post.Id)
		require.Nil(t, appErr)
		require.NotEmpty(t, editHistory)
		editHistoryPostId := editHistory[0].Id

		flagPostViaAPI(t, client, post.Id)

		// Keep the flagged post
		actionRequest := &model.FlagContentActionRequest{
			Comment: "Keeping this post after review - content is acceptable",
		}

		resp, err := client.KeepFlaggedPost(context.Background(), post.Id, actionRequest)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)

		// Verify file attachments are still present in database
		fileInfosAfter, err2 := th.App.Srv().Store().FileInfo().GetForPost(post.Id, true, false, false)
		require.NoError(t, err2)
		require.Len(t, fileInfosAfter, 1, "File attachments should be preserved after keeping flagged post")
		require.Equal(t, fileInfo.Id, fileInfosAfter[0].Id)

		// Verify edit history is still present in database
		editHistoryAfter, appErr := th.App.GetEditHistoryForPost(post.Id)
		require.Nil(t, appErr, "Edit history should be preserved after keeping flagged post")
		require.NotEmpty(t, editHistoryAfter)
		require.Equal(t, editHistoryPostId, editHistoryAfter[0].Id)

		// Verify the post still exists and is accessible
		fetchedPost, resp, err := client.GetPost(context.Background(), post.Id, "")
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
		require.NotNil(t, fetchedPost)
		require.Equal(t, post.Id, fetchedPost.Id)
	})

	t.Run("Should broadcast restored post with DeleteAt=0 when keeping hidden flagged post", func(t *testing.T) {
		// Regression test for MM-68799. RestoreContentFlaggedPost updates the DB
		// but not the in-memory *model.Post passed to KeepFlaggedPost. Without the
		// re-fetch added in KeepFlaggedPost, the broadcast post_edited event
		// carries DeleteAt > 0 and channel viewers continue to hide the post.
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		appErr := setBasicCommonReviewerConfig(th)
		require.Nil(t, appErr)

		th.App.UpdateConfig(func(config *model.Config) {
			config.ContentFlaggingSettings.AdditionalSettings.HideFlaggedContent = model.NewPointer(true)
		})
		defer th.App.UpdateConfig(func(config *model.Config) {
			config.ContentFlaggingSettings.AdditionalSettings.HideFlaggedContent = model.NewPointer(false)
		})

		post := th.CreatePost(t)
		flagPostViaAPI(t, client, post.Id)

		// Wait for the post to actually be hidden in the DB before retaining.
		require.Eventually(t, func() bool {
			hidden, getErr := th.App.GetSinglePost(th.Context, post.Id, true)
			return getErr == nil && hidden.DeleteAt > 0
		}, 5*time.Second, 100*time.Millisecond, "post should be soft-deleted after flagging")

		// Connect a WebSocket client after flag so the post_deleted event from
		// flagging doesn't pollute the channel we read from.
		wsClient := th.CreateConnectedWebSocketClient(t)

		actionRequest := &model.FlagContentActionRequest{
			Comment: "Restoring after review",
		}
		resp, err := client.KeepFlaggedPost(context.Background(), post.Id, actionRequest)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var seenPostEdited bool
		timeout := time.After(5 * time.Second)
		for !seenPostEdited {
			select {
			case event := <-wsClient.EventChannel:
				if event.EventType() != model.WebsocketEventPostEdited {
					continue
				}
				rawPost, ok := event.GetData()["post"].(string)
				if !ok {
					continue
				}
				var p model.Post
				require.NoError(t, json.Unmarshal([]byte(rawPost), &p))
				if p.Id != post.Id {
					continue
				}
				require.Equal(t, int64(0), p.DeleteAt, "broadcast post must reflect restored DeleteAt=0")
				seenPostEdited = true
			case <-timeout:
				require.FailNow(t, "timed out waiting for post_edited event with restored DeleteAt")
			}
		}
	})
}

func setupDeliveryTrackingReviewer(t *testing.T, th *TestHelper) {
	t.Helper()
	th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
	appErr := setBasicCommonReviewerConfig(th)
	require.Nil(t, appErr)
	// Enable delivery tracking last so the feature flag / Enable toggle is not
	// clobbered by the content-flagging config save above. Reset EnableForAllChannels
	// to its default so per-channel state does not leak between shared-th subtests.
	setPostDeliveryTrackingFF(th, true)
	th.App.UpdateConfig(func(cfg *model.Config) {
		cfg.DeliveryTrackingSettings.EnableForAllChannels = model.NewPointer(true)
	})
}

func seedDeliveryTrackingJob(t *testing.T, th *TestHelper, postId, status string) {
	t.Helper()
	_, err := th.App.Srv().Store().Job().Save(&model.Job{
		Id:       model.NewId(),
		Type:     model.JobTypeDeliveryTrackingContentReview,
		Status:   status,
		CreateAt: model.GetMillis(),
		Data:     model.StringMap{"post_id": postId},
	})
	require.NoError(t, err)
}

func TestGetFlaggingConfigDeliveryTracking(t *testing.T) {
	// makeConfig returns a defaulted config with delivery tracking enabled iff
	// deliveryEnabled (feature flag AND the settings toggle).
	makeConfig := func(deliveryEnabled bool) *model.Config {
		cfg := &model.Config{}
		cfg.SetDefaults()
		cfg.FeatureFlags.PostDeliveryTracking = deliveryEnabled
		cfg.DeliveryTrackingSettings.Enable = model.NewPointer(deliveryEnabled)
		return cfg
	}

	t.Run("reviewer receives the delivery tracking enabled flag when enabled", func(t *testing.T) {
		cfg := getFlaggingConfig(makeConfig(true), true)
		require.NotNil(t, cfg.DeliveryTrackingEnabled)
		require.True(t, *cfg.DeliveryTrackingEnabled)
	})

	t.Run("reviewer receives the delivery tracking enabled flag when disabled", func(t *testing.T) {
		cfg := getFlaggingConfig(makeConfig(false), true)
		require.NotNil(t, cfg.DeliveryTrackingEnabled)
		require.False(t, *cfg.DeliveryTrackingEnabled)
	})

	t.Run("non-reviewer does not receive the delivery tracking enabled flag", func(t *testing.T) {
		cfg := getFlaggingConfig(makeConfig(true), false)
		require.Nil(t, cfg.DeliveryTrackingEnabled)
	})
}

func TestTriggerDeliveryTracking(t *testing.T) {
	th := Setup(t).InitBasic(t)
	client := th.Client

	t.Run("Should return 501 when delivery tracking is disabled", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		appErr := setBasicCommonReviewerConfig(th)
		require.Nil(t, appErr)
		setPostDeliveryTrackingFF(th, false)

		post := th.CreatePost(t)
		resp, err := client.TriggerDeliveryTracking(context.Background(), post.Id)
		require.Error(t, err)
		require.Equal(t, http.StatusNotImplemented, resp.StatusCode)
	})

	t.Run("Should return 403 when user is not a content reviewer", func(t *testing.T) {
		setupDeliveryTrackingReviewer(t, th)
		defer th.RemoveLicense(t)

		post := th.CreatePost(t)
		flagPostViaAPI(t, client, post.Id)

		nonReviewerClient := th.CreateClient()
		th.LoginBasic2WithClient(t, nonReviewerClient)

		resp, err := nonReviewerClient.TriggerDeliveryTracking(context.Background(), post.Id)
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	t.Run("Should return 400 for a direct message post", func(t *testing.T) {
		setupDeliveryTrackingReviewer(t, th)
		defer th.RemoveLicense(t)

		dmChannel := th.CreateDmChannel(t, th.BasicUser2)
		dmPost, _, err := client.CreatePost(context.Background(), &model.Post{ChannelId: dmChannel.Id, Message: "dm message"})
		require.NoError(t, err)

		resp, err := client.TriggerDeliveryTracking(context.Background(), dmPost.Id)
		require.Error(t, err)
		require.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("Should return 400 when post is not flagged", func(t *testing.T) {
		setupDeliveryTrackingReviewer(t, th)
		defer th.RemoveLicense(t)

		post := th.CreatePost(t)
		resp, err := client.TriggerDeliveryTracking(context.Background(), post.Id)
		require.Error(t, err)
		require.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("Should return 400 when post is in a terminal status", func(t *testing.T) {
		setupDeliveryTrackingReviewer(t, th)
		defer th.RemoveLicense(t)

		post := th.CreatePost(t)
		flagPostViaAPI(t, client, post.Id)

		removeResp, err := client.RemoveFlaggedPost(context.Background(), post.Id, &model.FlagContentActionRequest{Comment: "removing"})
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, removeResp.StatusCode)

		resp, err := client.TriggerDeliveryTracking(context.Background(), post.Id)
		require.Error(t, err)
		require.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("Should return 400 when the post's channel is not tracked", func(t *testing.T) {
		setupDeliveryTrackingReviewer(t, th)
		defer th.RemoveLicense(t)

		th.App.UpdateConfig(func(cfg *model.Config) {
			cfg.DeliveryTrackingSettings.EnableForAllChannels = model.NewPointer(false)
		})

		post := th.CreatePost(t)
		flagPostViaAPI(t, client, post.Id)

		resp, err := client.TriggerDeliveryTracking(context.Background(), post.Id)
		require.Error(t, err)
		require.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("Should return 404 when the post does not exist", func(t *testing.T) {
		setupDeliveryTrackingReviewer(t, th)
		defer th.RemoveLicense(t)

		resp, err := client.TriggerDeliveryTracking(context.Background(), model.NewId())
		require.Error(t, err)
		require.Equal(t, http.StatusNotFound, resp.StatusCode)
	})

	t.Run("Should return 201 and create a job on the happy path", func(t *testing.T) {
		setupDeliveryTrackingReviewer(t, th)
		defer th.RemoveLicense(t)

		post := th.CreatePost(t)
		flagPostViaAPI(t, client, post.Id)

		resp, err := client.TriggerDeliveryTracking(context.Background(), post.Id)
		require.NoError(t, err)
		require.Equal(t, http.StatusCreated, resp.StatusCode)

		exists, appErr := th.App.DeliveryTrackingContentReviewJobExists(th.Context, post.Id, model.JobStatusPending, model.JobStatusInProgress)
		require.Nil(t, appErr)
		require.True(t, exists)
	})

	t.Run("Should return 200 when data is already available, without a new job", func(t *testing.T) {
		setupDeliveryTrackingReviewer(t, th)
		defer th.RemoveLicense(t)

		post := th.CreatePost(t)
		flagPostViaAPI(t, client, post.Id)
		seedDeliveryTrackingJob(t, th, post.Id, model.JobStatusSuccess)

		resp, err := client.TriggerDeliveryTracking(context.Background(), post.Id)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)

		exists, appErr := th.App.DeliveryTrackingContentReviewJobExists(th.Context, post.Id, model.JobStatusPending, model.JobStatusInProgress)
		require.Nil(t, appErr)
		require.False(t, exists)
	})

	t.Run("Should return 200 for available data even when the channel is no longer tracked", func(t *testing.T) {
		setupDeliveryTrackingReviewer(t, th)
		defer th.RemoveLicense(t)

		th.App.UpdateConfig(func(cfg *model.Config) {
			cfg.DeliveryTrackingSettings.EnableForAllChannels = model.NewPointer(false)
		})

		post := th.CreatePost(t)
		flagPostViaAPI(t, client, post.Id)
		seedDeliveryTrackingJob(t, th, post.Id, model.JobStatusSuccess)

		resp, err := client.TriggerDeliveryTracking(context.Background(), post.Id)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("Should return 202 when a job is already in progress, without a duplicate", func(t *testing.T) {
		setupDeliveryTrackingReviewer(t, th)
		defer th.RemoveLicense(t)

		post := th.CreatePost(t)
		flagPostViaAPI(t, client, post.Id)
		seedDeliveryTrackingJob(t, th, post.Id, model.JobStatusPending)

		resp, err := client.TriggerDeliveryTracking(context.Background(), post.Id)
		require.NoError(t, err)
		require.Equal(t, http.StatusAccepted, resp.StatusCode)

		jobs, err := th.App.Srv().Store().Job().GetByTypeAndData(th.Context, model.JobTypeDeliveryTrackingContentReview, map[string]string{"post_id": post.Id}, true, model.JobStatusPending, model.JobStatusInProgress)
		require.NoError(t, err)
		require.Len(t, jobs, 1)
		require.Contains(t, jobs[0].Data["requested_by"], th.BasicUser.Id)
	})

	t.Run("Should deduplicate to a single job across two reviewers, recording both", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		appErr := setBasicTeamReviewerConfig(th, th.BasicUser2.Id)
		require.Nil(t, appErr)
		setPostDeliveryTrackingFF(th, true)

		post := th.CreatePost(t)
		flagPostViaAPI(t, client, post.Id)

		resp, err := client.TriggerDeliveryTracking(context.Background(), post.Id)
		require.NoError(t, err)
		require.Equal(t, http.StatusCreated, resp.StatusCode)

		secondReviewerClient := th.CreateClient()
		th.LoginBasic2WithClient(t, secondReviewerClient)

		resp, err = secondReviewerClient.TriggerDeliveryTracking(context.Background(), post.Id)
		require.NoError(t, err)
		require.Equal(t, http.StatusAccepted, resp.StatusCode)

		jobs, err := th.App.Srv().Store().Job().GetByTypeAndData(th.Context, model.JobTypeDeliveryTrackingContentReview, map[string]string{"post_id": post.Id}, true, model.JobStatusPending, model.JobStatusInProgress)
		require.NoError(t, err)
		require.Len(t, jobs, 1)
		require.Contains(t, jobs[0].Data["requested_by"], th.BasicUser.Id)
		require.Contains(t, jobs[0].Data["requested_by"], th.BasicUser2.Id)
	})
}

func seedContentReviewRows(t *testing.T, th *TestHelper, records []model.UserPostDelivery) {
	t.Helper()
	require.NoError(t, th.App.Srv().Store().UserPostDeliveryContentReview().SaveBatch(context.Background(), records, model.NewId()))
}

func findReceiptRow(t *testing.T, rows [][]string, targetID string) []string {
	t.Helper()
	for _, row := range rows {
		if len(row) == 7 && row[1] == targetID {
			return row
		}
	}
	require.FailNowf(t, "receipt row not found", "no row for target %s", targetID)
	return nil
}

func TestGenerateDeliveryTrackingReceipt(t *testing.T) {
	th := Setup(t).InitBasic(t)
	client := th.Client

	t.Run("Should return 501 when delivery tracking is disabled", func(t *testing.T) {
		th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterpriseAdvanced))
		defer th.RemoveLicense(t)

		appErr := setBasicCommonReviewerConfig(th)
		require.Nil(t, appErr)
		setPostDeliveryTrackingFF(th, false)

		post := th.CreatePost(t)
		_, resp, err := client.GetDeliveryTrackingReceipt(context.Background(), post.Id)
		require.Error(t, err)
		require.Equal(t, http.StatusNotImplemented, resp.StatusCode)
	})

	t.Run("Should return 403 when user is not a content reviewer", func(t *testing.T) {
		setupDeliveryTrackingReviewer(t, th)
		defer th.RemoveLicense(t)

		post := th.CreatePost(t)
		flagPostViaAPI(t, client, post.Id)

		nonReviewerClient := th.CreateClient()
		th.LoginBasic2WithClient(t, nonReviewerClient)

		_, resp, err := nonReviewerClient.GetDeliveryTrackingReceipt(context.Background(), post.Id)
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	t.Run("Should return 400 for a direct message post", func(t *testing.T) {
		setupDeliveryTrackingReviewer(t, th)
		defer th.RemoveLicense(t)

		dmChannel := th.CreateDmChannel(t, th.BasicUser2)
		dmPost, _, err := client.CreatePost(context.Background(), &model.Post{ChannelId: dmChannel.Id, Message: "dm message"})
		require.NoError(t, err)

		_, resp, err := client.GetDeliveryTrackingReceipt(context.Background(), dmPost.Id)
		require.Error(t, err)
		require.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("Should return 404 when the post is not flagged", func(t *testing.T) {
		setupDeliveryTrackingReviewer(t, th)
		defer th.RemoveLicense(t)

		post := th.CreatePost(t)
		_, resp, err := client.GetDeliveryTrackingReceipt(context.Background(), post.Id)
		require.Error(t, err)
		require.Equal(t, http.StatusNotFound, resp.StatusCode)
	})

	t.Run("Should return 400 when the post is in a terminal status", func(t *testing.T) {
		setupDeliveryTrackingReviewer(t, th)
		defer th.RemoveLicense(t)

		post := th.CreatePost(t)
		flagPostViaAPI(t, client, post.Id)

		removeResp, err := client.RemoveFlaggedPost(context.Background(), post.Id, &model.FlagContentActionRequest{Comment: "removing"})
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, removeResp.StatusCode)

		_, resp, err := client.GetDeliveryTrackingReceipt(context.Background(), post.Id)
		require.Error(t, err)
		require.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("Should return 404 when no successful job has produced data", func(t *testing.T) {
		setupDeliveryTrackingReviewer(t, th)
		defer th.RemoveLicense(t)

		post := th.CreatePost(t)
		flagPostViaAPI(t, client, post.Id)
		seedDeliveryTrackingJob(t, th, post.Id, model.JobStatusInProgress)

		_, resp, err := client.GetDeliveryTrackingReceipt(context.Background(), post.Id)
		require.Error(t, err)
		require.Equal(t, http.StatusNotFound, resp.StatusCode)
	})

	t.Run("Should return 404 when the post does not exist", func(t *testing.T) {
		setupDeliveryTrackingReviewer(t, th)
		defer th.RemoveLicense(t)

		_, resp, err := client.GetDeliveryTrackingReceipt(context.Background(), model.NewId())
		require.Error(t, err)
		require.Equal(t, http.StatusNotFound, resp.StatusCode)
	})

	t.Run("Should stream the CSV receipt on the happy path", func(t *testing.T) {
		setupDeliveryTrackingReviewer(t, th)
		defer th.RemoveLicense(t)

		post := th.CreatePost(t)
		flagPostViaAPI(t, client, post.Id)
		seedDeliveryTrackingJob(t, th, post.Id, model.JobStatusSuccess)

		// 1704067200000ms == 2024-01-01T00:00:00Z (asserted below).
		const productAt = int64(1704067200000)
		const emailAt = int64(1704067260000)
		deletedUserID := model.NewId()
		seedContentReviewRows(t, th, []model.UserPostDelivery{
			{PostID: post.Id, TargetID: th.BasicUser2.Id, TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: productAt},
			{PostID: post.Id, TargetID: th.BasicUser2.Id, TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismEmail, CreatedAt: emailAt},
			{PostID: post.Id, TargetID: "com.example.plugin", TargetType: model.DeliveryTargetPlugin, Mechanism: model.DeliveryMechanismPlugin, CreatedAt: emailAt},
			{PostID: post.Id, TargetID: deletedUserID, TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: emailAt},
		})

		data, resp, err := client.GetDeliveryTrackingReceipt(context.Background(), post.Id)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
		require.Contains(t, resp.Header.Get("Content-Type"), "text/csv")
		require.Contains(t, resp.Header.Get("Content-Disposition"), "attachment")
		require.Contains(t, resp.Header.Get("Content-Disposition"), "delivery-receipt-"+post.Id)

		reader := csv.NewReader(bytes.NewReader(data))
		reader.FieldsPerRecord = -1 // metadata block + table have different widths
		rows, err := reader.ReadAll()
		require.NoError(t, err)

		var sawPostID, sawTotal bool
		for _, row := range rows {
			if len(row) == 2 && row[0] == "Post ID" && row[1] == post.Id {
				sawPostID = true
			}
			if len(row) == 2 && row[0] == "Total delivery records" && row[1] == "4" {
				sawTotal = true
			}
		}
		require.True(t, sawPostID, "metadata block should contain the post ID")
		require.True(t, sawTotal, "metadata block should report the total delivery records")

		userRow := findReceiptRow(t, rows, th.BasicUser2.Id)
		require.Equal(t, "User", userRow[0])
		require.Equal(t, th.BasicUser2.Username, userRow[2])
		require.Equal(t, th.BasicUser2.Email, userRow[3])
		require.Contains(t, userRow[5], "In-product")
		require.Contains(t, userRow[5], "Email notification")
		require.Equal(t, "2024-01-01T00:00:00Z", userRow[6])

		pluginRow := findReceiptRow(t, rows, "com.example.plugin")
		require.Equal(t, "Plugin", pluginRow[0])
		require.Empty(t, pluginRow[2])
		require.Empty(t, pluginRow[3])
		require.Contains(t, pluginRow[5], "Plugin")

		deletedRow := findReceiptRow(t, rows, deletedUserID)
		require.Equal(t, "User", deletedRow[0])
		require.Equal(t, "(unknown or deleted user)", deletedRow[2])
		require.Empty(t, deletedRow[3])
	})

	t.Run("Should return the receipt even when the channel is no longer tracked", func(t *testing.T) {
		setupDeliveryTrackingReviewer(t, th)
		defer th.RemoveLicense(t)

		post := th.CreatePost(t)
		flagPostViaAPI(t, client, post.Id)
		seedDeliveryTrackingJob(t, th, post.Id, model.JobStatusSuccess)
		seedContentReviewRows(t, th, []model.UserPostDelivery{
			{PostID: post.Id, TargetID: th.BasicUser2.Id, TargetType: model.DeliveryTargetUser, Mechanism: model.DeliveryMechanismProduct, CreatedAt: 1704067200000},
		})

		th.App.UpdateConfig(func(cfg *model.Config) {
			cfg.DeliveryTrackingSettings.EnableForAllChannels = model.NewPointer(false)
		})

		data, resp, err := client.GetDeliveryTrackingReceipt(context.Background(), post.Id)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
		require.True(t, strings.Contains(string(data), th.BasicUser2.Username))
	})

	t.Run("Should return 501 when the feature is disabled even if data exists", func(t *testing.T) {
		setupDeliveryTrackingReviewer(t, th)
		defer th.RemoveLicense(t)

		post := th.CreatePost(t)
		flagPostViaAPI(t, client, post.Id)
		seedDeliveryTrackingJob(t, th, post.Id, model.JobStatusSuccess)

		// The receipt API requires the feature flag; disabling it makes the endpoint
		// unavailable regardless of any already-generated data.
		setPostDeliveryTrackingFF(th, false)

		_, resp, err := client.GetDeliveryTrackingReceipt(context.Background(), post.Id)
		require.Error(t, err)
		require.Equal(t, http.StatusNotImplemented, resp.StatusCode)
	})
}

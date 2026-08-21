// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package api4

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/hanzoai/team/server/public/model"
	"github.com/hanzoai/team/server/v8/channels/utils"
	mocks2 "github.com/hanzoai/team/server/v8/channels/utils/mocks"
	"github.com/hanzoai/team/server/v8/channels/utils/testutils"
	"github.com/hanzoai/team/server/v8/einterfaces/mocks"

	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestGetOldClientLicense(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t)
	client := th.Client

	license, _, err := client.GetOldClientLicense(context.Background(), "")
	require.NoError(t, err)

	require.NotEqual(t, license["IsLicensed"], "", "license not returned correctly")

	_, err = client.Logout(context.Background())
	require.NoError(t, err)

	_, _, err = client.GetOldClientLicense(context.Background(), "")
	require.NoError(t, err)

	resp, err := client.DoAPIGet(context.Background(), "/license/client", "")
	require.Error(t, err, "get /license/client did not return an error")
	require.Equal(t, http.StatusBadRequest, resp.StatusCode,
		"expected 400 bad request")

	resp, err = client.DoAPIGet(context.Background(), "/license/client?format=junk", "")
	require.Error(t, err, "get /license/client?format=junk did not return an error")
	require.Equal(t, http.StatusBadRequest, resp.StatusCode,
		"expected 400 Bad Request")

	license, _, err = th.SystemAdminClient.GetOldClientLicense(context.Background(), "")
	require.NoError(t, err)

	require.NotEmpty(t, license["IsLicensed"], "license not returned correctly")
}

func TestUploadLicenseFile(t *testing.T) {
	th := Setup(t)
	client := th.Client
	LocalClient := th.LocalClient

	t.Run("as system user", func(t *testing.T) {
		resp, err := client.UploadLicenseFile(context.Background(), []byte{})
		require.Error(t, err)
		CheckForbiddenStatus(t, resp)
	})

	th.TestForSystemAdminAndLocal(t, func(t *testing.T, c *model.Client4) {
		resp, err := c.UploadLicenseFile(context.Background(), []byte{})
		require.Error(t, err)
		CheckBadRequestStatus(t, resp)
	}, "as system admin user")

	t.Run("as restricted system admin user", func(t *testing.T) {
		th.App.UpdateConfig(func(cfg *model.Config) { *cfg.ExperimentalSettings.RestrictSystemAdmin = true })

		resp, err := th.SystemAdminClient.UploadLicenseFile(context.Background(), []byte{})
		require.Error(t, err)
		CheckForbiddenStatus(t, resp)
	})

	t.Run("restricted admin setting not honoured through local client", func(t *testing.T) {
		th.App.UpdateConfig(func(cfg *model.Config) { *cfg.ExperimentalSettings.RestrictSystemAdmin = true })
		resp, err := LocalClient.UploadLicenseFile(context.Background(), []byte{})
		require.Error(t, err)
		CheckBadRequestStatus(t, resp)
	})

	t.Run("server has already gone through trial", func(t *testing.T) {
		th.App.UpdateConfig(func(cfg *model.Config) { *cfg.ExperimentalSettings.RestrictSystemAdmin = false })
		mockLicenseValidator := mocks2.LicenseValidatorIface{}
		defer testutils.ResetLicenseValidator()

		userCount := 100
		mills := model.GetMillis()

		license := model.License{
			Id: "AAAAAAAAAAAAAAAAAAAAAAAAAA",
			Features: &model.Features{
				Users: &userCount,
			},
			Customer: &model.Customer{
				Name: "Test",
			},
			StartsAt:  mills + 100,
			ExpiresAt: mills + 100 + (30*(time.Hour*24) + (time.Hour * 8)).Milliseconds(),
		}

		mockLicenseValidator.On("LicenseFromBytes", mock.Anything).Return(&license, nil).Once()
		licenseBytes, _ := json.Marshal(license)
		licenseStr := string(licenseBytes)

		mockLicenseValidator.On("ValidateLicense", mock.Anything).Return(licenseStr, nil)
		utils.LicenseValidator = &mockLicenseValidator

		licenseManagerMock := &mocks.LicenseInterface{}
		licenseManagerMock.On("CanStartTrial").Return(false, nil).Once()
		th.App.Srv().Platform().SetLicenseManager(licenseManagerMock)

		resp, err := th.SystemAdminClient.UploadLicenseFile(context.Background(), []byte("sadasdasdasdasdasdsa"))
		CheckErrorID(t, err, "api.license.request-trial.can-start-trial.not-allowed")
		require.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("try to get one through trial, with TE build", func(t *testing.T) {
		th.App.UpdateConfig(func(cfg *model.Config) { *cfg.ExperimentalSettings.RestrictSystemAdmin = false })
		th.App.Srv().Platform().SetLicenseManager(nil)

		mockLicenseValidator := mocks2.LicenseValidatorIface{}
		defer testutils.ResetLicenseValidator()

		license := model.License{
			Id: model.NewId(),
			Features: &model.Features{
				Users: new(100),
			},
			Customer: &model.Customer{
				Name: "Test",
			},
			StartsAt:  model.GetMillis() + 100,
			ExpiresAt: model.GetMillis() + 100 + (30*(time.Hour*24) + (time.Hour * 8)).Milliseconds(),
		}

		mockLicenseValidator.On("LicenseFromBytes", mock.Anything).Return(&license, nil).Once()
		licenseBytes, err := json.Marshal(license)
		require.NoError(t, err)

		mockLicenseValidator.On("ValidateLicense", mock.Anything).Return(string(licenseBytes), nil)
		utils.LicenseValidator = &mockLicenseValidator

		resp, err := th.SystemAdminClient.UploadLicenseFile(context.Background(), []byte(""))
		CheckErrorID(t, err, "api.license.upgrade_needed.app_error")
		require.Equal(t, http.StatusInternalServerError, resp.StatusCode)
	})

	t.Run("allow uploading sanctioned trials even if server already gone through trial", func(t *testing.T) {
		mockLicenseValidator := mocks2.LicenseValidatorIface{}
		defer testutils.ResetLicenseValidator()

		userCount := 100
		mills := model.GetMillis()

		license := model.License{
			Id: "PPPPPPPPPPPPPPPPPPPPPPPPPP",
			Features: &model.Features{
				Users: &userCount,
			},
			Customer: &model.Customer{
				Name: "Test",
			},
			IsTrial:   true,
			StartsAt:  mills + 100,
			ExpiresAt: mills + 100 + (29*(time.Hour*24) + (time.Hour * 8)).Milliseconds(),
		}

		mockLicenseValidator.On("LicenseFromBytes", mock.Anything).Return(&license, nil).Once()

		licenseBytes, _ := json.Marshal(license)
		licenseStr := string(licenseBytes)

		mockLicenseValidator.On("ValidateLicense", mock.Anything).Return(licenseStr, nil)

		utils.LicenseValidator = &mockLicenseValidator

		licenseManagerMock := &mocks.LicenseInterface{}
		licenseManagerMock.On("CanStartTrial").Return(false, nil).Once()
		th.App.Srv().Platform().SetLicenseManager(licenseManagerMock)

		resp, err := th.SystemAdminClient.UploadLicenseFile(context.Background(), []byte("sadasdasdasdasdasdsa"))
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
	})
}

func TestPreviewLicenseFile(t *testing.T) {
	th := Setup(t)
	client := th.Client

	t.Run("as system user", func(t *testing.T) {
		_, resp, err := client.PreviewLicenseFile(context.Background(), []byte{})
		require.Error(t, err)
		CheckForbiddenStatus(t, resp)
	})

	t.Run("as system admin with empty file", func(t *testing.T) {
		_, resp, err := th.SystemAdminClient.PreviewLicenseFile(context.Background(), []byte{})
		require.Error(t, err)
		CheckBadRequestStatus(t, resp)
	})

	t.Run("as restricted system admin user", func(t *testing.T) {
		originalRestrictSystemAdmin := *th.App.Config().ExperimentalSettings.RestrictSystemAdmin
		th.App.UpdateConfig(func(cfg *model.Config) { *cfg.ExperimentalSettings.RestrictSystemAdmin = true })
		t.Cleanup(func() {
			th.App.UpdateConfig(func(cfg *model.Config) {
				*cfg.ExperimentalSettings.RestrictSystemAdmin = originalRestrictSystemAdmin
			})
		})

		_, resp, err := th.SystemAdminClient.PreviewLicenseFile(context.Background(), []byte{})
		require.Error(t, err)
		CheckForbiddenStatus(t, resp)
	})

	t.Run("preview valid license", func(t *testing.T) {
		mockLicenseValidator := mocks2.LicenseValidatorIface{}
		defer testutils.ResetLicenseValidator()

		userCount := 100
		mills := model.GetMillis()

		license := model.License{
			Id: model.NewId(),
			Features: &model.Features{
				Users: &userCount,
			},
			Customer: &model.Customer{
				Name:    "Test Customer",
				Company: "Test Company",
			},
			SkuName:      "Enterprise",
			SkuShortName: "enterprise",
			StartsAt:     mills,
			ExpiresAt:    mills + (365 * 24 * time.Hour).Milliseconds(),
		}

		mockLicenseValidator.On("LicenseFromBytes", mock.Anything).Return(&license, nil).Once()
		utils.LicenseValidator = &mockLicenseValidator

		previewedLicense, resp, err := th.SystemAdminClient.PreviewLicenseFile(context.Background(), []byte("test-license-data"))
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
		require.NotNil(t, previewedLicense)
		require.Equal(t, license.Id, previewedLicense.Id)
		require.Equal(t, "Test Customer", previewedLicense.Customer.Name)
		require.Equal(t, "Test Company", previewedLicense.Customer.Company)
		require.Equal(t, "Enterprise", previewedLicense.SkuName)
		require.Equal(t, "enterprise", previewedLicense.SkuShortName)
		require.Equal(t, userCount, *previewedLicense.Features.Users)
	})

	t.Run("preview invalid license", func(t *testing.T) {
		mockLicenseValidator := mocks2.LicenseValidatorIface{}
		defer testutils.ResetLicenseValidator()

		mockLicenseValidator.On("LicenseFromBytes", mock.Anything).Return(nil, model.NewAppError("LicenseFromBytes", "model.license.is_valid.app_error", nil, "", http.StatusBadRequest)).Once()
		utils.LicenseValidator = &mockLicenseValidator

		_, resp, err := th.SystemAdminClient.PreviewLicenseFile(context.Background(), []byte("invalid-license-data"))
		require.Error(t, err)
		CheckBadRequestStatus(t, resp)
	})

	t.Run("preview does not save license", func(t *testing.T) {
		mockLicenseValidator := mocks2.LicenseValidatorIface{}
		defer testutils.ResetLicenseValidator()

		userCount := 50
		mills := model.GetMillis()

		license := model.License{
			Id: model.NewId(),
			Features: &model.Features{
				Users: &userCount,
			},
			Customer: &model.Customer{
				Name: "Preview Only",
			},
			SkuName:      "Professional",
			SkuShortName: "professional",
			StartsAt:     mills,
			ExpiresAt:    mills + (365 * 24 * time.Hour).Milliseconds(),
		}

		mockLicenseValidator.On("LicenseFromBytes", mock.Anything).Return(&license, nil).Once()
		utils.LicenseValidator = &mockLicenseValidator

		// Get current license before preview
		currentLicense := th.App.Srv().License()

		// Preview the license
		_, resp, err := th.SystemAdminClient.PreviewLicenseFile(context.Background(), []byte("test-license-data"))
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)

		// Verify the license was not saved
		licenseAfterPreview := th.App.Srv().License()
		if currentLicense == nil {
			require.Nil(t, licenseAfterPreview)
		} else {
			require.Equal(t, currentLicense.Id, licenseAfterPreview.Id)
		}
	})
}

func TestRemoveLicenseFile(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t)
	client := th.Client
	LocalClient := th.LocalClient

	t.Run("as system user", func(t *testing.T) {
		resp, err := client.RemoveLicenseFile(context.Background())
		require.Error(t, err)
		CheckForbiddenStatus(t, resp)
	})

	th.TestForSystemAdminAndLocal(t, func(t *testing.T, c *model.Client4) {
		_, err := c.RemoveLicenseFile(context.Background())
		require.NoError(t, err)
	}, "as system admin user")

	t.Run("as restricted system admin user", func(t *testing.T) {
		th.App.UpdateConfig(func(cfg *model.Config) { *cfg.ExperimentalSettings.RestrictSystemAdmin = true })

		resp, err := th.SystemAdminClient.RemoveLicenseFile(context.Background())
		require.Error(t, err)
		CheckForbiddenStatus(t, resp)
	})

	t.Run("restricted admin setting not honoured through local client", func(t *testing.T) {
		th.App.UpdateConfig(func(cfg *model.Config) { *cfg.ExperimentalSettings.RestrictSystemAdmin = true })

		_, err := LocalClient.RemoveLicenseFile(context.Background())
		require.NoError(t, err)
	})
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package localcachelayer

import (
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/v8/channels/store"
)

const (
	CACHE_KEY_REVIEWER_SETTINGS = "reviewer_settings"
)

type LocalCacheContentFlaggingStore struct {
	store.ContentFlaggingStore
	rootStore *LocalCacheStore
}

func (s *LocalCacheContentFlaggingStore) handleClusterInvalidateContentFlagging(msg *model.ClusterMessage) {
	if err := s.rootStore.contentFlaggingCache.Purge(); err != nil {
		s.rootStore.logger.Error("failed to purge content flagging cache", mlog.Err(err))
	}
}

func (s LocalCacheContentFlaggingStore) ClearCaches() {
	if err := s.rootStore.contentFlaggingCache.Purge(); err != nil {
		s.rootStore.logger.Error("failed to purge content flagging cache", mlog.Err(err))
	}

	if s.rootStore.metrics != nil {
		s.rootStore.metrics.IncrementMemCacheInvalidationCounter(s.rootStore.contentFlaggingCache.Name())
	}
}

func (s LocalCacheContentFlaggingStore) GetSettings() (*model.ContentFlaggingSettingsRequest, error) {
	var cached *model.ContentFlaggingSettingsRequest

	err := s.rootStore.doStandardReadCache(s.rootStore.contentFlaggingCache, CACHE_KEY_REVIEWER_SETTINGS, &cached)
	if err == nil {
		return cached, nil
	}

	settings, err := s.ContentFlaggingStore.GetSettings()
	if err != nil {
		return nil, err
	}

	if settings != nil {
		s.rootStore.doStandardAddToCache(s.rootStore.contentFlaggingCache, CACHE_KEY_REVIEWER_SETTINGS, settings)
	}

	return settings, nil
}

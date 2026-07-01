CREATE TABLE IF NOT EXISTS PostDeliveryTrackingChannels (
    ChannelId VARCHAR(26) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_postdeliverytrackingchannels_channelid ON PostDeliveryTrackingChannels (ChannelId);

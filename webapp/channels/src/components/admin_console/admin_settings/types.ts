// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {AdminConfig, ClientLicense} from '@hanzoteam/types/config';
import type {DeepPartial} from '@hanzoteam/types/utilities';

export type HandleSaveFunction = (config: DeepPartial<AdminConfig>, updateSettings: (id: string, value: unknown) => void) => void;
export type GetStateFromConfigFunction<State extends Record<string, any>> = (config: AdminConfig, license: ClientLicense) => State;
export type GetConfigFromStateFunction<State extends Record<string, any>> = (state: State) => DeepPartial<AdminConfig>;

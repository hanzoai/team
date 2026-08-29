// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {useIntl} from 'react-intl';
import {useHistory} from 'react-router-dom';

import type {Command} from '@hanzoteam/types/integrations';
import type {Team} from '@hanzoteam/types/teams';

import type {ActionResult} from '@hanzoteam/redux/types/actions.js';

import AbstractCommand from '../abstract_command';

export type Props = {

    /**
    * The team data
    */
    team: Team;

    actions: {

        /**
        * The function to call to add new command
        */
        addCommand: (command: Command) => Promise<ActionResult<Command>>;
    };
};

const AddCommand = ({team, actions}: Props) => {
    const history = useHistory();
    const {formatMessage} = useIntl();
    const headerMessage = formatMessage({id: 'integrations.add', defaultMessage: 'Add'});
    const footerMessage = formatMessage({id: 'add_command.save', defaultMessage: 'Save'});
    const loadingMessage = formatMessage({id: 'add_command.saving', defaultMessage: 'Saving...'});
    const [serverError, setServerError] = useState('');

    const addCommand = async (command: Command) => {
        setServerError('');

        const {data, error} = await actions.addCommand(command);
        if (data) {
            history.push(`/${team.name}/integrations/commands/confirm?type=commands&id=${data.id}`);
            return;
        }

        if (error) {
            setServerError(error.message);
        }
    };

    return (
        <AbstractCommand
            team={team}
            header={headerMessage}
            footer={footerMessage}
            loading={loadingMessage}
            action={addCommand}
            serverError={serverError}
        />
    );
};

export default AddCommand;

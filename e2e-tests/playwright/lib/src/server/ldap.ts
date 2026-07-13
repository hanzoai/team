// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Attribute, Change, Client} from 'ldapts';

import type {PlaywrightClient4} from './playwright_client';

import {duration, getRandomId, wait} from '@/util';

export type LdapUser = {
    username: string;
    password: string;
    email: string;
    firstName: string;
    lastName: string;
};

const ldapBaseDN = 'ou=e2etest,dc=mm,dc=test,dc=com';
const ldapBindDN = 'cn=admin,dc=mm,dc=test,dc=com';

export function createLdapUser(prefix = 'ldap'): LdapUser {
    const id = getRandomId();
    const username = `${prefix}user${id}`;
    return {
        username,
        password: 'Password1',
        email: `${username}@mmtest.com`,
        firstName: `Firstname-${id}`,
        lastName: `Lastname-${id}`,
    };
}

/**
 * Creates and updates users in the OpenLDAP service supplied by E2E Docker.
 */
export class OpenLdapClient {
    private readonly client: Client;

    constructor(url = process.env.PW_LDAP_URL || 'ldap://localhost:389') {
        this.client = new Client({url, timeout: duration.half_min, connectTimeout: duration.half_min});
    }

    async createUser(user: LdapUser) {
        await this.withBinding(async () => {
            await this.ensureUserOrganizationalUnit();
            await this.client.add(this.userDN(user.username), {
                objectClass: ['iNetOrgPerson'],
                cn: user.firstName,
                sn: user.lastName,
                uid: user.username,
                mail: user.email,
                userPassword: user.password,
            });
        });
    }

    async updateUserNames(username: string, firstName: string, lastName: string) {
        await this.withBinding(async () => {
            await this.client.modify(this.userDN(username), [
                new Change({
                    operation: 'replace',
                    modification: new Attribute({type: 'cn', values: [firstName]}),
                }),
                new Change({
                    operation: 'replace',
                    modification: new Attribute({type: 'sn', values: [lastName]}),
                }),
            ]);
        });
    }

    private async ensureUserOrganizationalUnit() {
        await this.client
            .add(ldapBaseDN, {
                objectClass: ['organizationalUnit'],
                ou: 'e2etest',
            })
            .catch((error: {code?: number}) => {
                if (error.code !== 68) {
                    throw error;
                }
            });
    }

    private async withBinding(action: () => Promise<void>) {
        await this.client.bind(ldapBindDN, process.env.PW_LDAP_BIND_PASSWORD || 'mostest');
        try {
            await action();
        } finally {
            await this.client.unbind();
        }
    }

    private userDN(username: string) {
        return `uid=${username},${ldapBaseDN}`;
    }
}

/**
 * Starts an LDAP synchronization job and waits for its terminal status.
 */
export async function runLdapSync(client: PlaywrightClient4) {
    const pendingJobs = (await client.getJobsByType('ldap_sync', 0, 100))
        .filter((candidate) => candidate.status === 'pending')
        .sort((a, b) => a.create_at - b.create_at);
    // A pending sync reads LDAP when it starts, so reuse it instead of joining the back of a busy queue.
    const job = pendingJobs[0] ?? (await client.createJob({type: 'ldap_sync'}));
    let phase: 'queued' | 'running' = 'queued';
    let phaseDeadline = Date.now() + duration.half_min;

    while (Date.now() < phaseDeadline) {
        const current = await client.getJob(job.id);
        if (current.status === 'success') {
            return current;
        }
        if (current.status === 'error' || current.status === 'canceled' || current.status === 'warning') {
            throw new Error(`LDAP synchronization ${current.id} finished with status ${current.status}`);
        }
        // Queueing and execution each get an independent, bounded window.
        if (current.status === 'in_progress' && phase === 'queued') {
            phase = 'running';
            phaseDeadline = Date.now() + duration.half_min;
        }
        await wait(duration.half_sec);
    }
    throw new Error(`LDAP synchronization ${job.id} did not finish its ${phase} phase within ${duration.half_min}ms`);
}

/**
 * Configures Mattermost for the OpenLDAP service supplied by the E2E Docker
 * environment. A narrow patch avoids resetting unrelated server settings.
 */
export async function configureOpenLdap(client: PlaywrightClient4) {
    await client.patchConfig({
        LdapSettings: {
            Enable: true,
            EnableSync: true,
            LdapServer: 'localhost',
            LdapPort: 389,
            ConnectionSecurity: '',
            BaseDN: 'dc=mm,dc=test,dc=com',
            BindUsername: 'cn=admin,dc=mm,dc=test,dc=com',
            BindPassword: 'mostest',
            UserFilter: '',
            GroupFilter: '',
            GuestFilter: '',
            EnableAdminFilter: false,
            AdminFilter: '',
            GroupDisplayNameAttribute: 'cn',
            GroupIdAttribute: 'entryUUID',
            FirstNameAttribute: 'cn',
            LastNameAttribute: 'sn',
            EmailAttribute: 'mail',
            UsernameAttribute: 'uid',
            NicknameAttribute: 'cn',
            IdAttribute: 'uid',
            PositionAttribute: 'title',
            LoginIdAttribute: 'uid',
            PictureAttribute: '',
            SyncIntervalMinutes: 60,
            SkipCertificateVerification: true,
            PublicCertificateFile: '',
            PrivateKeyFile: '',
            QueryTimeout: 60,
            MaxPageSize: 0,
            LoginFieldName: '',
            LoginButtonColor: '#0000',
            LoginButtonBorderColor: '#2389D7',
            LoginButtonTextColor: '#2389D7',
        },
    });
}

/**
 * Configures, validates, and synchronizes the E2E OpenLDAP directory.
 */
export async function initializeOpenLdap(client: PlaywrightClient4) {
    await configureOpenLdap(client);
    await client.testLdap();
    await client.syncLdap();
}

/**
 * Returns a linked Mattermost group for a named E2E LDAP group.
 */
export async function getOrLinkLdapGroup(client: PlaywrightClient4, name: string) {
    const {groups} = await client.getLdapGroups();
    const ldapGroup = groups.find((group) => group.name === name);
    if (!ldapGroup) {
        throw new Error(`LDAP group ${name} was not found`);
    }

    return ldapGroup.mattermost_group_id
        ? client.getGroup(ldapGroup.mattermost_group_id)
        : client.linkLdapGroup(ldapGroup.primary_key);
}

//
// Copyright © 2025 Hanzo AI Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

export interface Config {
  Port: number
  ServiceId: string
  Secret: string
  AccountsURL: string
  // Slack app credentials (sourced from KMS at deploy, injected as env).
  SlackClientId: string
  SlackClientSecret: string
  SlackSigningSecret: string
  SlackRedirectUri: string
  // KMS envelope wrapping.
  KmsURL: string
  KmsToken: string
  KmsKeyId: string
  // IAM service-account discovery.
  IamURL: string
  IamToken: string
}

const parseNumber = (str: string | undefined): number | undefined => (str !== undefined ? Number(str) : undefined)

const config: Config = (() => {
  const params: Partial<Config> = {
    Port: parseNumber(process.env.PORT) ?? 4023,
    ServiceId: process.env.SERVICE_ID ?? 'slack',
    Secret: process.env.SECRET,
    AccountsURL: process.env.ACCOUNTS_URL,
    SlackClientId: process.env.SLACK_CLIENT_ID,
    SlackClientSecret: process.env.SLACK_CLIENT_SECRET,
    SlackSigningSecret: process.env.SLACK_SIGNING_SECRET,
    SlackRedirectUri: process.env.SLACK_REDIRECT_URI,
    KmsURL: process.env.KMS_URL,
    KmsToken: process.env.KMS_TOKEN,
    KmsKeyId: process.env.KMS_KEY_ID ?? 'team/slack',
    IamURL: process.env.IAM_URL,
    IamToken: process.env.IAM_TOKEN
  }

  const missingEnv = (Object.keys(params) as Array<keyof Config>).filter((key) => params[key] === undefined)
  if (missingEnv.length > 0) {
    throw Error(`Missing config for attributes: ${missingEnv.join(', ')}`)
  }
  return params as Config
})()

export default config

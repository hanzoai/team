//
// Copyright © 2020 Hanzo <dev@hanzo.ai>.
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

import { addStringsLoader, loadMetadata } from '@hanzo/platform'
import survey, { surveyId } from '@hanzo/survey'

const icons = require('../assets/icons.svg') as string // eslint-disable-line
loadMetadata(survey.icon, {
  Application: `${icons}#application`,
  Info: `${icons}#info`,
  Poll: `${icons}#poll`,
  Question: `${icons}#question`,
  QuestionKindString: `${icons}#textline`,
  QuestionKindOption: `${icons}#radio`,
  QuestionKindOptions: `${icons}#checkbox`,
  Survey: `${icons}#survey`,
  Submit: `${icons}#submit`,
  QuestionIsMandatory: `${icons}#asterisk`,
  QuestionHasCustomOption: `${icons}#star`,
  ValidateFail: `${icons}#validate-fail`,
  ValidateOk: `${icons}#validate-ok`
})
addStringsLoader(surveyId, async (lang: string) => await import(`../lang/${lang}.json`))

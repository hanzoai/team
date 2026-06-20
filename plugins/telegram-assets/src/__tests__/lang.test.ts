import { makeLocalesTest } from '@hanzoteam/platform'

it(
  'Locales are equal',
  makeLocalesTest((lang) => import(`../../lang/${lang}.json`))
)

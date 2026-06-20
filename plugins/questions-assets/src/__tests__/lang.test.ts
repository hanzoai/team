import { makeLocalesTest } from '@hanzoteam/platform'

it(
  'Locales are equale',
  makeLocalesTest((lang) => import(`../../lang/${lang}.json`))
)

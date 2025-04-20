import { makeLocalesTest } from '@hanzo/platform'

it(
  'Locales are equale',
  makeLocalesTest((lang) => import(`../../lang/${lang}.json`))
)

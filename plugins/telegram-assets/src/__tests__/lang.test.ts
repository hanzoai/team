import { makeLocalesTest } from '@hanzo/platform'

it(
  'Locales are equal',
  makeLocalesTest((lang) => import(`../../lang/${lang}.json`))
)

import { setMetadata } from '@hanzo/platform'
import presentation from '@hanzo/presentation'
import { type BottomAction } from '.'
import login from './plugin'
import { goTo } from './utils'

export const signUpAction: BottomAction = {
    caption: login.string.DoNotHaveAnAccount,
    i18n: login.string.SignUp,
    page: 'signup',
    func: () => {
        goTo('signup')
    }
}

export const loginAction: BottomAction = {
    caption: login.string.AlreadyJoined,
    i18n: login.string.LogIn,
    page: 'login',
    func: () => {
        setMetadata(presentation.metadata.Token, null)
        goTo('login', true)
    }
}

export const recoveryAction: BottomAction = {
    caption: login.string.ForgotPassword,
    i18n: login.string.Recover,
    page: 'password',
    func: () => {
        goTo('password', true)
    }
}

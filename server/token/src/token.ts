// import { AccountUuid, MeasureContext, PersonUuid, WorkspaceUuid } from '@hanzo/core'
// import { getMetadata } from '@hanzo/platform'
// import jwt from 'jsonwebtoken'
// import serverPlugin from './plugin'

// export interface Token {
//     account: AccountUuid
//     workspace: WorkspaceUuid
//     extra?: Record<string, any>
// }

// export class TokenError extends Error {
//     constructor(message: string) {
//         super(message)
//         this.name = 'TokenError'
//     }
// }

// const getSecret = (): string => {
//     return getMetadata(serverPlugin.metadata.Secret) ?? 'secret'
// }

// // Dán Casdoor cert tại đây:
const CASDOOR_CERT_PEM = process.env.SSO_KEY || `
-----BEGIN CERTIFICATE-----
MIIE3TCCAsWgAwIBAgIDAeJAMA0GCSqGSIb3DQEBCwUAMCgxDjAMBgNVBAoTBWFk
bWluMRYwFAYDVQQDEw1jZXJ0LWJ1aWx0LWluMB4XDTI1MDQwNTA3MzE1MloXDTQ1
MDQwNTA3MzE1MlowKDEOMAwGA1UEChMFYWRtaW4xFjAUBgNVBAMTDWNlcnQtYnVp
bHQtaW4wggIiMA0GCSqGSIb3DQEBAQUAA4ICDwAwggIKAoICAQCvnG9FgMnXP6VC
4RjstVrEajGGZuQtnUtcVouyedGWBSXtaPoGGm9XkSVfdlL7Mfa/OgDDMP0Teffp
NGywxap0tET4WFvsCjBalXRvgkBvIK6/9h83u8DEd1OQeoEnt36FdwID2lcqA1rP
r2iL7QZCzaRp4DffkO7R6gQvy4UP2RmZMf6SvqUvFI+B8UAjBkiTNUZcjSZXbmR5
bZ/3KV3Dn7sgSRD3+XtX4xYAMe3gkEsOLDFkLFHLvLdpIFSylNcTgWp8L3Day1FY
4A4TAwDShOl0M/vl8KCTFOmcaijx38NNQp1z++Q7IJ3jva1c7ofGSjHgXz4PZHGW
RK1ApiwwiHZjdhAEHaADNtA2ZnIE6CnSOmkuiAdEB8UtGecYwfPJixFqleZfQl7t
9ixpfx8dEWaQPkZ88zYXm63uMiNpnhTuukBgNKKoxc4tvSGWkXy4c0j8SKmOdk7L
lEX+JJGWqaP5taOT4z4uiKS5r8drJH1M1tfC2NjQ02uII4GLVt0GXIHZcqOgTUEg
SGXaSW/8zLxOzFXFPi8V8YTV3+jBMmw9OI151gyl5l0mWHZANuquVY6UQrIzC6Hr
/zYJDIaVcUpzahCbVQBgeP6lYLd32nDWYk2hY+J1rqfK25i303eypTyMDxt5iX97
891+AdRgLfOthscJmeKfaoX9AnvakQIDAQABoxAwDjAMBgNVHRMBAf8EAjAAMA0G
CSqGSIb3DQEBCwUAA4ICAQBhPZkppdc5IhtktAmJvsONYNr49iZQkqy1M8TWXP1P
DcN7ddeL619CdShQ7s6MNracPvAWvrFzqqTPiHYG2UM7ZSJG9PiIRnJcg2x+htTi
L2oydpL7h/vGhVCsDw6jjcJU3+sxqUnB7RIhk5kBOj8DRjqjylNJXQ4lvQXCqM0v
oTZ2GnGK+VUeTZe0oatyc0nKP4JbicMjmsj2Hx6WNKyrf7cLJwvkBwwr8hfDYIEh
Ya4zAYKDRYjr+q/pTEFGgFp8nfVtyIfoBQBBp+dVeiDMykbAY1gMChyph9hmlLmH
Yahr7J4jiwnJXTJCcH5cUl+Yuc9ysdRE3c7dDNXi6HHb23b7zflQBcFjerOnYHVk
sk51lOCg2SMLmbpyR8V/r06xuhh8zIsJr5SqGlD5IesyqpC+G6M0jrk2aCxnL4tj
BIbwZbS6ftQuHtcXGR3P6ApbtnHRMB8522XJ4Yj36L8dZC0v1GjfQjMqw909dUG6
w0T2AJY16vMBklHc2Qr9T4VIG3TZH34fMnwM9XQ77ZDnOeWXsHQdT4gCLaoFnMgF
bW+5wRpta3P9L03zEMf+dUPOHqLsbAPhcTQn0E9uTj/qNzsAAT5yT1QVXZyP+74l
QUIEodXhtNx1MtSmQUl073a4qE/Bph6Eybag10jJ5VcyBTWYgEH91V+YITGZbJnc
7g==
-----END CERTIFICATE-----
`

// export function generateToken(
//     accountUuid: PersonUuid,
//     workspaceUuid?: WorkspaceUuid,
//     extra?: Record<string, string>,
//     secret?: string
// ): string {
//     return jwt.sign(
//         { account: accountUuid, workspace: workspaceUuid, ...(extra ? { extra } : {}) },
//         secret ?? getSecret(),
//         { algorithm: 'HS256', expiresIn: '10m' }
//     )
// }


// function normalizeToken(payload: any, isCasdoor: boolean): Token {
//     if (isCasdoor) {
//         return {
//             account: payload.sub,
//             workspace: '' as WorkspaceUuid, // workspace
//             extra: payload
//         }
//     }

//     return payload as Token
// }

// export function decodeToken(token: string, verify: boolean = true, secret?: string): Token {
//     try {
//         const decodedHeader: any = jwt.decode(token, { complete: true })
//         if (!decodedHeader || !decodedHeader.header || !decodedHeader.payload) {
//             throw new TokenError('Invalid token structure')
//         }

//         const isHanzoIam =
//             decodedHeader.header.alg?.startsWith('RS') ||
//             decodedHeader.payload.iss?.startsWith('https://iam.hanzo.ai')

//         const key = isHanzoIam ? CASDOOR_CERT_PEM : (secret ?? getSecret())

//         if (!verify) {
//             const payload = jwt.decode(token)
//             if (!payload) throw new TokenError('Invalid token')
//             return normalizeToken(payload, isHanzoIam)
//         }

//         const payload = jwt.verify(token, key)
//         return normalizeToken(payload, isHanzoIam)
//     } catch (err: any) {
//         throw new TokenError(err.message)
//     }
// }



// export function decodeTokenVerbose(ctx: MeasureContext, token: string): Token {
//     try {
//         return decodeToken(token)
//     } catch (err: any) {
//         try {
//             const payload = decodeToken(token, false)
//             ctx.warn('Failed to verify token', payload)
//         } catch {
//             // ignore
//         }
//         throw new TokenError(err.message)
//     }
// }

import { AccountUuid, MeasureContext, PersonUuid, WorkspaceUuid } from '@hanzo/core'
import { getMetadata } from '@hanzo/platform'
import jwt from 'jsonwebtoken'
import { encode } from 'jwt-simple'
import serverPlugin from './plugin'
/**
 * @public
 */
export interface Token {
    account: AccountUuid
    workspace: WorkspaceUuid
    extra?: Record<string, any>
}

/**
 * @public
 */
export class TokenError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'TokenError'
    }
}

const getSecret = (): string => {
    return getMetadata(serverPlugin.metadata.Secret) ?? 'secret'
}

/**
 * @public
 */
export function generateToken(
    accountUuid: PersonUuid,
    workspaceUuid?: WorkspaceUuid,
    extra?: Record<string, string>,
    secret?: string
): string {
    return encode(
        { ...(extra !== undefined ? { extra } : {}), account: accountUuid, workspace: workspaceUuid },
        secret ?? getSecret()
    )
}

/**
 * @public
 */
export function decodeToken(token: string, temp?: boolean): Token {
    const decodedHeader = jwt.decode(token, { complete: true })
    if (!decodedHeader) throw new TokenError('Invalid token')

    const isCasdoor = decodedHeader.header.alg?.startsWith('RS')

    const key = isCasdoor ? CASDOOR_CERT_PEM : getSecret()

    let payload: any

    try {
        payload = jwt.verify(token, key)
    } catch (err) {
        throw new TokenError('Invalid token signature')
    }

    if (isCasdoor) {
        return {
            account: payload.sub,
            workspace: '' as WorkspaceUuid,
            extra: payload
        }
    } else {
        return payload as Token
    }
}
/**====
 * @public
 */
export function decodeTokenVerbose(ctx: MeasureContext, token: string): Token {
    try {
        return decodeToken(token, false)
    } catch (err: any) {
        try {
            const decode = decodeToken(token, false)
            ctx.warn('Failed to verify token', { ...decode })
        } catch (err2: any) {
            // Nothing to do
        }
        throw new TokenError(err.message)
    }
}

import { redirect } from '@remix-run/node'
import { OIDCStrategy } from 'web-oidc/remix'
import { sessionStorage } from '../session.server.ts'
import { redirectWithToast } from '../toast.server.ts'
import { type AuthProvider } from './provider.ts'

const shouldMock = process.env.GOOGLE_CLIENT_ID?.startsWith('MOCK_')

export class GoogleProvider implements AuthProvider {
	getAuthStrategy() {
		return new OIDCStrategy(
			{
				client_id: process.env.GOOGLE_CLIENT_ID,
				client_secret: process.env.GOOGLE_CLIENT_SECRET,
				redirect_uri: 'http://localhost:3000/auth/google/callback',
				authorizationParams: {
					scope: ['openid', 'email'],
				},
				issuer: 'https://accounts.google.com',
				response_type: 'code',
			},
			async ({ profile }) => {
				if (!profile.email || !profile.email_verified) {
					throw redirectWithToast('/login', {
						title: 'Cannot connect Google Account',
						description: 'Your Google Email is Unverified',
						type: 'error',
					})
				}
				return {
					email: profile.email,
					id: profile.sub,
					username:
						profile.preferred_username ??
						profile.email.replace('@gmail.com', ''),
					name: profile.given_name,
					imageUrl: profile.picture,
				}
			},
		)
	}

	async resolveConnectionData(providerId: string) {
		// TODO: hit a Google API to resolve the user's ID to their email address
		// for a better display name
		return {
			displayName: providerId,
		} as const
	}

	async handleMockAction(redirectToCookie: string | null) {
		if (!shouldMock) return
		throw redirect(`/auth/google/callback?code=MOCK_CODE&state=MOCK_STATE`, {
			headers: redirectToCookie ? { 'set-cookie': redirectToCookie } : {},
		})
	}

	async handleMockCallback(request: Request) {
		if (!shouldMock) return request

		const cookieSession = await sessionStorage.getSession(
			request.headers.get('cookie'),
		)
		const state = cookieSession.get('oidc:state') ?? 'MOCK_STATE'
		cookieSession.set('oidc:state', state)
		const reqUrl = new URL(request.url)
		reqUrl.searchParams.set('state', state)
		request.headers.set(
			'cookie',
			await sessionStorage.commitSession(cookieSession),
		)
		return new Request(reqUrl.toString(), request)
	}
}

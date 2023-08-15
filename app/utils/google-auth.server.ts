import { OIDCStrategy } from 'web-oidc/remix'
import { redirectWithToast } from './toast.server.ts'
export const GOOGLE_PROVIDER_NAME = 'google'

export function getGoogleAuthStrategy() {
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
				username: profile.preferred_username,
				name: profile.given_name,
				imageUrl: profile.picture,
			}
		},
	)
}

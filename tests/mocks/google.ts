import fs from 'node:fs'
import { faker } from '@faker-js/faker'
import { HttpResponse, passthrough, http, type HttpHandler } from 'msw'

const { json } = HttpResponse

export const mockGoogleProfile = {
	sub: faker.string.uuid(),
	picture: `https://lh3.googleusercontent.com/a-/${faker.string.uuid()}`,
	email: faker.internet.email(),
	email_verified: true,
}

const passthroughGoogle =
	!process.env.GOOGLE_CLIENT_ID.startsWith('MOCK_') &&
	process.env.NODE_ENV !== 'test'
export const handlers: Array<HttpHandler> = [
	http.get(
		'https://accounts.google.com/.well-known/openid-configuration',
		() => {
			if (passthroughGoogle) return passthrough()

			return json({
				issuer: 'https://accounts.google.com',
				authorization_endpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
				device_authorization_endpoint:
					'https://oauth2.googleapis.com/device/code',
				token_endpoint: 'https://oauth2.googleapis.com/token',
				userinfo_endpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
				revocation_endpoint: 'https://oauth2.googleapis.com/revoke',
				jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs',
				response_types_supported: [
					'code',
					'token',
					'id_token',
					'code token',
					'code id_token',
					'token id_token',
					'code token id_token',
					'none',
				],
				subject_types_supported: ['public'],
				id_token_signing_alg_values_supported: ['RS256'],
				scopes_supported: ['openid', 'email', 'profile'],
				token_endpoint_auth_methods_supported: [
					'client_secret_post',
					'client_secret_basic',
				],
				claims_supported: [
					'aud',
					'email',
					'email_verified',
					'exp',
					'family_name',
					'given_name',
					'iat',
					'iss',
					'locale',
					'name',
					'picture',
					'sub',
				],
				code_challenge_methods_supported: ['plain', 'S256'],
				grant_types_supported: [
					'authorization_code',
					'refresh_token',
					'urn:ietf:params:oauth:grant-type:device_code',
					'urn:ietf:params:oauth:grant-type:jwt-bearer',
				],
			})
		},
	),
	http.post('https://oauth2.googleapis.com/token', async () => {
		if (passthroughGoogle) return passthrough()

		return json({
			access_token: '__MOCK_ACCESS_TOKEN__',
			expires_in: 3599,
			scope: 'openid https://www.googleapis.com/auth/userinfo.email',
			token_type: 'Bearer',
			id_token: faker.string.uuid(),
		})
	}),
	http.get('https://openidconnect.googleapis.com/v1/userinfo', async () => {
		if (passthroughGoogle) return passthrough()
		return json(mockGoogleProfile)
	}),
	http.get('https://lh3.googleusercontent.com/a-/:id', async () => {
		if (passthroughGoogle) return passthrough()

		const buffer = await fs.promises.readFile(
			'./tests/fixtures/images/google-avatar.jpg',
		)
		return new Response(buffer, {
			headers: { 'content-type': 'image/jpg' },
		})
	}),
]

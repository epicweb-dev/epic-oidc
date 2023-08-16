import { generateTOTP } from '@epic-web/totp'
import { faker } from '@faker-js/faker'
import { http } from 'msw'
import { expect, test } from 'vitest'
import { createUser } from '../../../tests/db-utils.ts'
import { mockGoogleProfile } from '../../../tests/mocks/google.ts'
import { server } from '../../../tests/mocks/index.ts'
import { consoleError } from '../../../tests/setup/setup-test-env.ts'
import { BASE_URL, convertSetCookieToCookie } from '../../../tests/utils.ts'
import {
	getSessionExpirationDate,
	sessionKey,
} from '../../utils/auth.server.ts'
import { GOOGLE_PROVIDER_NAME } from '../../utils/connections.tsx'
import { prisma } from '../../utils/db.server.ts'
import { invariant } from '../../utils/misc.tsx'
import { sessionStorage } from '../../utils/session.server.ts'
import { twoFAVerificationType } from '../settings+/profile.two-factor.tsx'
import { loader } from './auth.$provider.callback.ts'

const ROUTE_PATH = '/auth/google/callback'
const PARAMS = { provider: 'google' }

test('a new user goes to onboarding', async () => {
	const request = await setupRequest()
	const response = await loader({ request, params: PARAMS, context: {} }).catch(
		e => e,
	)
	expect(response).toHaveRedirect('/onboarding/google')
})

test('when auth fails, send the user to login with a toast', async () => {
	server.use(
		http.post('https://oauth2.googleapis.com/token', async () => {
			return new Response('error', { status: 400 })
		}),
	)
	const request = await setupRequest()
	const response = await loader({ request, params: PARAMS, context: {} }).catch(
		e => e,
	)
	invariant(response instanceof Response, 'response should be a Response')
	expect(response).toHaveRedirect('/login')
	await expect(response).toSendToast(
		expect.objectContaining({
			title: 'Auth Failed',
			type: 'error',
		}),
	)
	expect(consoleError).toHaveBeenCalledTimes(1)
	consoleError.mockClear()
})

test('when a user is logged in, it creates the connection', async () => {
	const session = await setupUser()
	const request = await setupRequest(session.id)
	const response = await loader({ request, params: PARAMS, context: {} })
	expect(response).toHaveRedirect('/settings/profile/connections')
	await expect(response).toSendToast(
		expect.objectContaining({
			title: 'Connected',
			type: 'success',
			description: expect.stringContaining(
				mockGoogleProfile.email.replace('@gmail.com', ''),
			),
		}),
	)
	const connection = await prisma.connection.findFirst({
		select: { id: true },
		where: {
			userId: session.userId,
			providerId: mockGoogleProfile.sub,
		},
	})
	expect(
		connection,
		'the connection was not created in the database',
	).toBeTruthy()
})

test(`when a user is logged in and has already connected, it doesn't do anything and just redirects the user back to the connections page`, async () => {
	const session = await setupUser()
	await prisma.connection.create({
		data: {
			providerName: GOOGLE_PROVIDER_NAME,
			userId: session.userId,
			providerId: mockGoogleProfile.sub,
		},
	})
	const request = await setupRequest(session.id)
	const response = await loader({ request, params: PARAMS, context: {} })
	expect(response).toHaveRedirect('/settings/profile/connections')
	expect(response).toSendToast(
		expect.objectContaining({
			title: 'Already Connected',
			description: expect.stringContaining(
				mockGoogleProfile.email.replace('@gmail.com', ''),
			),
		}),
	)
})

test('when a user exists with the same email, create connection and make session', async () => {
	const email = mockGoogleProfile.email.toLowerCase()
	const { userId } = await setupUser({ ...createUser(), email })
	const request = await setupRequest()
	const response = await loader({ request, params: PARAMS, context: {} })

	expect(response).toHaveRedirect('/')

	await expect(response).toSendToast(
		expect.objectContaining({
			type: 'message',
			description: expect.stringContaining(
				mockGoogleProfile.email.replace('@gmail.com', ''),
			),
		}),
	)

	const connection = await prisma.connection.findFirst({
		select: { id: true },
		where: {
			userId: userId,
			providerId: mockGoogleProfile.sub,
		},
	})
	expect(
		connection,
		'the connection was not created in the database',
	).toBeTruthy()

	await expect(response).toHaveSessionForUser(userId)
})

test('gives an error if the account is already connected to another user', async () => {
	await prisma.user.create({
		data: {
			...createUser(),
			connections: {
				create: {
					providerName: GOOGLE_PROVIDER_NAME,
					providerId: mockGoogleProfile.sub,
				},
			},
		},
	})
	const session = await setupUser()
	const request = await setupRequest(session.id)
	const response = await loader({ request, params: PARAMS, context: {} })
	expect(response).toHaveRedirect('/settings/profile/connections')
	await expect(response).toSendToast(
		expect.objectContaining({
			title: 'Already Connected',
			description: expect.stringContaining(
				'already connected to another account',
			),
		}),
	)
})

test('if a user is not logged in, but the connection exists, make a session', async () => {
	const { userId } = await setupUser()
	await prisma.connection.create({
		data: {
			providerName: GOOGLE_PROVIDER_NAME,
			providerId: mockGoogleProfile.sub,
			userId,
		},
	})
	const request = await setupRequest()
	const response = await loader({ request, params: PARAMS, context: {} })
	expect(response).toHaveRedirect('/')
	await expect(response).toHaveSessionForUser(userId)
})

test('if a user is not logged in, but the connection exists and they have enabled 2FA, send them to verify their 2FA and do not make a session', async () => {
	const { userId } = await setupUser()
	await prisma.connection.create({
		data: {
			providerName: GOOGLE_PROVIDER_NAME,
			providerId: mockGoogleProfile.sub,
			userId,
		},
	})
	const { otp: _otp, ...config } = generateTOTP()
	await prisma.verification.create({
		data: {
			type: twoFAVerificationType,
			target: userId,
			...config,
		},
	})
	const request = await setupRequest()
	const response = await loader({ request, params: PARAMS, context: {} })
	const searchParams = new URLSearchParams({
		type: twoFAVerificationType,
		target: userId,
		redirectTo: '/',
		remember: 'on',
	})
	searchParams.sort()
	expect(response).toHaveRedirect(`/verify?${searchParams}`)
})

async function setupRequest(sessionId?: string) {
	const url = new URL(ROUTE_PATH, BASE_URL)
	const state = faker.string.uuid()
	const code = faker.string.uuid()
	url.searchParams.set('state', state)
	url.searchParams.set('code', code)
	const cookieSession = await sessionStorage.getSession()
	cookieSession.set('oidc:state', state)
	if (sessionId) cookieSession.set(sessionKey, sessionId)
	const setCookieHeader = await sessionStorage.commitSession(cookieSession)
	const request = new Request(url.toString(), {
		method: 'GET',
		headers: { cookie: convertSetCookieToCookie(setCookieHeader) },
	})
	return request
}

async function setupUser(userData = createUser()) {
	const session = await prisma.session.create({
		data: {
			expirationDate: getSessionExpirationDate(),
			user: {
				create: {
					...userData,
				},
			},
		},
		select: {
			id: true,
			userId: true,
		},
	})

	return session
}

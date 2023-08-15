import { Form } from '@remix-run/react'
import { z } from 'zod'
import { Icon } from '../components/ui/icon.tsx'
import { StatusButton } from '../components/ui/status-button.tsx'
import { useIsPending } from './misc.tsx'

export const GITHUB_PROVIDER_NAME = 'github'
export const GOOGLE_PROVIDER_NAME = 'google'

export const providerNames = [
	GITHUB_PROVIDER_NAME,
	GOOGLE_PROVIDER_NAME,
] as const
export const ProviderNameSchema = z.enum(providerNames)
export type ProviderName = z.infer<typeof ProviderNameSchema>

export const providerLabels = {
	[GOOGLE_PROVIDER_NAME]: 'Google',
	[GITHUB_PROVIDER_NAME]: 'GitHub',
} as const

export const providerIcons = {
	[GITHUB_PROVIDER_NAME]: <Icon name="github-logo" />,
	[GOOGLE_PROVIDER_NAME]: <Icon name="google-logo" />,
} as const

export function ProviderConnectionForm({
	redirectTo,
	type,
	providerName,
}: {
	redirectTo?: string | null
	type: 'Connect' | 'Login' | 'Signup'
	providerName: ProviderName
}) {
	const label = providerLabels[providerName]
	const formAction = `/auth/${providerName}`
	const isPending = useIsPending({ formAction })
	return (
		<Form
			className="flex items-center justify-center gap-2"
			action={formAction}
			method="POST"
		>
			{redirectTo ? (
				<input type="hidden" name="redirectTo" value={redirectTo} />
			) : null}
			<StatusButton
				type="submit"
				className="w-full"
				status={isPending ? 'pending' : 'idle'}
			>
				<span className="inline-flex items-center gap-1.5">
					{providerIcons[providerName]}
					<span>
						{type} with {label}
					</span>
				</span>
			</StatusButton>
		</Form>
	)
}

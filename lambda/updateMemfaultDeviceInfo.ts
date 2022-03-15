import { apiRequest } from './apiClient.js'

export const updateMemfaultDeviceInfo =
	({
		apiEndpoint,
		organization,
		authToken,
		project,
	}: {
		apiEndpoint?: string
		authToken: string
		organization: string
		project: string
	}) =>
	async ({
		device,
		update,
	}: {
		device: string
		update: Partial<{
			hardware_version: string // e.g. 'evt'
			cohort: string // e.g. 'internal'
			nickname: string // e.g. 'INTERNAL-1234'
			description: string // e.g. 'Kitchen Smart Sink'
		}>
	}): Promise<void> => {
		const payload = JSON.stringify(update)
		await apiRequest(
			{
				hostname: apiEndpoint ?? 'api.memfault.com',
				port: 443,
				path: `/api/v0/organizations/${organization}/projects/${project}/devices/${device}`,
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json; charset=utf-8',
					'Content-Length': payload.length,
					Authorization: `Basic ${Buffer.from(`:${authToken}`).toString(
						'base64',
					)}`,
				},
			},
			payload,
		)
	}

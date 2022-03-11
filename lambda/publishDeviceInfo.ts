import type { IncomingMessage } from 'http'
import https from 'https'

const updateMemfaultDeviceInfo =
	({
		endpoint,
		organization,
		authToken,
		project,
	}: {
		endpoint: string
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
	}) => {
		const payload = JSON.stringify(update)
		const options = {
			hostname: endpoint, // usually api.memfault.com
			port: 443,
			path: `/api/v0/organizations/${organization}/projects/${project}/devices/${device}`,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
				'Content-Length': payload.length,
				Authorization: `Basic ${Buffer.from(`:${authToken}`).toString(
					'base64',
				)}`,
			},
		}
		return new Promise<IncomingMessage>((resolve, reject) => {
			const req = https.request(options, resolve)
			req.on('error', reject)
			req.write(payload)
			req.end()
		})
	}

const client = async () => {
	// FIXME: fetch SSM parameters
	return updateMemfaultDeviceInfo({} as any)
}

export const handler = async ({
	hardware_version,
	nickname,
	deviceId,
}: {
	hardware_version?: string
	nickname?: string
	deviceId: string
}): Promise<void> => {
	console.log(
		JSON.stringify({
			hardware_version,
			nickname,
			deviceId,
		}),
	)
	const c = await client()
	await c({
		device: deviceId,
		update: {
			nickname,
			hardware_version,
		},
	})
}

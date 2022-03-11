import { GetParametersByPathCommand, SSMClient } from '@aws-sdk/client-ssm'
import type { IncomingMessage } from 'http'
import https from 'https'

const ssm = new SSMClient({})

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
	// FIXME: make SSM function re-usable
	const Path = `${process.env.STACK_NAME}/thirdParty/memfault`
	const { Parameters } = await ssm.send(
		new GetParametersByPathCommand({
			Path,
			Recursive: true,
		}),
	)
	if ((Parameters?.length ?? 0) === 0)
		throw new Error(`System not configured: ${Path}!`)

	const { authToken, endpoint, organization, project } = (Parameters ?? [])
		.map(({ Name, ...rest }) => ({
			...rest,
			Name: Name?.replace(`${Path}/`, ''),
		}))
		.reduce(
			(settings, { Name, Value }) => ({
				...settings,
				[Name ?? '']: Value ?? '',
			}),
			{} as Record<string, any>,
		)

	if (authToken === undefined)
		throw new Error(`System is not configured: ${Path}/${authToken}!`)
	if (endpoint === undefined)
		throw new Error(`System is not configured: ${Path}/${endpoint}!`)
	if (organization === undefined)
		throw new Error(`System is not configured: ${Path}/${organization}!`)
	if (project === undefined)
		throw new Error(`System is not configured: ${Path}/${project}!`)

	return updateMemfaultDeviceInfo({
		authToken,
		endpoint,
		organization,
		project,
	})
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

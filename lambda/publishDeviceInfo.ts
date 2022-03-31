import { SSMClient } from '@aws-sdk/client-ssm'
import { createMemfaultHardwareVersion } from './createMemfaultHardwareVersion.js'
import { getConfigFromSSM } from './getConfigFromSSM.js'
import { updateMemfaultDeviceInfo } from './updateMemfaultDeviceInfo.js'

// Load configuration from SSM
const stackName = process.env.STACK_NAME
const ssm = new SSMClient({})
const config = getConfigFromSSM({
	ssm,
	Path: `/${stackName}/thirdParty/memfault`,
})({
	authToken: true,
	apiEndpoint: false,
	organization: true,
	project: true,
})

// Prepare API client
const deviceInfoPublisher = (async () =>
	updateMemfaultDeviceInfo(await config))()

const hardwareVersionCreator = (async () =>
	createMemfaultHardwareVersion(await config))()

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
	const c = await deviceInfoPublisher
	const { res, body } = await c({
		device: deviceId,
		update: {
			nickname,
			hardware_version,
		},
	})

	const statusCode = res.statusCode ?? 500
	if (statusCode === 200) return // all fine.
	if (
		hardware_version !== undefined &&
		(res.headers['content-type']?.includes('application/json') ?? false) &&
		(res.headers['content-length'] ?? 0) > 0
	) {
		let errorInfo: Record<string, any> | undefined = undefined
		try {
			errorInfo = JSON.parse(body)
		} catch {
			// parsing failed
			console.debug(`Failed to debug response body as JSON`, body)
		}
		if (
			errorInfo?.error?.code === 1003 &&
			/HardwareVersion with name `[^`]+` not found/.test(
				errorInfo?.error?.message ?? '',
			)
		) {
			// The hardware version we are trying to set needs to be created
			const hc = await hardwareVersionCreator
			await hc({
				hardware_version,
			})
			// And send the update again
			await c({
				device: deviceId,
				update: {
					nickname,
					hardware_version,
				},
			})
		}
	}
}

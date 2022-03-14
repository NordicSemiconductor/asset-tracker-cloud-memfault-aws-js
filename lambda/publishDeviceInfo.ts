import { SSMClient } from '@aws-sdk/client-ssm'
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
const client = async () => updateMemfaultDeviceInfo(await config)

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

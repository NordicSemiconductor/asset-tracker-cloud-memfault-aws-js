import { SSMClient } from '@aws-sdk/client-ssm'
import { getConfigFromSSM } from './getConfigFromSSM.js'
import { publishMemfaultChunks } from './publishMemfaultChunks.js'

// Load configuration from SSM
const stackName = process.env.STACK_NAME
const ssm = new SSMClient({})
const config = getConfigFromSSM({
	ssm,
	Path: `/${stackName}/thirdParty/memfault`,
})({
	chunksEndpoint: false,
	projectKey: true,
})

// Prepare API client
const client = async () => publishMemfaultChunks(await config)

export const handler = async ({
	deviceId,
	chunkBase64Encoded,
}: {
	chunkBase64Encoded: string
	deviceId: string
}): Promise<void> => {
	console.log(
		JSON.stringify({
			deviceId,
			chunkLength: chunkBase64Encoded.length,
			chunkBase64Encoded,
		}),
	)
	if (chunkBase64Encoded.length === 0) {
		throw new Error(`Chunk is empty.`)
	}
	const c = await client()
	await c({
		chunkBase64Encoded,
		device: deviceId,
	})
}

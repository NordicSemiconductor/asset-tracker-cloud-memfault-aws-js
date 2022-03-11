import type { IncomingMessage } from 'http'
import https from 'https'

const publishMemfaultChunks =
	({
		endpoint,
		memfaultProjectKey,
	}: {
		endpoint: string
		memfaultProjectKey: string
	}) =>
	async ({
		device,
		chunkBase64Encoded,
	}: {
		device: string
		chunkBase64Encoded: string
	}) => {
		const options = {
			hostname: endpoint, // chunks.memfault.com
			port: 443,
			path: `/api/v0/chunks/${device}`,
			method: 'POST',
			headers: {
				'Content-Type': 'application/octet-stream',
				'Content-Length': chunkBase64Encoded.length,
				'Memfault-Project-Key': memfaultProjectKey,
			},
		}
		return new Promise<IncomingMessage>((resolve, reject) => {
			const req = https.request(options, resolve)
			req.on('error', reject)
			req.write(chunkBase64Encoded)
			req.end()
		})
	}

const client = async () => {
	// FIXME: fetch SSM parameters
	return publishMemfaultChunks({} as any)
}

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
			chunkBase64Encoded,
		}),
	)
	const c = await client()
	await c({
		chunkBase64Encoded,
		device: deviceId,
	})
}

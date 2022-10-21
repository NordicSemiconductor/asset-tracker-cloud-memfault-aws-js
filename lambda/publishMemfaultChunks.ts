import { apiRequest } from './apiClient.js'

export const publishMemfaultChunks =
	({
		chunksEndpoint,
		projectKey,
	}: {
		chunksEndpoint?: string
		projectKey: string
	}) =>
	async ({
		device,
		chunkBase64Encoded,
	}: {
		device: string
		chunkBase64Encoded: string
	}): Promise<ReturnType<typeof apiRequest>> => {
		const payload = Buffer.from(chunkBase64Encoded, 'base64')
		const endpoint = new URL(chunksEndpoint ?? 'https://chunks.memfault.com')
		const base = (endpoint.pathname ?? '').replace(/\/+$/, '')
		return apiRequest(
			{
				hostname: endpoint.hostname,
				port: 443,
				path: `${base}/api/v0/chunks/${device}`,
				method: 'POST',
				headers: {
					'Content-Type': 'application/octet-stream',
					'Content-Length': payload.length,
					'Memfault-Project-Key': projectKey,
				},
			},
			payload,
		)
	}

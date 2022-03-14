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
	}): Promise<void> => {
		const payload = Buffer.from(chunkBase64Encoded, 'base64')
		return apiRequest(
			{
				hostname: chunksEndpoint ?? 'chunks.memfault.com',
				port: 443,
				path: `/api/v0/chunks/${device}`,
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

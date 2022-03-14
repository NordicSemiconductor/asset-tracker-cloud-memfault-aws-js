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
	}): Promise<void> =>
		apiRequest(
			{
				hostname: chunksEndpoint ?? 'chunks.memfault.com',
				port: 443,
				path: `/api/v0/chunks/${device}`,
				method: 'POST',
				headers: {
					'Content-Type': 'application/octet-stream',
					'Content-Length': chunkBase64Encoded.length,
					'Memfault-Project-Key': projectKey,
				},
			},
			chunkBase64Encoded,
		)

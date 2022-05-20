import { splitMockResponse } from './splitMockResponse'

describe('split mock response', () => {
	it('should parse headers and body', () =>
		expect(
			splitMockResponse(
				`Memfault-Project-Key: my-projectKey
				Content-Type: application/octet-stream

				<chunk data>`,
			),
		).toMatchObject({
			headers: {
				'Memfault-Project-Key': 'my-projectKey',
				'Content-Type': 'application/octet-stream',
			},
			body: '<chunk data>',
		}))
})

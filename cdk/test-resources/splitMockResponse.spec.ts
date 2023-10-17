import { splitMockResponse } from './splitMockResponse.js'
import { describe, it } from 'node:test'
import assert from 'node:assert'
void describe('split mock response', () => {
	void it('should parse headers and body', () =>
		assert.deepEqual(
			splitMockResponse(
				`Memfault-Project-Key: my-projectKey
				Content-Type: application/octet-stream

				<chunk data>`,
			),
			{
				headers: {
					'Memfault-Project-Key': 'my-projectKey',
					'Content-Type': 'application/octet-stream',
				},
				body: '<chunk data>',
			},
		))
})

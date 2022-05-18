import { splitMockResponse } from './splitMockResponse'

describe('split mock response', () => {
	it('should parse headers and body', () =>
		expect(
			splitMockResponse(`Memfault-Project-Key: xlasfdplj987sadh5797azlpacy9og871
Content-Type: application/octet-stream

<chunk data>`),
		).toMatchObject({
			headers: {
				'Memfault-Project-Key': 'xlasfdplj987sadh5797azlpacy9og871',
				'Content-Type': 'application/octet-stream',
			},
			body: '<chunk data>',
		}))
})

import type { SQSEvent } from 'aws-lambda'

export const handler = async (event: SQSEvent): Promise<void> => {
	// FIXME: we need to figure out, if we have received all messages in a sequence
	console.log(JSON.stringify({ event }))
}

import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs'

const sqs = new SQSClient({})
const QueueUrl = process.env.QUEUE_URL

export const handler = async ({
	deviceId,
	messageBase64Encoded,
	timestampUnixMs,
	messageId,
}: {
	messageBase64Encoded: string
	deviceId: string
	messageId: string
	timestampUnixMs: number
}): Promise<void> => {
	console.log(
		messageId,
		deviceId,
		`Received`,
		Buffer.from(messageBase64Encoded, 'base64').length,
		'bytes of data',
	)
	await sqs.send(
		new SendMessageCommand({
			QueueUrl,
			MessageBody: JSON.stringify([messageBase64Encoded]),
			MessageAttributes: {
				deviceId: {
					StringValue: deviceId,
					DataType: 'String',
				},
				timestamp: {
					StringValue: new Date(timestampUnixMs).toISOString(),
					DataType: 'String',
				},
			},
			MessageGroupId: deviceId,
			MessageDeduplicationId: messageId,
			DelaySeconds: 60,
		}),
	)
}

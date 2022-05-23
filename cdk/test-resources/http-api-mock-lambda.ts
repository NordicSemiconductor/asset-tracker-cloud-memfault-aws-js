import {
	DeleteItemCommand,
	DynamoDBClient,
	PutItemCommand,
	QueryCommand,
} from '@aws-sdk/client-dynamodb'
import type {
	APIGatewayEvent,
	APIGatewayProxyResult,
	Context,
} from 'aws-lambda'
import { URLSearchParams } from 'url'
import { splitMockResponse } from './splitMockResponse.js'

const db = new DynamoDBClient({})

export const handler = async (
	event: APIGatewayEvent,
	context: Context,
): Promise<APIGatewayProxyResult> => {
	const pathWithQuery = `${event.path.replace(/^\//, '')}${
		event.queryStringParameters !== null &&
		event.queryStringParameters !== undefined
			? `?${new URLSearchParams(
					event.queryStringParameters as Record<string, string>,
			  ).toString()}`
			: ''
	}`

	await db.send(
		new PutItemCommand({
			TableName: process.env.REQUESTS_TABLE_NAME,
			Item: {
				methodPathQuery: {
					S: `${event.httpMethod} ${pathWithQuery}`,
				},
				timestamp: {
					S: new Date().toISOString(),
				},
				requestId: {
					S: context.awsRequestId,
				},
				method: {
					S: event.httpMethod,
				},
				path: {
					S: pathWithQuery,
				},
				body: {
					S: event.body ?? '{}',
				},
				headers: {
					S: JSON.stringify(event.headers),
				},
				ttl: {
					N: `${Math.round(Date.now() / 1000) + 5 * 60}`,
				},
			},
		}),
	)

	// Check if response exists
	console.log(
		`Checking if response exists for ${event.httpMethod} ${pathWithQuery}...`,
	)
	const { Items } = await db.send(
		new QueryCommand({
			TableName: process.env.RESPONSES_TABLE_NAME,
			KeyConditionExpression: 'methodPathQuery = :methodPathQuery',
			ExpressionAttributeValues: {
				[':methodPathQuery']: {
					S: `${event.httpMethod} ${pathWithQuery}`,
				},
			},
			Limit: 1,
		}),
	)
	if (Items !== undefined && (Items?.length ?? 0) > 0) {
		const Item = Items[0]
		console.log(JSON.stringify(Item))
		await db.send(
			new DeleteItemCommand({
				TableName: process.env.RESPONSES_TABLE_NAME,
				Key: {
					methodPathQuery: Item.methodPathQuery,
					timestamp: Item.timestamp,
				},
			}),
		)

		const { body, headers } = splitMockResponse(Item.body.S ?? '')

		// Send as binary, if mock response is HEX encoded. See https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-payload-encodings.html
		const isBinary = /^[0-9a-f]+$/.test(body)
		const res = {
			statusCode: parseInt(Item.statusCode.N ?? '200', 10),
			headers: isBinary
				? {
						...headers,
						'Content-Type': 'application/octet-stream',
				  }
				: headers,
			body: isBinary
				? /* body is HEX encoded */ Buffer.from(body, 'hex').toString('base64')
				: body,
			isBase64Encoded: isBinary,
		}
		console.log(JSON.stringify(res))

		return res
	} else {
		console.log('no responses found')
	}

	return { statusCode: 404, body: '' }
}

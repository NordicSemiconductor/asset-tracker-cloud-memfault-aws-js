import {
	DeleteItemCommand,
	DynamoDBClient,
	PutItemCommand,
	QueryCommand,
} from '@aws-sdk/client-dynamodb'
import {
	regexGroupMatcher,
	type InterpolatedStep,
	type StepRunnerFunc,
} from '@nordicsemiconductor/e2e-bdd-test-runner'
import backoff from 'backoff'
import * as chai from 'chai'
import { expect } from 'chai'
import chaiSubset from 'chai-subset'
import { splitMockResponse } from '../../cdk/test-resources/splitMockResponse.js'
import type { MemfaultIntegrationWorld } from '../run-features.js'
chai.use(chaiSubset)

export const httpApiMockStepRunners = ({
	db,
}: {
	db: DynamoDBClient
}): ((
	step: InterpolatedStep,
) => StepRunnerFunc<MemfaultIntegrationWorld> | false)[] => [
	regexGroupMatcher<MemfaultIntegrationWorld>(
		/^I enqueue this mock HTTP API response with status code (?<statusCode>[0-9]+) for a (?<method>[A-Z]+) request to (?<path>.+)$/,
	)(async ({ statusCode, method, path }, step, runner) => {
		if (step.interpolatedArgument === undefined) {
			throw new Error('Must provide argument!')
		}
		await db.send(
			new PutItemCommand({
				TableName: runner.world['httpApiMock:responsesTableName'],
				Item: {
					methodPathQuery: {
						S: `${method} ${path}`,
					},
					timestamp: {
						S: new Date().toISOString(),
					},
					statusCode: {
						N: statusCode,
					},
					body: {
						S: step.interpolatedArgument,
					},
					ttl: {
						N: `${Math.round(Date.now() / 1000) + 5 * 60}`,
					},
				},
			}),
		)
	}),
	regexGroupMatcher<MemfaultIntegrationWorld>(
		/^the mock HTTP API should have been called with a (?<method>[A-Z]+) request to (?<path>.+)$/,
	)(async ({ method, path }, step, runner) => {
		let expectedBody: Record<string, any> | string | undefined = undefined
		let expectedHeaders: Record<string, string> | undefined = undefined
		let isBinaryBody = false
		if (step.interpolatedArgument !== undefined) {
			const { body, headers } = splitMockResponse(step.interpolatedArgument)
			if (
				headers['Content-Type']?.startsWith('application/octet-stream') ??
				false
			) {
				isBinaryBody = true
				expectedBody = body
			} else {
				expectedBody = JSON.parse(body)
			}
			expectedHeaders = headers
		}

		await new Promise<void>((resolve, reject) => {
			const fetchRequestsBackoff = backoff.exponential({
				initialDelay: 500,
				maxDelay: 5000,
			})
			fetchRequestsBackoff.failAfter(10)
			fetchRequestsBackoff.on('ready', async () => {
				try {
					await tryRequest({
						db,
						TableName: runner.world['httpApiMock:requestsTableName'],
						method,
						path,
						isBinaryBody,
						expectedBody,
						expectedHeaders,
					})
					return resolve()
				} catch {
					fetchRequestsBackoff.backoff()
				}
			})
			fetchRequestsBackoff.on('fail', () =>
				reject(new Error('Timed out waiting for requests...')),
			)
			fetchRequestsBackoff.backoff()
		})
	}),
]

const tryRequest = async ({
	db,
	TableName,
	method,
	path,
	isBinaryBody,
	expectedBody,
	expectedHeaders,
}: {
	db: DynamoDBClient
	TableName: string
	method: string
	path: string
	isBinaryBody: boolean
	expectedBody?: string | Record<string, string>
	expectedHeaders?: Record<string, string>
}) => {
	const res = await db.send(
		new QueryCommand({
			TableName,
			KeyConditionExpression: 'methodPathQuery = :methodPathQuery',
			ExpressionAttributeValues: {
				[':methodPathQuery']: {
					S: `${method} ${path}`,
				},
			},
			ExpressionAttributeNames: {
				'#timestamp': 'timestamp',
			},
			ProjectionExpression: 'methodPathQuery,body,#timestamp,headers',
			Limit: 1000,
		}),
	)
	const { Items } = res
	if (Items === undefined) throw new Error('No requests found!')
	for (const request of Items) {
		try {
			if (expectedBody !== undefined) {
				if (isBinaryBody) {
					expect(
						Buffer.from(request.body?.S ?? '', 'base64').toString('utf-8'),
					).to.equal(expectedBody)
				} else {
					const actual = JSON.parse(request.body?.S ?? '{}')
					expect(actual).to.deep.equal(expectedBody)
				}
			}
			if (expectedHeaders !== undefined) {
				const actual = JSON.parse(request.headers?.S ?? '{}')
				expect(actual).to.containSubset(expectedHeaders)
			}
			await db.send(
				new DeleteItemCommand({
					TableName,
					Key: {
						methodPathQuery: request.methodPathQuery,
						timestamp: request.timestamp,
					},
				}),
			)
			return
		} catch {
			// Ignore this, there could be multiple requests that do not match
		}
	}
	throw new Error('No requests matched.')
}

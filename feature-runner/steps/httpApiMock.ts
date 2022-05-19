import {
	DeleteItemCommand,
	DynamoDBClient,
	PutItemCommand,
	QueryCommand,
} from '@aws-sdk/client-dynamodb'
import {
	InterpolatedStep,
	regexGroupMatcher,
	StepRunnerFunc,
} from '@nordicsemiconductor/e2e-bdd-test-runner'
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
			if (headers['Content-Type'].startsWith('application/octet-stream')) {
				isBinaryBody = true
				expectedBody = body
			} else {
				expectedBody = JSON.parse(body)
			}
			expectedHeaders = headers
		}

		const res = await db.send(
			new QueryCommand({
				TableName: runner.world['httpApiMock:requestsTableName'],
				KeyConditionExpression: 'methodPathQuery = :methodPathQuery',
				ExpressionAttributeValues: {
					[':methodPathQuery']: {
						S: `${method} ${path}`,
					},
				},
				ProjectionExpression: 'methodPathQuery,requestId,body,headers',
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
						TableName: runner.world['httpApiMock:requestsTableName'],
						Key: {
							methodPathQuery: request.methodPathQuery,
							requestId: request.requestId,
						},
					}),
				)
				return
			} catch {
				// Ignore this, there could be multiple requests that do not match
			}
		}
		throw new Error('No requests matched.')
	}),
]

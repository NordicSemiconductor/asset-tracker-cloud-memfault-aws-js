import { App, CfnOutput, Stack } from 'aws-cdk-lib'
import type { PackedLambda } from '../packLambda.js'
import type { PackedLayer } from '../packLayer.js'
import { TEST_RESOURCES_STACK_NAME } from '../stacks/stackName.js'
import { HttpApiMock } from './HttpApiMock.js'
import { Iot } from './Iot.js'

/**
 * This is CloudFormation stack sets up a dummy HTTP API which stores all requests in SQS for inspection
 */
export class TestResourcesStack extends Stack {
	public constructor(
		parent: App,
		{
			lambdaSources,
			layer,
		}: {
			lambdaSources: {
				httpApiMock: PackedLambda
			}
			layer: PackedLayer
		},
	) {
		super(parent, TEST_RESOURCES_STACK_NAME)

		const httpMockApi = new HttpApiMock(this, {
			lambdaSources,
			layer,
		})
		const iot = new Iot(this)

		// Export these so the test runner can use them
		new CfnOutput(this, 'apiURL', {
			value: httpMockApi.api.url,
			exportName: `${this.stackName}:apiURL`,
		})
		new CfnOutput(this, 'responsesTableName', {
			value: httpMockApi.responsesTable.tableName,
			exportName: `${this.stackName}:responsesTableName`,
		})
		new CfnOutput(this, 'requestsTableName', {
			value: httpMockApi.requestsTable.tableName,
			exportName: `${this.stackName}:requestsTableName`,
		})
		new CfnOutput(this, 'thingPolicyArn', {
			value: iot.policy.attrArn,
			exportName: `${this.stackName}:thingPolicyArn`,
		})
		new CfnOutput(this, 'thingPolicyName', {
			value: iot.policy.ref,
			exportName: `${this.stackName}:thingPolicyName`,
		})
	}
}

export type StackOutputs = {
	apiURL: string
	requestsTableName: string
	responsesTableName: string
	thingPolicyArn: string
	thingPolicyName: string
}

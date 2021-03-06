import { App } from 'aws-cdk-lib'
import type { PackedLambda } from '../packLambda.js'
import type { PackedLayer } from '../packLayer.js'
import { TestResourcesStack } from './TestResourcesStack.js'

export class TestResources extends App {
	public constructor({
		lambdaSources,
		context,
		layer,
	}: {
		lambdaSources: {
			httpApiMock: PackedLambda
			policyCleanup: PackedLambda
		}
		layer: PackedLayer
		context?: Record<string, any>
	}) {
		super({ context })
		new TestResourcesStack(this, { lambdaSources, layer })
	}
}

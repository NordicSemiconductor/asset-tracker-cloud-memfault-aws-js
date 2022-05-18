import { App } from 'aws-cdk-lib'
import type { PackedLambda } from '../packLambda.js'
import type { PackedLayer } from '../packLayer.js'
import { HttpApiMockStack } from './HttpApiMockStack.js'

export class HttpApiMockApp extends App {
	public constructor({
		lambdaSources,
		context,
		layer,
	}: {
		lambdaSources: {
			httpApiMock: PackedLambda
		}
		layer: PackedLayer
		context?: Record<string, any>
	}) {
		super({ context })
		new HttpApiMockStack(this, { lambdaSources, layer })
	}
}

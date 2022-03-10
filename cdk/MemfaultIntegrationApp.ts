import { App } from 'aws-cdk-lib'
import type { PackedLambda } from './packLambda.js'
import { MemfaultIntegrationStack } from './stacks/MemfaultIntegrationStack.js'

export class MemfaultIntegrationApp extends App {
	public constructor({
		lambdaSources,
	}: {
		lambdaSources: {
			queueChunks: PackedLambda
			publishChunks: PackedLambda
			publishDeviceInfoHandler: PackedLambda
		}
	}) {
		super()
		new MemfaultIntegrationStack(this, { lambdaSources })
	}
}

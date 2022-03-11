import { App } from 'aws-cdk-lib'
import type { PackedLambda } from './packLambda.js'
import { MemfaultIntegrationStack } from './stacks/MemfaultIntegrationStack.js'

export class MemfaultIntegrationApp extends App {
	public constructor({
		lambdaSources,
		context,
	}: {
		lambdaSources: {
			publishChunks: PackedLambda
			publishDeviceInfoHandler: PackedLambda
		}
		context?: Record<string, any>
	}) {
		super({ context })
		new MemfaultIntegrationStack(this, { lambdaSources })
	}
}

import { App } from 'aws-cdk-lib'
import type { PackedLambda } from './packLambda.js'
import type { PackedLayer } from './packLayer.js'
import { MemfaultIntegrationStack } from './stacks/MemfaultIntegrationStack.js'

export class MemfaultIntegrationApp extends App {
	public constructor({
		lambdaSources,
		context,
		layer,
	}: {
		lambdaSources: {
			publishChunks: PackedLambda
			publishDeviceInfoHandler: PackedLambda
		}
		layer: PackedLayer
		context?: Record<string, any>
	}) {
		super({ context })
		new MemfaultIntegrationStack(this, { lambdaSources, layer })
	}
}

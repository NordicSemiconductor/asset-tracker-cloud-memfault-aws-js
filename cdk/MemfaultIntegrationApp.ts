import { App } from 'aws-cdk-lib'
import { MemfaultIntegrationStack } from './stacks/MemfaultIntegrationStack.js'

export class MemfaultIntegrationApp extends App {
	public constructor() {
		super()
		new MemfaultIntegrationStack(this)
	}
}

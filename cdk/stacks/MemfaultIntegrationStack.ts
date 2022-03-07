import { App, Duration, Stack } from 'aws-cdk-lib'
import * as SQS from 'aws-cdk-lib/aws-sqs'
import { STACK_NAME } from './stackName.js'

const MAX_RESOLUTION_TIME_IN_MINUTES = 10

export class MemfaultIntegrationStack extends Stack {
	public constructor(parent: App) {
		super(parent, STACK_NAME)

		const queue = new SQS.Queue(this, 'queue', {
			retentionPeriod: Duration.minutes(MAX_RESOLUTION_TIME_IN_MINUTES),
			visibilityTimeout: Duration.minutes(1),
		})
	}
}

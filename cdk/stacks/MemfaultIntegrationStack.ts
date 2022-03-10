import { App, Duration, Stack } from 'aws-cdk-lib'
import * as IAM from 'aws-cdk-lib/aws-iam'
import * as IoT from 'aws-cdk-lib/aws-iot'
import * as Lambda from 'aws-cdk-lib/aws-lambda'
import * as SQS from 'aws-cdk-lib/aws-sqs'
import type { PackedLambda } from '../packLambda.js'
import { LambdaLogGroup } from '../resources/LambdaLogGroup.js'
import { STACK_NAME } from './stackName.js'

const MAX_RETENTION_TIME_IN_MINUTES = 10

export class MemfaultIntegrationStack extends Stack {
	public constructor(
		parent: App,
		{
			lambdaSources,
		}: {
			lambdaSources: {
				queueChunks: PackedLambda
				publishChunks: PackedLambda
				publishDeviceInfoHandler: PackedLambda
			}
		},
	) {
		super(parent, STACK_NAME)

		// Handle chunks

		const topicRuleRole = new IAM.Role(this, 'memfaultIoTRuleRole', {
			assumedBy: new IAM.ServicePrincipal('iot.amazonaws.com'),
			inlinePolicies: {
				rootPermissions: new IAM.PolicyDocument({
					statements: [
						new IAM.PolicyStatement({
							actions: ['iot:Publish'],
							resources: [
								`arn:aws:iot:${parent.region}:${parent.account}:topic/errors`,
							],
						}),
					],
				}),
			},
		})

		const queue = new SQS.Queue(this, 'queue', {
			retentionPeriod: Duration.minutes(MAX_RETENTION_TIME_IN_MINUTES),
			visibilityTimeout: Duration.minutes(1),
			fifo: true,
		})

		const queueChunks = new Lambda.Function(this, 'queueChunks', {
			handler: 'index.handler',
			architecture: Lambda.Architecture.ARM_64,
			runtime: Lambda.Runtime.NODEJS_14_X,
			timeout: Duration.minutes(1),
			memorySize: 1792,
			code: Lambda.Code.fromAsset(lambdaSources.queueChunks.lambdaZipFile),
			description:
				'Puts chunks in the queue so they can be published once the sequence is complete.',
			environment: {
				VERSION: this.node.tryGetContext('version'),
				STACK_NAME: this.stackName,
				QUEUE_URL: queue.queueUrl,
			},
		})

		queue.grantSendMessages(queueChunks)

		new LambdaLogGroup(this, 'queueChunksLogs', queueChunks)

		const memfaultRule = new IoT.CfnTopicRule(this, 'memfaultIoTRule', {
			topicRulePayload: {
				description: `Invokes the lambda function which publishes the memfault chunks`,
				ruleDisabled: false,
				awsIotSqlVersion: '2016-03-23',
				sql: `SELECT encode(*, 'base64') as messageBase64Encoded, clientid() as deviceId, timestamp() as timestampUnixMs, newuuid() as messageId FROM 'memfault'`,
				actions: [
					{
						lambda: {
							functionArn: queueChunks.functionArn,
						},
					},
				],
				errorAction: {
					republish: {
						roleArn: topicRuleRole.roleArn,
						topic: 'errors',
					},
				},
			},
		})

		queueChunks.addPermission('invokeByMemfaultRule', {
			principal: new IAM.ServicePrincipal('iot.amazonaws.com'),
			sourceArn: memfaultRule.attrArn,
		})

		// Publish queued updates

		const publishChunks = new Lambda.Function(this, 'publishChunks', {
			handler: 'index.handler',
			architecture: Lambda.Architecture.ARM_64,
			runtime: Lambda.Runtime.NODEJS_14_X,
			timeout: Duration.minutes(1),
			memorySize: 1792,
			code: Lambda.Code.fromAsset(lambdaSources.publishChunks.lambdaZipFile),
			description:
				'Handles memfault chunk messages, either by publishing them directly to the chunks API or keeping them in the queue until the message sequence is complete.',
			environment: {
				VERSION: this.node.tryGetContext('version'),
				STACK_NAME: this.stackName,
				MAX_RETENTION_TIME_IN_MINUTES: `${MAX_RETENTION_TIME_IN_MINUTES}`,
			},
		})

		new LambdaLogGroup(this, 'publishChunksLogs', publishChunks)

		new Lambda.EventSourceMapping(this, 'invokeLambdaQueue', {
			eventSourceArn: queue.queueArn,
			target: publishChunks,
			batchSize: 10,
		})

		publishChunks.addPermission('invokeBySQS', {
			principal: new IAM.ServicePrincipal('sqs.amazonaws.com'),
			sourceArn: queue.queueArn,
		})

		queue.grantConsumeMessages(publishChunks)

		// Handle device updates

		const publishDeviceInfoHandler = new Lambda.Function(
			this,
			'publishDeviceInfoHandler',
			{
				handler: 'index.handler',
				architecture: Lambda.Architecture.ARM_64,
				runtime: Lambda.Runtime.NODEJS_14_X,
				timeout: Duration.minutes(1),
				memorySize: 1792,
				code: Lambda.Code.fromAsset(
					lambdaSources.publishDeviceInfoHandler.lambdaZipFile,
				),
				description: `Receives updates to the reported device information to provide it to Memfault's device information`,
				environment: {
					VERSION: this.node.tryGetContext('version'),
					STACK_NAME: this.stackName,
				},
			},
		)

		const updatepublishDeviceInfoRule = new IoT.CfnTopicRule(
			this,
			'updatepublishDeviceInfo',
			{
				topicRulePayload: {
					awsIotSqlVersion: '2016-03-23',
					description: `Listens to updates to the reported device information to provide it to Memfault's device information`,
					ruleDisabled: false,
					sql: `SELECT state.reported.dev AS dev, clientid() as deviceId FROM '$aws/things/+/shadow/update/accepted'`,
					actions: [
						{
							lambda: {
								functionArn: publishDeviceInfoHandler.functionArn,
							},
						},
					],
					errorAction: {
						republish: {
							roleArn: topicRuleRole.roleArn,
							topic: 'errors',
						},
					},
				},
			},
		)

		queueChunks.addPermission('invokeByUpdatepublishDeviceInfoRule', {
			principal: new IAM.ServicePrincipal('iot.amazonaws.com'),
			sourceArn: updatepublishDeviceInfoRule.attrArn,
		})
	}
}

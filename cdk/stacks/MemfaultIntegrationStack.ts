import { App, Duration, Stack } from 'aws-cdk-lib'
import * as IAM from 'aws-cdk-lib/aws-iam'
import * as IoT from 'aws-cdk-lib/aws-iot'
import * as Lambda from 'aws-cdk-lib/aws-lambda'
import type { PackedLayer } from 'cdk/packLayer.js'
import type { PackedLambda } from '../packLambda.js'
import { LambdaLogGroup } from '../resources/LambdaLogGroup.js'
import { STACK_NAME } from './stackName.js'

export class MemfaultIntegrationStack extends Stack {
	public constructor(
		parent: App,
		{
			lambdaSources,
			layer,
		}: {
			lambdaSources: {
				publishChunks: PackedLambda
				publishDeviceInfoHandler: PackedLambda
			}
			layer: PackedLayer
		},
	) {
		super(parent, STACK_NAME)

		const baseLayer = new Lambda.LayerVersion(this, 'baseLayer', {
			code: Lambda.Code.fromAsset(layer.layerZipFile),
			compatibleArchitectures: [Lambda.Architecture.ARM_64],
			compatibleRuntimes: [Lambda.Runtime.NODEJS_14_X],
		})

		const readSSMParametersPermission = new IAM.PolicyStatement({
			actions: ['ssm:GetParametersByPath'],
			resources: [
				`arn:aws:ssm:${this.region}:${this.account}:parameter/${this.stackName}/thirdParty/memfault`,
			],
		})

		// Publish chunks

		const publishChunks = new Lambda.Function(this, 'publishChunks', {
			handler: 'index.handler',
			architecture: Lambda.Architecture.ARM_64,
			runtime: Lambda.Runtime.NODEJS_14_X,
			timeout: Duration.minutes(1),
			memorySize: 1792,
			code: Lambda.Code.fromAsset(lambdaSources.publishChunks.lambdaZipFile),
			description: 'Publishes memfault chunk messages to the chunks API.',
			environment: {
				VERSION: this.node.tryGetContext('version'),
				STACK_NAME: this.stackName,
			},
			initialPolicy: [readSSMParametersPermission],
			layers: [baseLayer],
		})

		new LambdaLogGroup(this, 'publishChunksLogs', publishChunks)

		const topicRuleRole = new IAM.Role(this, 'memfaultChunksRuleRole', {
			assumedBy: new IAM.ServicePrincipal('iot.amazonaws.com'),
			inlinePolicies: {
				rootPermissions: new IAM.PolicyDocument({
					statements: [
						new IAM.PolicyStatement({
							actions: ['iot:Publish'],
							resources: [
								`arn:aws:iot:${this.region}:${this.account}:topic/errors`,
							],
						}),
					],
				}),
			},
		})

		const memfaultChunksRule = new IoT.CfnTopicRule(
			this,
			'memfaultChunksRule',
			{
				topicRulePayload: {
					description: `Invokes the lambda function which publishes the memfault chunks`,
					ruleDisabled: false,
					awsIotSqlVersion: '2016-03-23',
					sql: `SELECT encode(*, 'base64') as chunkBase64Encoded, clientid() as deviceId FROM 'memfault'`,
					actions: [
						{
							lambda: {
								functionArn: publishChunks.functionArn,
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

		publishChunks.addPermission('invokeByMemfaultRule', {
			principal: new IAM.ServicePrincipal('iot.amazonaws.com'),
			sourceArn: memfaultChunksRule.attrArn,
		})

		// Handle device updates

		const publishDeviceInfo = new Lambda.Function(this, 'publishDeviceInfo', {
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
			initialPolicy: [readSSMParametersPermission],
			layers: [baseLayer],
		})

		new LambdaLogGroup(this, 'publishDeviceInfoLogs', publishDeviceInfo)

		// - listen for dev.v.brdV changes

		const updateDeviceHardwareVersion = new IoT.CfnTopicRule(
			this,
			'updateDeviceHardwareVersionRule',
			{
				topicRulePayload: {
					awsIotSqlVersion: '2016-03-23',
					description: `Listens to updates to the reported device board version to provide it to Memfault's device as hardware_version`,
					ruleDisabled: false,
					sql: [
						'SELECT',
						`current.state.reported.dev.v.brdV AS hardware_version,`,
						`topic(3) as deviceId`,
						`FROM '$aws/things/+/shadow/update/documents'`,
						`WHERE`,
						`isUndefined(previous.state.reported.dev.v.brdV) = true`,
						'OR',
						`previous.state.reported.dev.v.brdV <> current.state.reported.dev.v.brdV`,
					].join(' '),
					actions: [
						{
							lambda: {
								functionArn: publishDeviceInfo.functionArn,
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

		publishDeviceInfo.addPermission('invokeByUpdatepublishDeviceInfoRule', {
			principal: new IAM.ServicePrincipal('iot.amazonaws.com'),
			sourceArn: updateDeviceHardwareVersion.attrArn,
		})

		// - listen for name attribute changes

		if (this.node.tryGetContext('thingEvents') === '1') {
			const updateDeviceNickname = new IoT.CfnTopicRule(
				this,
				'updateDeviceNicknameRule',
				{
					topicRulePayload: {
						awsIotSqlVersion: '2016-03-23',
						description: `Listens to updates to the device name to provide it to Memfault's device as nickname`,
						ruleDisabled: false,
						sql: [
							'SELECT',
							`attributes.name as nickname,`,
							`thingName as deviceId`,
							`FROM '$aws/events/thing/+/updated'`,
							`WHERE`,
							`isUndefined(attributes.name) = false`,
						].join(' '),
						actions: [
							{
								lambda: {
									functionArn: publishDeviceInfo.functionArn,
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

			publishDeviceInfo.addPermission('invokeByUpdateDeviceNicknameRule', {
				principal: new IAM.ServicePrincipal('iot.amazonaws.com'),
				sourceArn: updateDeviceNickname.attrArn,
			})
		}
	}
}

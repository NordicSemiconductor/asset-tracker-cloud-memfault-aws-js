import { aws_iot as IoT, Resource } from 'aws-cdk-lib'
import type { PackedLambda } from 'cdk/packLambda.js'
import type { PackedLayer } from 'cdk/packLayer.js'
import type { Construct } from 'constructs'
import { PolicyCleanup } from './PolicyCleanup.js'

export class Iot extends Resource {
	public readonly policy: IoT.CfnPolicy
	public constructor(
		parent: Construct,
		{
			lambdaSources,
			layer,
		}: {
			lambdaSources: {
				policyCleanup: PackedLambda
			}
			layer: PackedLayer
		},
	) {
		super(parent, 'test-thing')

		this.policy = new IoT.CfnPolicy(this, 'policy', {
			policyDocument: {
				Version: '2012-10-17',
				Statement: [
					{
						Effect: 'Allow',
						Action: ['iot:Connect'],
						Resource: ['arn:aws:iot:*:*:client/${iot:ClientId}'],
						Condition: {
							Bool: {
								'iot:Connection.Thing.IsAttached': [true],
							},
						},
					},
					{
						Effect: 'Allow',
						Action: ['iot:Receive'],
						Resource: ['*'],
					},
					{
						Effect: 'Allow',
						Action: ['iot:Subscribe'],
						Resource: [
							'arn:aws:iot:*:*:topicfilter/$aws/things/${iot:ClientId}/*',
							'arn:aws:iot:*:*:topicfilter/${iot:ClientId}/*',
						],
					},
					{
						Effect: 'Allow',
						Action: ['iot:Publish'],
						Resource: [
							'arn:aws:iot:*:*:topic/$aws/things/${iot:ClientId}/*',
							'arn:aws:iot:*:*:topic/${iot:ClientId}/*',
						],
					},
				],
			},
		})

		new PolicyCleanup(this, {
			policy: this.policy,
			lambdaSources,
			layer,
		})
	}
}

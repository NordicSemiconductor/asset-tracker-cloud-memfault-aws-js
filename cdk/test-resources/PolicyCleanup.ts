import {
	CustomResource,
	Duration,
	aws_lambda as Lambda,
	Resource,
} from 'aws-cdk-lib'
import { PolicyStatement } from 'aws-cdk-lib/aws-iam'
import type { CfnPolicy } from 'aws-cdk-lib/aws-iot'
import type { Construct } from 'constructs'
import type { PackedLambda } from '../packLambda.js'
import type { PackedLayer } from '../packLayer.js'
import { LambdaLogGroup } from '../resources/LambdaLogGroup.js'

export class PolicyCleanup extends Resource {
	public resource: CustomResource

	public constructor(
		parent: Construct,
		{
			lambdaSources,
			layer,
			policy,
		}: {
			lambdaSources: {
				policyCleanup: PackedLambda
			}
			layer: PackedLayer
			policy: CfnPolicy
		},
	) {
		super(parent, 'policy-cleanup')

		const baseLayer = new Lambda.LayerVersion(this, 'baseLayer', {
			code: Lambda.Code.fromAsset(layer.layerZipFile),
			compatibleArchitectures: [Lambda.Architecture.ARM_64],
			compatibleRuntimes: [Lambda.Runtime.NODEJS_16_X],
		})

		const lambda = new Lambda.Function(this, 'Lambda', {
			description: 'Cleans up IoT Things attached to the policy',
			code: Lambda.Code.fromAsset(lambdaSources.policyCleanup.lambdaZipFile),
			layers: [baseLayer],
			handler: lambdaSources.policyCleanup.handler,
			architecture: Lambda.Architecture.ARM_64,
			runtime: Lambda.Runtime.NODEJS_16_X,
			timeout: Duration.seconds(5),
			initialPolicy: [
				new PolicyStatement({
					actions: ['iot:*'],
					resources: [`*`],
				}),
			],
		})

		// Create the log group here, so we can control the retention
		new LambdaLogGroup(this, 'LambdaLogGroup', lambda)

		this.resource = new CustomResource(this, 'policyCleanUp', {
			serviceToken: lambda.functionArn,
			properties: {
				policyArn: policy.attrArn,
			},
		})
	}
}

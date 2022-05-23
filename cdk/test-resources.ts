import path from 'path'
import { packLambda } from './packLambda.js'
import { packLayer } from './packLayer.js'
import { TestResources } from './test-resources/TestResourcesApp.js'

const baseDir = path.join(process.cwd(), 'cdk', 'test-resources')
const pack = async (id: string) =>
	packLambda({
		id,
		baseDir,
	})

new TestResources({
	lambdaSources: {
		httpApiMock: await pack('http-api-mock-lambda'),
		policyCleanup: await pack('policy-cleanup'),
	},
	layer: await packLayer({
		id: 'testResources',
		dependencies: [
			'@aws-sdk/client-dynamodb',
			'@aws-sdk/client-iot',
			'@nordicsemiconductor/cloudformation-helpers',
		],
	}),
})

import path from 'path'
import { packLambda } from './packLambda.js'
import { packLayer } from './packLayer.js'
import { HttpApiMockApp } from './test-resources/HttpApiMockApp.js'

const baseDir = path.join(process.cwd(), 'cdk', 'test-resources')
const packagesInLayer = ['@aws-sdk/client-dynamodb']
const pack = async (id: string) =>
	packLambda({
		id,
		baseDir,
	})

new HttpApiMockApp({
	lambdaSources: {
		httpApiMock: await pack('http-api-mock-lambda'),
	},
	layer: await packLayer({
		id: 'httpApiMockLayer',
		dependencies: packagesInLayer,
	}),
})

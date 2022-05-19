import { CloudFormationClient } from '@aws-sdk/client-cloudformation'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { IoTClient } from '@aws-sdk/client-iot'
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts'
import { stackOutput } from '@nordicsemiconductor/cloudformation-helpers'
import {
	ConsoleReporter,
	FeatureRunner,
	RestClient,
	restStepRunners,
	storageStepRunners,
} from '@nordicsemiconductor/e2e-bdd-test-runner'
import chalk from 'chalk'
import { program } from 'commander'
import { readFile } from 'fs/promises'
import path from 'path'
import { TEST_RESOURCES_STACK_NAME } from '../cdk/stacks/stackName.js'
import type { StackOutputs as TestStackOutputs } from '../cdk/test-resources/TestResourcesStack.js'
import { getIotEndpoint } from './getIotEndpoint.js'
import { httpApiMockStepRunners } from './steps/httpApiMock.js'
import { iotStepRunners } from './steps/iot.js'

let ran = false

export type MemfaultIntegrationWorld = TestStackOutputs & {
	accountId: string
	region: string
	mqttEndpoint: string
	'httpApiMock:requestsTableName': string
	'httpApiMock:responsesTableName': string
	'httpApiMock:apiURL': string
}

program
	.arguments('<featureDir>')
	.option('-r, --print-results', 'Print results')
	.option('-p, --progress', 'Print progress')
	.option('-X, --no-retry', 'Do not retry steps')
	.action(
		async (
			featureDir: string,
			options: {
				printResults: boolean
				stack: string
				firmwareCiStack: string
				progress: boolean
				retry: boolean
			},
		) => {
			ran = true
			const { printResults, progress, retry } = options
			const cf = new CloudFormationClient({})
			const iot = new IoTClient({})
			const mqttEndpoint = await getIotEndpoint(iot)

			const httpApiMockStackConfig = await stackOutput(cf)<TestStackOutputs>(
				TEST_RESOURCES_STACK_NAME,
			)

			const { Account: accountId } = await new STSClient({}).send(
				new GetCallerIdentityCommand({}),
			)

			const awsIotRootCA = await readFile(
				path.join(process.cwd(), 'feature-runner', 'data', 'AmazonRootCA1.pem'),
				'utf-8',
			)

			const world: MemfaultIntegrationWorld = {
				accountId: accountId as string,
				mqttEndpoint,
				'httpApiMock:requestsTableName':
					httpApiMockStackConfig.requestsTableName,
				'httpApiMock:responsesTableName':
					httpApiMockStackConfig.responsesTableName,
				'httpApiMock:apiURL': httpApiMockStackConfig.apiURL,
				region: mqttEndpoint.split('.')[2],
				...httpApiMockStackConfig,
			}

			console.log(chalk.yellow.bold(' World:'))
			console.log()
			console.log(world)
			console.log()

			const runner = new FeatureRunner<MemfaultIntegrationWorld>(world, {
				dir: featureDir,
				reporters: [
					new ConsoleReporter({
						printResults,
						printProgress: progress,
						printSummary: true,
					}),
				],
				retry,
			})

			const deviceSteps = iotStepRunners({
				iot,
				awsIotRootCA,
			})

			try {
				const { success } = await runner
					.addStepRunners(storageStepRunners())
					.addStepRunners(deviceSteps.steps)
					.addStepRunners(
						restStepRunners({
							client: new RestClient({
								errorLog: (requestId: string, ...rest: any) => {
									console.error(
										' ',
										chalk.red.bold(' 🚨 '),
										chalk.red('RestClient'),
										chalk.grey(requestId),
									)
									rest.map((r: any) =>
										console.error(
											chalk.gray(
												JSON.stringify(r, null, 2)
													.split('\n')
													.map((s) => `       ${s}`)
													.join('\n'),
											),
										),
									)
								},
								debugLog: (requestId: string, ...rest: any) => {
									console.debug(
										' ',
										chalk.magenta(' ℹ '),
										chalk.cyan('RestClient'),
										chalk.grey(requestId),
									)
									rest.map((r: any) =>
										console.debug(
											chalk.grey(
												JSON.stringify(r, null, 2)
													.split('\n')
													.map((s) => `       ${s}`)
													.join('\n'),
											),
										),
									)
								},
							}),
						}),
					)
					.addStepRunners(
						httpApiMockStepRunners({
							db: new DynamoDBClient({}),
						}),
					)
					.run()

				// Cleanup
				console.error(chalk.yellow('Cleaning up ...'))
				await Promise.all([deviceSteps.cleanup()])

				if (!success) {
					process.exit(1)
					return
				}
				process.exit()
			} catch (error) {
				console.error(chalk.red('Running the features failed!'))
				console.error(error)
				process.exit(1)
			}
		},
	)
	.parse(process.argv)

if (!ran) {
	program.outputHelp()
	process.exit(1)
}

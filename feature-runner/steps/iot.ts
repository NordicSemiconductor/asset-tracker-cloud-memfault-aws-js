import {
	AttachPolicyCommand,
	AttachThingPrincipalCommand,
	CreateKeysAndCertificateCommand,
	CreateThingCommand,
	IoTClient,
	UpdateThingCommand,
} from '@aws-sdk/client-iot'
import type {
	InterpolatedStep,
	StepRunnerFunc,
} from '@nordicsemiconductor/e2e-bdd-test-runner'
import {
	regexGroupMatcher,
	regexMatcher,
} from '@nordicsemiconductor/e2e-bdd-test-runner'
import * as chai from 'chai'
import chaiSubset from 'chai-subset'
import { randomUUID } from 'node:crypto'
import type { MemfaultIntegrationWorld } from '../run-features.js'
import { awsIotDeviceConnection } from './awsIotDeviceConnection.js'
chai.use(chaiSubset)

const things: {
	thingName: string
	certificateArn: string
	certificateId: string
	thingPolicyName: string
}[] = []

export const iotStepRunners = ({
	iot,
	awsIotRootCA,
}: {
	iot: IoTClient
	awsIotRootCA: string
}): ((
	step: InterpolatedStep,
) => StepRunnerFunc<MemfaultIntegrationWorld> | false)[] => [
	regexMatcher<MemfaultIntegrationWorld>(/^I connect a device$/)(
		async (_, __, runner) => {
			let thingName = runner.store['deviceId']
			if (thingName === undefined) {
				const { thingPolicyName } = runner.world
				thingName = randomUUID()

				await iot.send(
					new CreateThingCommand({
						thingName,
					}),
				)

				const cert = await iot.send(
					new CreateKeysAndCertificateCommand({
						setAsActive: true,
					}),
				)

				runner.store['deviceId'] = thingName
				runner.store['privateKey'] = cert.keyPair?.PrivateKey
				runner.store['clientCertificate'] = cert.certificatePem
				runner.store['certificateId'] = cert.certificateId

				await iot.send(
					new AttachPolicyCommand({
						policyName: thingPolicyName,
						target: cert.certificateArn,
					}),
				)

				await iot.send(
					new AttachThingPrincipalCommand({
						principal: cert.certificateArn,
						thingName,
					}),
				)

				things.push({
					thingName,
					certificateArn: cert.certificateArn as string,
					certificateId: cert.certificateId as string,
					thingPolicyName,
				})
			}

			const { mqttEndpoint } = runner.world
			await awsIotDeviceConnection({
				mqttEndpoint,
				awsIotRootCA,
				clientId: thingName,
				privateKey: runner.store['privateKey'],
				clientCert: runner.store['clientCertificate'],
			})

			return [thingName]
		},
	),
	regexMatcher<MemfaultIntegrationWorld>(
		/^I update the Thing reported shadow to$/,
	)(async (_, step, runner) => {
		if (step.interpolatedArgument === undefined) {
			throw new Error('Must provide argument!')
		}
		const reported = JSON.parse(step.interpolatedArgument)
		const deviceId = runner.store['deviceId']
		const privateKey = runner.store['privateKey']
		const clientCert = runner.store['clientCertificate']

		const connection = await awsIotDeviceConnection({
			mqttEndpoint: runner.world['mqttEndpoint'],
			awsIotRootCA,
			clientId: deviceId,
			privateKey,
			clientCert,
		})
		const shadowBase = `$aws/things/${deviceId}/shadow`
		const updateStatus = `${shadowBase}/update`
		const updateStatusAccepted = `${updateStatus}/accepted`
		const updateStatusRejected = `${updateStatus}/rejected`

		const updatePromise = await new Promise((resolve, reject) => {
			const timeout = setTimeout(reject, 10 * 1000)
			Promise.all([
				connection.onMessageOnce(updateStatusAccepted, (message) => {
					void runner.progress('IoT < status', message.toString())
					clearTimeout(timeout)
					resolve(JSON.parse(message.toString()))
				}),
				connection.onMessageOnce(updateStatusRejected, (message) => {
					void runner.progress('IoT < status', message.toString())
					clearTimeout(timeout)
					reject(new Error(`Update rejected!`))
				}),
			])
				.then(async () => {
					void runner.progress('IoT > reported', deviceId)
					void runner.progress('IoT > reported', JSON.stringify(reported))
					return connection.publish(
						updateStatus,
						JSON.stringify({ state: { reported } }),
					)
				})
				.catch((err) => {
					clearTimeout(timeout)
					reject(err)
				})
		})
		return await updatePromise
	}),
	regexGroupMatcher<MemfaultIntegrationWorld>(
		/^I update the Thing attribute "(?<name>[^"]+)" to "(?<value>[^"]+)"$/,
	)(async ({ name, value }, _, runner) => {
		await iot.send(
			new UpdateThingCommand({
				thingName: runner.store['deviceId'],
				attributePayload: { attributes: { [name]: value } },
			}),
		)
	}),
	regexGroupMatcher<MemfaultIntegrationWorld>(
		/the device publishes this message to the topic (?<topic>[^ ]+)$/,
	)(async ({ topic }, step, runner) => {
		if (step.interpolatedArgument === undefined) {
			throw new Error('Must provide argument!')
		}
		const message = step.interpolatedArgument
		const { mqttEndpoint } = runner.world
		const conn = await awsIotDeviceConnection({
			mqttEndpoint,
			awsIotRootCA,
			clientId: runner.store['deviceId'],
			privateKey: runner.store['privateKey'],
			clientCert: runner.store['clientCertificate'],
		})
		await conn.publish(topic, message)
	}),
]

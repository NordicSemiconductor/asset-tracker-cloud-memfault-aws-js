import {
	DescribeEventConfigurationsCommand,
	IoTClient,
} from '@aws-sdk/client-iot'
import chalk from 'chalk'
import path from 'path'
import { MemfaultIntegrationApp } from './MemfaultIntegrationApp.js'
import { packLambda } from './packLambda.js'
import { packLayer } from './packLayer.js'

const packagesInLayer = ['@aws-sdk/client-ssm']
const pack = async (id: string) =>
	packLambda({
		id,
		entry: path.join(process.cwd(), 'lambda', `${id}.ts`),
		external: [...packagesInLayer, 'https', 'http'],
	})

const iot = new IoTClient({})

const { eventConfigurations } = await iot.send(
	new DescribeEventConfigurationsCommand({}),
)

let thingEvents = '0'
if (!(eventConfigurations?.THING.Enabled ?? false)) {
	console.debug('')
	;[
		`THING events are disabled for your IoT hub.`,
		'Enabling this will allow to automatically sync the device name to Memfault.',
		'You can enable it using the console',
		'https://docs.aws.amazon.com/iot/latest/developerguide/iot-events.html',
		'or using the CLI',
		`aws iot update-event-configurations --event-configurations "{\\"THING\\":{\\"Enabled\\": true}}"`,
	].map((s) => console.debug('', chalk.yellow('⚠️'), chalk.yellow(s)))
} else {
	thingEvents = '1'
	console.debug('')
	console.debug(
		'',
		chalk.white('✔️'),
		chalk.green(`THING events enabled for your IoT hub.`),
	)
}

new MemfaultIntegrationApp({
	lambdaSources: {
		publishChunks: await pack('publishChunks'),
		publishDeviceInfoHandler: await pack('publishDeviceInfo'),
	},
	layer: await packLayer({
		id: 'baseLayer',
		dependencies: packagesInLayer,
	}),
	context: {
		thingEvents,
	},
})

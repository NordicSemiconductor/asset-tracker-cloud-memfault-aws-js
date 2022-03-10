import path from 'path'
import { MemfaultIntegrationApp } from './MemfaultIntegrationApp.js'
import { packLambda } from './packLambda.js'

const pack = async (id: string) =>
	packLambda({
		id,
		entry: path.join(process.cwd(), 'lambda', `${id}.ts`),
	})

new MemfaultIntegrationApp({
	lambdaSources: {
		queueChunks: await pack('queueChunks'),
		publishChunks: await pack('publishChunks'),
		publishDeviceInfoHandler: await pack('publishDeviceInfo'),
	},
})

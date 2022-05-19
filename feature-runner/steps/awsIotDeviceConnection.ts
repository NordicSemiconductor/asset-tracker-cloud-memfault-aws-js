import { device } from 'aws-iot-device-sdk'

export type Listener = () => unknown
export type ListenerWithPayload = (payload: Buffer) => unknown
type Connection = {
	onConnect: (listener: Listener) => void
	onMessageOnce: (topic: string, listener: ListenerWithPayload) => Promise<void>
	publish: (topic: string, message: string) => Promise<void>
}

const connections: Record<string, Connection> = {}

export const awsIotDeviceConnection = async ({
	mqttEndpoint,
	awsIotRootCA,
	clientId,
	privateKey,
	clientCert,
}: {
	mqttEndpoint: string
	awsIotRootCA: string
	clientId: string
	privateKey: string
	clientCert: string
}): Promise<Connection> => {
	const onConnectListeners: Listener[] = []
	const onMessageOnceListeners: Record<string, ListenerWithPayload[]> = {}
	if (connections[clientId] === undefined) {
		let connected = false
		let connectedTimeout: NodeJS.Timeout
		const d = new device({
			privateKey: Buffer.from(privateKey),
			clientCert: Buffer.from(clientCert),
			caCert: Buffer.from(awsIotRootCA),
			clientId,
			host: mqttEndpoint,
			region: mqttEndpoint.split('.')[2],
		})
		d.on('connect', () => {
			connected = true
			connectedTimeout = setTimeout(() => {
				if (connected) onConnectListeners.forEach((fn) => fn())
			}, 1000)
		})
		d.on('close', () => {
			connected = false
			clearTimeout(connectedTimeout)
		})
		d.on('message', (topic, payload) => {
			d.unsubscribe(topic)
			onMessageOnceListeners[topic]?.forEach((fn) => fn(payload))
			onMessageOnceListeners[topic] = []
		})
		connections[clientId] = {
			onConnect: (listener) => {
				onConnectListeners.push(listener)
			},
			publish: async (topic, message) =>
				new Promise<void>((resolve, reject) => {
					d.publish(
						topic,
						message,
						{
							qos: 1,
						},
						(error) => {
							if (error === undefined || error === null) return resolve()
							return reject(error)
						},
					)
				}),
			onMessageOnce: async (topic, listener) =>
				new Promise((resolve, reject) => {
					d.subscribe(
						topic,
						{
							qos: 1,
						},
						(error) => {
							if (error === undefined || error === null) return resolve()
							return reject(error)
						},
					)
					onMessageOnceListeners[topic] = [
						...(onMessageOnceListeners[topic] ?? []),
						listener,
					]
				}),
		}
	}
	return connections[clientId]
}

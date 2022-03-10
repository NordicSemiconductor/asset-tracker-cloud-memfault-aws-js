export const handler = async (event: {
	dev: {
		v: {
			imei: string // e.g. '352656100391948'
			iccid: string // e.g. '89450421180216254864'
			modV: string // e.g. 'mfw_nrf9160_1.3.1'
			brdV: string // e.g. 'nrf9160dk_nrf9160'
			appV: string // e.g. '0.0.0-development-nrf9160dk_nrf9160_ns-debugWithMemfault'
		}
		ts: 1646918254845
	}
	deviceId: string
}): Promise<void> => {
	console.log(JSON.stringify({ event }))
}

import {
	CertificateStatus,
	DeleteCertificateCommand,
	DeleteThingCommand,
	DetachPolicyCommand,
	DetachThingPrincipalCommand,
	IoTClient,
	paginateListPolicyPrincipals,
	paginateListPrincipalPolicies,
	paginateListPrincipalThings,
	UpdateCertificateCommand,
} from '@aws-sdk/client-iot'
import {
	cfnResponse,
	ResponseStatus,
} from '@nordicsemiconductor/cloudformation-helpers'
import type { CloudFormationCustomResourceEvent } from 'aws-lambda'

export const handler = async (
	event: CloudFormationCustomResourceEvent,
): Promise<void> => {
	console.debug(JSON.stringify(event))

	const {
		RequestType,
		ResourceProperties: { policyArn },
	} = event

	const policyName = policyArn.split('/').pop()
	const PhysicalResourceId = `${policyName}-cleanup`

	if (RequestType !== 'Delete') {
		// Only need to act on delete
		await cfnResponse({
			Status: ResponseStatus.SUCCESS,
			event,
			PhysicalResourceId,
			Reason: `Nothing to do for ${RequestType}.`,
		})
		return
	}

	try {
		const iot = new IoTClient({})

		// List all certificates using the policy
		const paginator = paginateListPolicyPrincipals(
			{
				client: iot,
			},
			{
				policyName,
			},
		)
		for await (const { principals } of paginator) {
			for (const certificateArn of principals ?? []) {
				const certificateId = certificateArn.split('/').pop()
				console.debug(`Deactivating certificate ${certificateId}`)
				await iot.send(
					new UpdateCertificateCommand({
						certificateId,
						newStatus: CertificateStatus.INACTIVE,
					}),
				)

				// Delete thing
				const thingPaginator = paginateListPrincipalThings(
					{ client: iot },
					{
						principal: certificateArn,
					},
				)
				for await (const { things } of thingPaginator) {
					for (const thingName of things ?? []) {
						// Detach thing from certificate
						console.debug(`Detaching thing ${thingName} from ${certificateId}`)
						await iot.send(
							new DetachThingPrincipalCommand({
								thingName,
								principal: certificateArn,
							}),
						)
						// Delete thing
						console.debug(`Deleting thing ${thingName}`)
						await iot.send(
							new DeleteThingCommand({
								thingName,
							}),
						)
					}
				}

				// Detach certificate policies
				const policyPaginator = paginateListPrincipalPolicies(
					{
						client: iot,
					},
					{
						principal: certificateArn,
					},
				)
				for await (const { policies } of policyPaginator) {
					for (const policy of policies ?? []) {
						console.debug(`Deleting policy ${policy}`)
						await iot.send(
							new DetachPolicyCommand({
								policyName: policy.policyName,
								target: certificateArn,
							}),
						)
					}
				}

				// Delete certificate
				console.debug(`Deleting certificate ${certificateId}`)
				await iot.send(
					new DeleteCertificateCommand({
						certificateId,
					}),
				)
			}
		}

		await cfnResponse({
			Status: ResponseStatus.SUCCESS,
			event,
			PhysicalResourceId,
			Reason: `Done.`,
		})
	} catch (error) {
		console.error(error)
		await cfnResponse({
			Status: ResponseStatus.FAILED,
			event,
			PhysicalResourceId,
			Reason: `Failed: ${(error as Error).message}`,
		})
	}
}

import { GetParametersByPathCommand, SSMClient } from '@aws-sdk/client-ssm'

export const getConfigFromSSM =
	({ ssm, Path }: { ssm: SSMClient; Path: string }) =>
	async <
		ConfigShape extends Record<string, boolean>,
		LoadedConfig extends {
			[K in keyof ConfigShape]: ConfigShape[K] extends true
				? string
				: ConfigShape[K] extends false
				? string | undefined
				: never
		},
	>(
		properties: ConfigShape,
	): Promise<LoadedConfig> => {
		const { Parameters } = await ssm.send(
			new GetParametersByPathCommand({
				Path,
				Recursive: true,
			}),
		)
		if ((Parameters?.length ?? 0) === 0)
			throw new Error(`System not configured: ${Path}!`)

		const props = (Parameters ?? [])
			.map(({ Name, ...rest }) => ({
				...rest,
				Name: Name?.replace(`${Path}/`, ''),
			}))
			.reduce(
				(settings, { Name, Value }) => ({
					...settings,
					[Name ?? '']: Value ?? undefined,
				}),
				{} as LoadedConfig,
			)
		for (const [key, required] of Object.entries(properties)) {
			if (!required) continue
			if (props[key] === undefined)
				throw new Error(`System is not configured: ${Path}/${key}!`)
		}
		return props
	}

import esbuild from 'esbuild'
import { createWriteStream } from 'fs'
import { mkdir } from 'fs/promises'
import path from 'path'
import { ZipFile } from 'yazl'

export type PackedLambda = { lambdaZipFile: string }

export const packLambda = async ({
	id,
	entry,
}: {
	id: string
	entry: string
}): Promise<PackedLambda> => {
	/**
	 * AWS Lambda does not yet support layers when using ESM.
	 * @see https://github.com/NordicSemiconductor/asset-tracker-cloud-aws-js/issues/572
	 */
	const res = await esbuild.build({
		entryPoints: [entry],
		write: false,
		target: 'node14',
		format: 'cjs',
	})

	const zipfile = new ZipFile()
	zipfile.addBuffer(Buffer.from(res.outputFiles[0].contents), 'index.js')

	await mkdir(path.join(process.cwd(), 'dist', 'lambdas'), { recursive: true })

	const zipFileName = await new Promise<string>((resolve) => {
		const zipFileName = path.join(process.cwd(), 'dist', 'lambdas', `${id}.zip`)
		zipfile.outputStream
			.pipe(createWriteStream(zipFileName))
			.on('close', () => {
				resolve(zipFileName)
			})
		zipfile.end()
	})

	return { lambdaZipFile: zipFileName }
}

import dependencyTree from 'dependency-tree'
import path from 'path'

export const listLambdaDependencies = (entryFile: string): string[] =>
	dependencyTree.toList({
		filename: entryFile,
		directory: process.cwd(),
		tsConfig: path.join(process.cwd(), 'tsconfig.json'),
		filter: (path) => !path.includes('node_modules'), // do not include node_modules
		noTypeDefinitions: true,
	})

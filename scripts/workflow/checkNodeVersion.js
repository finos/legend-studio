import { loadJSON } from '@finos/legend-studio-dev-utils/DevUtils';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import semver from 'semver';

const __dirname = dirname(fileURLToPath(import.meta.url));

const packageJson = loadJSON(resolve(__dirname, '../../package.json'));

const nodeVersion = packageJson.engines?.node;
if (nodeVersion && !semver.satisfies(process.version, nodeVersion)) {
  console.log(
    chalk.red(
      `Required Node.js version ${nodeVersion} not satisfied with current version ${process.version}.`,
    ),
  );
  process.exit(1);
}

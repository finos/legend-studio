import { getBaseJestDOMProjectConfig } from '../../scripts/test/jest.config.base.js';
import { loadJSON } from '@finos/legend-dev-utils/DevUtils';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const packageJson = loadJSON(resolve(__dirname, './package.json'));

export default getBaseJestDOMProjectConfig(
  packageJson.name,
  'packages/legend-extension-dsl-data-quality',
);

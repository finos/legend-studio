import base from '../../scripts/test/jest.config.base.js';
import { loadJSON } from '@finos/legend-dev-utils/DevUtils';

const packageJson = loadJSON('./package.json');

export default {
  ...base,
  displayName: packageJson.name,
  name: packageJson.name,
  rootDir: '../..',
  testEnvironment: 'jsdom',
  setupFiles: [
    ...base.setupFiles,
    '@finos/legend-dev-utils/jest/setupDOMPolyfills',
  ],
  moduleNameMapper: {
    ...base.moduleNameMapper,
    '^monaco-editor$': '@finos/legend-art/lib/testMocks/MockedMonacoEditor.js',
  },
  testMatch: [
    '<rootDir>/packages/legend-extension-dsl-persistence/src/**/__tests__/**/*(*.)test.[jt]s?(x)',
  ],
};

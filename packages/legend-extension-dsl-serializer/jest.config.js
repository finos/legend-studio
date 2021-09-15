import base from '../../scripts/jest/jest.config.base.js';
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
    '<rootDir>/scripts/jest/setupTests/setupPolyfills.js',
  ],
  moduleNameMapper: {
    ...base.moduleNameMapper,
    '^monaco-editor$': '@finos/legend-art/lib/testMocks/MockedMonacoEditor.js',
  },
  testMatch: [
    '<rootDir>/packages/legend-extension-dsl-serializer/src/**/__tests__/**/*(*.)test.[jt]s?(x)',
  ],
};

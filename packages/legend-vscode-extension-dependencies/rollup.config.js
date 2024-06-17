import { babel } from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';
import flow from 'rollup-plugin-flow';
import commonjs from '@rollup/plugin-commonjs';
import css from 'rollup-plugin-import-css';

const extensions = ['.js', '.ts', '.jsx', '.tsx'];

export default {
  input: 'src/index.ts',
  external: ['@jest/globals', 'react-dom/server', 'react'],
  output: [
    {
      file: 'lib/bundles/bundle.cjs.js',
      format: 'cjs',
      sourcemap: false,
      inlineDynamicImports: true,
      plugins: [terser()],
    },
  ],
  plugins: [
    flow({ pretty: true }),
    resolve({ extensions }),
    commonjs(),
    babel({
      babelHelpers: 'bundled',
      include: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.json'],
      extensions,
      exclude: [
        /node_modules/,
        'src/**/__tests__/**/*.*',
        'src/**/__mocks__/**/*.*',
      ],
      plugins: [
        [
          '@babel/plugin-syntax-import-attributes',
          { deprecatedAssertSyntax: true },
        ],
      ],
      presets: [
        [
          '@babel/preset-env',
          {
            modules: false,
            loose: true,
          },
        ],
        '@babel/preset-react',
        [
          '@babel/typescript',
          {
            allowDeclareFields: true,
            isTSX: true,
            allExtensions: true,
          },
        ],
      ],
    }),
    json(),
    css(),
  ],
};

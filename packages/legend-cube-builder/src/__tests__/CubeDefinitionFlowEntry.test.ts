/**
 * Copyright (c) 2026-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, expect, test } from '@jest/globals';
import { existsSync, readFileSync } from 'fs';
import { dirname, relative, resolve } from 'path';

// What `@finos/legend-cube-builder/definition-flow` loads. A host loads it,
// lazily, for everyone who opens an access point's definition, so it loads
// none of the editor: no step editor (they bring Monaco), no menu, no drag
// and drop, no editor state. Every module it reaches is listed here, so one
// more is a choice made on purpose.

const SRC = resolve(__dirname, '..');

/** `import … from '…'` and `export … from '…'`, but not `import type` or `export type` */
const FROM =
  /^(?:import|export)\s+(?!type\s)[^;]*?\sfrom\s+['"](?<module>[^'"]+)['"]/gmu;
/** `import '…'`, for its side effects, e.g. a stylesheet */
const SIDE_EFFECT = /^import\s+['"](?<module>[^'"]+)['"]/gmu;

/** The source files the entry reaches, as paths in `src`, and the packages it imports */
const walkEntry = (): { files: string[]; packages: string[] } => {
  const files = new Set<string>();
  const packages = new Set<string>();
  const visit = (file: string): void => {
    if (files.has(file)) {
      return;
    }
    files.add(file);
    const text = readFileSync(file, 'utf-8');
    [...text.matchAll(FROM), ...text.matchAll(SIDE_EFFECT)].forEach((match) => {
      const module = match.groups?.module ?? '';
      if (!module.startsWith('.')) {
        packages.add(module);
        return;
      }
      const base = resolve(dirname(file), module.replace(/\.js$/u, ''));
      const found = ['.ts', '.tsx']
        .map((extension) => `${base}${extension}`)
        .find((path) => existsSync(path));
      if (!found) {
        throw new Error(`${module}, imported by ${file}, isn't a source file`);
      }
      visit(found);
    });
  };
  visit(resolve(SRC, 'definition-flow.ts'));
  return {
    files: [...files].map((file) => relative(SRC, file)).sort(),
    packages: [...packages].sort(),
  };
};

describe('The definition flow entry', () => {
  test("Reaches none of the editor's modules: its reader, its canvas and Cube's protocol readers", () => {
    expect(walkEntry().files).toEqual([
      '__lib__/LegendCubeDefinitionFlowLabels.ts',
      '__lib__/LegendCubeHelpText.ts',
      '__lib__/LegendCubeTesting.ts',
      '__lib__/LegendCubeTypeLabels.ts',
      'components/CubeColumnTypeIcon.tsx',
      'components/CubeNodeIcon.tsx',
      'components/canvas/CubeCanvasEdge.tsx',
      'components/canvas/CubeCanvasElements.ts',
      'components/canvas/CubeCanvasLayout.ts',
      'components/canvas/CubeCanvasNodeParts.tsx',
      'components/canvas/CubeCanvasViewport.tsx',
      'components/canvas/CubeDefinitionFlow.tsx',
      'components/canvas/CubeDefinitionFlowParameters.tsx',
      'definition-flow.ts',
      'graph-manager/CubeDataProduct.ts',
      'graph-manager/CubeDefinitionReader.ts',
      'graph-manager/CubeIngest.ts',
      'graph-manager/CubeIngestCatalog.ts',
      'graph-manager/protocol/pure/CubeProtocolJson.ts',
      'graph-manager/protocol/pure/v1/V1_CubeExpression.ts',
      'graph-manager/protocol/pure/v1/V1_CubeIngestDefinition.ts',
      'graph-manager/protocol/pure/v1/V1_CubeLambdaReader.ts',
      'graph-manager/protocol/pure/v1/V1_CubeLambdaSerializer.ts',
    ]);
  });

  test('Imports no package but the canvas, its layout, and what a Legend host loads already', () => {
    // the flow brings the canvas (`@xyflow/react`, with its stylesheet) and
    // its layout (`@dagrejs/dagre`); a Legend host loads the others already
    expect(walkEntry().packages).toEqual([
      '@dagrejs/dagre',
      '@finos/legend-art',
      '@finos/legend-cube',
      '@finos/legend-graph',
      '@finos/legend-shared',
      '@xyflow/react',
      '@xyflow/react/dist/style.css',
      'react',
    ]);
  });
});

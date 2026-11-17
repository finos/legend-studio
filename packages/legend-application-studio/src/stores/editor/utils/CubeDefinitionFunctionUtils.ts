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

import type {
  CubeDefinitionFunctionElement,
  CubeDefinitionFunctionLoader,
} from '@finos/legend-cube-builder/definition-flow';
import {
  type ConcreteFunctionDefinition,
  LegendSDLC,
} from '@finos/legend-graph';
import { generateGAVCoordinates } from '@finos/legend-storage';
import { when } from 'mobx';
import { GRAPH_EDITOR_MODE } from '../EditorConfig.js';
import type { EditorStore } from '../EditorStore.js';

/**
 * Whether the graph holds every function in full: in form mode, once built.
 * Text mode's graph is a light one, whose functions have no parameters and
 * no body, until the full graph is built as Studio leaves it.
 */
const isGraphFullyBuilt = (editorStore: EditorStore): boolean =>
  editorStore.graphEditorMode.mode === GRAPH_EDITOR_MODE.FORM &&
  !editorStore.graphState.isApplicationLeavingGraphEditMode &&
  !editorStore.graphState.isUpdatingGraph &&
  editorStore.graphManagerState.graphBuildState.hasSucceeded;

/**
 * The user-defined functions a definition's flow opens into containers,
 * from Studio's graph: the project's own, its dependencies' and the
 * generated ones, as they are in the workspace, with no request.
 * A dependency's function says the project it comes from, as Depot's loader
 * in Marketplace does; the project's own goes without saying. The graph is
 * read once it is fully built, never text mode's light graph.
 */
export const createGraphFunctionLoader =
  (editorStore: EditorStore): CubeDefinitionFunctionLoader =>
  async (names) => {
    await when(() => isGraphFullyBuilt(editorStore));
    // the graph of now: each build replaces it
    const { graph, graphManager } = editorStore.graphManagerState;
    const read = (
      functions: ConcreteFunctionDefinition[],
      origin: string | undefined,
    ): CubeDefinitionFunctionElement[] =>
      functions
        // every overload of each name, and maybe a few more
        // (`pkg::name_other`): Cube keeps only the functions of exactly
        // these names
        .filter((func) =>
          names.some((name) => func.path.startsWith(`${name}_`)),
        )
        .map((func) => ({
          path: func.path,
          content: graphManager.elementToEntity(func, {
            pruneSourceInformation: true,
          }).content,
          origin,
        }));
    return [
      ...read(graph.ownFunctions, undefined),
      ...graph.dependencyManager.dependencyGraphs.flatMap((dependency) => {
        const { origin } = dependency;
        return read(
          dependency.ownFunctions,
          origin instanceof LegendSDLC
            ? generateGAVCoordinates(
                origin.groupId,
                origin.artifactId,
                origin.versionId,
              )
            : undefined,
        );
      }),
      ...read(graph.generationModel.ownFunctions, undefined),
    ];
  };

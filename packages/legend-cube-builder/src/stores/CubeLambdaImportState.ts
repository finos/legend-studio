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

import {
  CubeDocument,
  CubeLambdaReadError,
  ExpressionFilter,
  findCubeLambdaSources,
  isSameCubeIR,
  lambda,
  QueryEmitter,
  readCubeQuery,
  splitCubeLambda,
  type IR,
  type Query,
} from '@finos/legend-cube';
import {
  assertErrorThrown,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import { action, flow, makeObservable, observable, when } from 'mobx';
import { CubeEngineError } from '../graph-manager/CubeEngine.js';
import {
  CUBE_EXPRESSION_CODEC,
  readCubeLambdaJson,
} from '../graph-manager/protocol/pure/CubeEngineBuilder.js';
import type { CubeEditorState } from './CubeEditorState.js';
import { bindCubeLambdaSources } from './CubeLambdaSources.js';

// Import Pure (PLAN §11.18): a lambda read into a cube, its sources bound by
// the host, each step checked by writing it again. A host can open the page
// on one (`CubeEditor`'s `initialLambda`), e.g. Studio's Edit MatView. Once
// the cube's expressions are checked, it is written again and compared with
// the lambda, so the page can say when saving would write it another way.

/** A lambda a host opens the page on: its protocol JSON, and what to call it */
export interface CubeInitialLambda {
  readonly lambda: PlainObject;
  /** What the page calls it, e.g. `materialized view TRADES_VIEW` */
  readonly label: string;
}

/** Whether Cube writes the cube it read back as the lambda it read */
export enum CubeLambdaFidelity {
  /** The same Pure, so saving it changes nothing */
  EXACT = 'exact',
  /** Pure that reads the same rows, written Cube's way */
  REWRITTEN = 'rewritten',
  /** Not known: a step isn't valid, or an expression couldn't be checked */
  UNCHECKED = 'unchecked',
}

export const CUBE_LAMBDA_IMPORT_MESSAGE = {
  READING: (label: string): string => `Reading ${label}…`,
  CANT_READ: (label: string): string => `Cube can't read ${label}`,
  NOT_NEW: 'Cube opens a lambda on a new cube only.',
  REWRITTEN: (label: string): string =>
    `Cube writes ${label} another way: saving it writes Cube's Pure, which reads the same rows.`,
  UNCHECKED: (label: string): string =>
    `Cube couldn't check that it writes ${label} back the same way, as a step isn't valid: review it before saving.`,
  GRID_LIMIT:
    "The limit beside from() is read as a Limit step: it may be the grid's row limit of the run the Pure was copied from.",
};

export interface CubeLambdaImportError {
  readonly message: string;
  readonly detail?: string | undefined;
}

const toImportError = (error: unknown): CubeLambdaImportError => {
  if (error instanceof CubeEngineError) {
    return {
      message: error.firstLine,
      detail: error.detail !== error.firstLine ? error.detail : undefined,
    };
  }
  assertErrorThrown(error);
  return { message: error.message };
};

/** A lambda read into a cube: the cube, and what to compare it with once checked */
export interface CubeLambdaReading {
  readonly document: CubeDocument;
  /** The lambda as read, which the cube is compared with */
  readonly lambda: IR;
  /** Whether it was a run's lambda, with `from()`, rather than a matview's relation */
  readonly isRun: boolean;
  readonly notes: readonly string[];
}

/** Each Filter by Expression's code, the engine's grammar of its lambda, as the editor shows it */
const withExpressionCode = async (
  editorState: CubeEditorState,
  query: Query,
): Promise<Query> => {
  let next = query;
  for (const node of query.nodes) {
    if (node instanceof ExpressionFilter && node.lambda && !node.code) {
      const code = await editorState.host.engine.renderPure(
        CUBE_EXPRESSION_CODEC.read(node.lambda),
      );
      next = next.replace(node.withCondition(code.trim(), node.lambda));
    }
  }
  return next;
};

/**
 * A lambda's protocol JSON read into a cube on the editor's host: its sources
 * bound, its steps read, its expressions given their code. Throws a
 * `CubeLambdaReadError`, or the engine's error, naming what can't be read.
 */
export const readCubeLambdaDocument = async (
  editorState: CubeEditorState,
  json: unknown,
): Promise<CubeLambdaReading> => {
  const read = readCubeLambdaJson(json);
  const parts = splitCubeLambda(read);
  const binding = await bindCubeLambdaSources(
    editorState,
    findCubeLambdaSources(parts),
  );
  const { query } = readCubeQuery(parts, {
    bindSource: binding.bindSource,
    expressions: CUBE_EXPRESSION_CODEC,
    registry: editorState.registry,
  });
  return {
    document: new CubeDocument({
      context: {
        ...binding.context,
        ...(parts.runtime !== undefined ? { runtime: parts.runtime } : {}),
      },
      query: await withExpressionCode(editorState, query),
    }),
    lambda: read,
    isRun: parts.runtime !== undefined,
    notes: parts.limitBesideFrom ? [CUBE_LAMBDA_IMPORT_MESSAGE.GRID_LIMIT] : [],
  };
};

/**
 * Whether the cube, written again as the lambda was written (a matview's
 * relation, or a run with no row limit), is the lambda it was read from
 */
export const getCubeLambdaFidelity = (
  editorState: CubeEditorState,
  reading: Pick<CubeLambdaReading, 'lambda' | 'isRun'>,
): CubeLambdaFidelity => {
  const { query, context } = editorState.document;
  const selected = query.selected;
  const emitter = new QueryEmitter(query, editorState.registry);
  if (selected === undefined || !emitter.canEmit(selected)) {
    return CubeLambdaFidelity.UNCHECKED;
  }
  const written =
    reading.isRun && context?.runtime !== undefined
      ? emitter.emitExecutionLambda({ runtime: context.runtime })
      : lambda([], [emitter.emitRelation(selected, { withRowOrder: true })]);
  return isSameCubeIR(written, reading.lambda, {
    readExpression: CUBE_EXPRESSION_CODEC.read,
  })
    ? CubeLambdaFidelity.EXACT
    : CubeLambdaFidelity.REWRITTEN;
};

/**
 * Opens the page on a host's lambda (`CubeEditor`'s `initialLambda`): read
 * into a cube, opened as the first one, with no undo step; a lambda that
 * can't be read leaves the cube empty and says why. Once the cube's
 * expressions are checked, whether Cube writes it back the same way.
 */
export class CubeLambdaImportState {
  readonly editorState: CubeEditorState;
  /** What the page calls the lambda it opened on */
  label: string | undefined;
  isReading = false;
  error: CubeLambdaImportError | undefined;
  /** Whether Cube writes the cube back as the lambda; none until checked */
  fidelity: CubeLambdaFidelity | undefined;
  notes: readonly string[] = [];

  constructor(editorState: CubeEditorState) {
    makeObservable(this, {
      label: observable,
      isReading: observable,
      error: observable.ref,
      fidelity: observable,
      notes: observable.ref,
      open: flow,
      dismiss: action,
    });
    this.editorState = editorState;
  }

  *open(initial: CubeInitialLambda): GeneratorFn<void> {
    const { editorState } = this;
    this.label = initial.label;
    this.isReading = true;
    this.error = undefined;
    this.fidelity = undefined;
    try {
      const reading = (yield readCubeLambdaDocument(
        editorState,
        initial.lambda,
      )) as CubeLambdaReading;
      // the user may have started a cube while it was read
      if (!editorState.isEmptyCube) {
        throw new CubeLambdaReadError(CUBE_LAMBDA_IMPORT_MESSAGE.NOT_NEW);
      }
      editorState.openDocument(reading.document);
      this.notes = reading.notes;
      this.isReading = false;
      // checked as the editor checks any expression: then compared
      yield when(
        () =>
          !editorState.isResolvingSources &&
          !editorState.isCheckingExpressions &&
          !editorState.nodesToCheck.length,
      );
      this.fidelity = getCubeLambdaFidelity(editorState, reading);
    } catch (error) {
      this.error = toImportError(error);
    } finally {
      this.isReading = false;
    }
  }

  /** Closes the banner */
  dismiss(): void {
    this.error = undefined;
    this.fidelity = undefined;
    this.notes = [];
  }
}

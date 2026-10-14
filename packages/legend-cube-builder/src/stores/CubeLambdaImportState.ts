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
  Extend,
  findCubeLambdaExtends,
  findCubeLambdaSources,
  isSameCubeIR,
  lambda,
  QueryEmitter,
  readCubeQuery,
  splitCubeLambda,
  Schema,
  type CubeContext,
  type IR,
  type JsonObject,
  type Query,
} from '@finos/legend-cube';
import {
  assertErrorThrown,
  parseLosslessJSON,
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
  /** What the banner calls a lambda imported from the Import Pure dialog */
  IMPORTED: 'the Pure imported',
  NOT_JSON: (reason: string): string => `Can't read the JSON: ${reason}`,
};

/** The source id the engine's grammar gives what Import Pure parses, so its errors name it */
export const CUBE_IMPORT_PURE_SOURCE_ID = 'cube:import-pure';

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

/** The engine's grammar of an expression's lambda, as the editor shows it */
const codeOf = async (
  editorState: CubeEditorState,
  expression: JsonObject,
): Promise<string> =>
  (
    await editorState.host.engine.renderPure(
      CUBE_EXPRESSION_CODEC.read(expression),
    )
  ).trim();

/** Each Filter by Expression's and Extend column's code, the engine's grammar of its lambda */
const withExpressionCode = async (
  editorState: CubeEditorState,
  query: Query,
): Promise<Query> => {
  let next = query;
  for (const node of query.nodes) {
    if (node instanceof ExpressionFilter && node.lambda && !node.code) {
      next = next.replace(
        node.withCondition(await codeOf(editorState, node.lambda), node.lambda),
      );
    } else if (node instanceof Extend) {
      const columns = [];
      for (const column of node.columns) {
        columns.push(
          column.lambda && !column.code
            ? { ...column, code: await codeOf(editorState, column.lambda) }
            : column,
        );
      }
      next = next.replace(node.withColumns(columns));
    }
  }
  return next;
};

/**
 * The schema of each chain of extends of the lambda, typed by the engine in
 * one call before the steps are read, so the steps after an Extend can be
 * checked; none when the engine can't type them, as then the editor will
 * say why
 */
const typeExtends = async (
  editorState: CubeEditorState,
  context: CubeContext,
  chains: readonly { readonly read: IR; readonly typed: IR }[],
): Promise<Map<IR, Schema>> => {
  const schemas = new Map<IR, Schema>();
  if (!chains.length) {
    return schemas;
  }
  try {
    const typed = await editorState.host.engine.typeLambdas(
      context.model,
      new Map(
        chains.map(({ typed: relation }, index) => [
          `extend${index}`,
          lambda([], [relation]),
        ]),
      ),
    );
    chains.forEach(({ read }, index) => {
      const schema = typed.get(`extend${index}`);
      if (schema instanceof Schema) {
        schemas.set(read, schema);
      }
    });
  } catch {
    // typed again by the editor, which says why it can't
  }
  return schemas;
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
    relationSchemas: await typeExtends(
      editorState,
      binding.context,
      findCubeLambdaExtends(parts),
    ),
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
  /** Import Pure, from the Cube menu: the dialog, its text, why its last import failed */
  isDialogOpen = false;
  text = '';
  isImporting = false;
  dialogError: CubeLambdaImportError | undefined;

  constructor(editorState: CubeEditorState) {
    makeObservable(this, {
      label: observable,
      isReading: observable,
      error: observable.ref,
      fidelity: observable,
      notes: observable.ref,
      isDialogOpen: observable,
      text: observable,
      isImporting: observable,
      dialogError: observable.ref,
      open: flow,
      dismiss: action,
      openDialog: action,
      closeDialog: action,
      setText: action,
      importText: flow,
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

  openDialog(): void {
    this.isDialogOpen = true;
    this.dialogError = undefined;
  }

  closeDialog(): void {
    this.isDialogOpen = false;
    this.isImporting = false;
  }

  setText(text: string): void {
    this.text = text;
    this.dialogError = undefined;
  }

  /**
   * Import Pure (PLAN §11.18): the dialog's text, Pure or the engine's JSON
   * of a lambda, read into a cube that replaces this one, as one undo step;
   * then, once checked, whether Cube writes it back the same. A lambda that
   * can't be read leaves the cube as it was, and says why in the dialog.
   */
  *importText(): GeneratorFn<void> {
    const { editorState } = this;
    const text = this.text.trim();
    if (!text || this.isImporting) {
      return;
    }
    this.isImporting = true;
    this.dialogError = undefined;
    try {
      let json: unknown;
      if (text.startsWith('{')) {
        try {
          json = parseLosslessJSON(text);
        } catch (error) {
          assertErrorThrown(error);
          throw new CubeLambdaReadError(
            CUBE_LAMBDA_IMPORT_MESSAGE.NOT_JSON(error.message),
          );
        }
      } else {
        json = (
          (yield editorState.host.engine.parseExpression(
            text,
            CUBE_IMPORT_PURE_SOURCE_ID,
          )) as Awaited<
            ReturnType<typeof editorState.host.engine.parseExpression>
          >
        ).lambda;
      }
      const reading = (yield readCubeLambdaDocument(
        editorState,
        json,
      )) as CubeLambdaReading;
      if (!this.isDialogOpen) {
        // closed while it was read
        return;
      }
      editorState.importDocument(reading.document, false);
      this.isDialogOpen = false;
      this.text = '';
      this.label = CUBE_LAMBDA_IMPORT_MESSAGE.IMPORTED;
      this.error = undefined;
      this.fidelity = undefined;
      this.notes = reading.notes;
      this.isImporting = false;
      yield when(
        () =>
          !editorState.isResolvingSources &&
          !editorState.isCheckingExpressions &&
          !editorState.nodesToCheck.length,
      );
      this.fidelity = getCubeLambdaFidelity(editorState, reading);
    } catch (error) {
      this.dialogError = toImportError(error);
    } finally {
      this.isImporting = false;
    }
  }

  /** Closes the banner */
  dismiss(): void {
    this.error = undefined;
    this.fidelity = undefined;
    this.notes = [];
  }
}

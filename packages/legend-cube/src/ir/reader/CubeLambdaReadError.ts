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

/**
 * The kind of reason Cube can't read a lambda, for a host to count: e.g. how
 * many access point definitions a viewer couldn't draw, and why, which says
 * what to teach Cube next
 */
export enum CubeLambdaReadErrorKind {
  /**
   * The lambda takes parameters, which Cube's editor doesn't read; read to be
   * drawn, it reads one where Cube can't show it yet: Cube shows a parameter
   * in a filter's condition or a new column's expression only
   */
  PARAMETERS = 'parameters',
  /**
   * It isn't a lambda of one query of rows, after lets that bind steps of it:
   * no lambda, no query, other statements, or a let bound twice, never bound
   * or never read
   */
  SHAPE = 'shape',
  /** A value Cube has no IR for, e.g. a `%latest` date, or text that isn't JSON */
  VALUE = 'value',
  /**
   * A source Cube can't read or bind: an accessor it doesn't know, a data
   * product's parameters, an ingest data set's metadata, sources of several
   * kinds, or one the host doesn't have
   */
  SOURCE = 'source',
  /** A function Cube has no step for, e.g. `olapGroupBy` */
  NO_STEP = 'noStep',
  /** A function of a step Cube can't read into one yet */
  NOT_YET = 'notYet',
  /**
   * A step's function in a form Cube doesn't write, e.g. a `select` that
   * reorders its columns, or a join on a condition other than equal keys
   */
  FORM = 'form',
  /**
   * A group's aggregation named like a column of its input, e.g. `QUANTITY:
   * x|$x.QUANTITY: y|$y->sum()`, which Pure allows and Cube's Group doesn't
   * (a definition read to be drawn is read)
   */
  SAME_NAME_SUM = 'sameNameSum',
}

/** Why Cube can't read a lambda, as plain data: what a `CubeLambdaReadError` says */
export interface CubeLambdaRefusal {
  readonly kind: CubeLambdaReadErrorKind;
  /** The first problem found, in words the person reading the lambda can act on */
  readonly message: string;
  /** The function the problem is in, for a step's function: `olapGroupBy`, `select`… */
  readonly functionName?: string | undefined;
}

/**
 * Why Cube can't read a lambda into a cube (Import Pure, PLAN §11.18): a
 * construct it has no IR or no step for, or a source the host can't bind.
 * Nothing is imported in part, so the message names the first problem found,
 * in words the person importing can act on, and its kind says what sort of
 * problem it is.
 */
export class CubeLambdaReadError extends Error {
  readonly kind: CubeLambdaReadErrorKind;
  /** The function the problem is in, for a step's function */
  readonly functionName: string | undefined;

  constructor(
    kind: CubeLambdaReadErrorKind,
    message: string,
    functionName?: string,
  ) {
    super(message);
    this.name = 'CubeLambdaReadError';
    this.kind = kind;
    this.functionName = functionName;
  }
}

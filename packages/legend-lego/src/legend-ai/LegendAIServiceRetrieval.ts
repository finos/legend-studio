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

import { guaranteeNonNullable } from '@finos/legend-shared';
import type { TDSServiceSchema } from './LegendAITypes.js';
import {
  splitIdentifierTokens,
  tokenizeText,
} from './LegendAIDocEnrichment.js';

const BM25_K1 = 1.2;
const BM25_B = 0.75;
const FIELD_WEIGHT_TITLE = 3;
const FIELD_WEIGHT_DESCRIPTION = 2;
const MIN_FUZZY_TOKEN_LENGTH = 4;

interface BM25Doc {
  termFreq: Map<string, number>;
  length: number;
}

interface BM25Index {
  docs: BM25Doc[];
  docFreq: Map<string, number>;
  avgLength: number;
}

function tokensFromIdentifier(name: string): string[] {
  return [...tokenizeText(name), ...splitIdentifierTokens(name)];
}

function addTokensToDoc(doc: BM25Doc, tokens: string[], weight: number): void {
  for (const token of tokens) {
    doc.termFreq.set(token, (doc.termFreq.get(token) ?? 0) + weight);
    doc.length += weight;
  }
}

function buildServiceDoc(svc: TDSServiceSchema): BM25Doc {
  const doc: BM25Doc = { termFreq: new Map(), length: 0 };

  addTokensToDoc(doc, tokensFromIdentifier(svc.title), FIELD_WEIGHT_TITLE);
  if (svc.description) {
    addTokensToDoc(
      doc,
      tokenizeText(svc.description),
      FIELD_WEIGHT_DESCRIPTION,
    );
  }
  for (const col of svc.columns) {
    addTokensToDoc(doc, tokensFromIdentifier(col.name), 1);
    if (col.documentation) {
      addTokensToDoc(doc, tokenizeText(col.documentation), 1);
    }
  }
  for (const param of svc.parameters) {
    addTokensToDoc(doc, tokensFromIdentifier(param), 1);
  }
  for (const pf of svc.preFilters ?? []) {
    addTokensToDoc(doc, tokenizeText(pf.property), 1);
    if (pf.value !== undefined) {
      addTokensToDoc(doc, tokenizeText(String(pf.value)), 1);
    }
  }
  return doc;
}

function buildBM25Index(services: readonly TDSServiceSchema[]): BM25Index {
  const docs = services.map(buildServiceDoc);
  const docFreq = new Map<string, number>();
  let totalLength = 0;
  for (const doc of docs) {
    totalLength += doc.length;
    for (const term of doc.termFreq.keys()) {
      docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
    }
  }
  return {
    docs,
    docFreq,
    avgLength: docs.length === 0 ? 0 : totalLength / docs.length,
  };
}

/**
 * Standard Okapi BM25:
 *   IDF(q) = ln((N - df + 0.5) / (df + 0.5) + 1)
 *   tfNorm = tf * (k1 + 1) / (tf + k1 * (1 - b + b * |D| / avgdl))
 *   score  = Σ IDF(q) * tfNorm
 */
function scoreBM25(
  queryTerms: string[],
  doc: BM25Doc,
  index: BM25Index,
): number {
  const n = index.docs.length;
  const avgdl = index.avgLength === 0 ? 1 : index.avgLength;
  let score = 0;
  for (const term of queryTerms) {
    const tf = doc.termFreq.get(term);
    if (!tf) {
      continue;
    }
    const df = index.docFreq.get(term) ?? 0;
    const idf = Math.log((n - df + 0.5) / (df + 0.5) + 1);
    const tfNorm =
      (tf * (BM25_K1 + 1)) /
      (tf + BM25_K1 * (1 - BM25_B + (BM25_B * doc.length) / avgdl));
    score += idf * tfNorm;
  }
  return score;
}

/** Rewrites a typoed query term to its closest indexed vocabulary entry. */
function resolveQueryTermViaFuzzy(token: string, index: BM25Index): string {
  if (token.length < MIN_FUZZY_TOKEN_LENGTH || index.docFreq.has(token)) {
    return token;
  }
  for (const term of index.docFreq.keys()) {
    if (term.length >= MIN_FUZZY_TOKEN_LENGTH && isFuzzyMatch(token, term)) {
      return term;
    }
  }
  return token;
}

/**
 * Lexical pre-filter that ranks services against the user question using
 * Okapi BM25. IDF down-weights corpus-wide common terms and length
 * normalization demotes denormalized aggregate tables — no stopword list
 * or specificity penalty needed. Query typos are recovered via
 * {@link resolveQueryTermViaFuzzy} before scoring.
 */
export function preFilterServicesByRelevance(
  question: string,
  services: TDSServiceSchema[],
  limit: number,
): TDSServiceSchema[] {
  const rawTerms = tokenizeText(question);
  if (rawTerms.length === 0) {
    return services.slice(0, limit);
  }
  const index = buildBM25Index(services);
  const queryTerms = rawTerms.map((t) => resolveQueryTermViaFuzzy(t, index));
  const scored = services.map((svc, i) => ({
    svc,
    score: scoreBM25(
      queryTerms,
      guaranteeNonNullable(index.docs[i], `BM25 doc missing for service ${i}`),
      index,
    ),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.svc);
}

/**
 * Returns `true` when two tokens are within Levenshtein edit distance 1 (for
 * short tokens) or 2 (for longer tokens). Used to recover typoed query terms
 * during retrieval and coverage checks.
 */
export function isFuzzyMatch(a: string, b: string): boolean {
  const lenDiff = Math.abs(a.length - b.length);
  if (lenDiff > 2) {
    return false;
  }
  const maxDist = Math.min(a.length, b.length) <= 4 ? 1 : 2;
  return levenshteinDistance(a, b) <= maxDist;
}

/**
 * Computes the Levenshtein edit distance between two strings.
 * Uses a single-row DP approach for space efficiency.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  if (a.length === 0) {
    return b.length;
  }
  if (b.length === 0) {
    return a.length;
  }
  if (a.length > b.length) {
    const tmp = a;
    a = b;
    b = tmp;
  }

  const aLen = a.length;
  const bLen = b.length;
  const row = new Array<number>(aLen + 1);

  for (let i = 0; i <= aLen; i++) {
    row[i] = i;
  }

  for (let j = 1; j <= bLen; j++) {
    let prev = guaranteeNonNullable(row[0]);
    row[0] = j;
    for (let i = 1; i <= aLen; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const current = guaranteeNonNullable(row[i]);
      row[i] = Math.min(
        current + 1, // deletion
        guaranteeNonNullable(row[i - 1]) + 1, // insertion
        prev + cost, // substitution
      );
      prev = current;
    }
  }

  return guaranteeNonNullable(row[aLen]);
}

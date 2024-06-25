/**
 * Copyright (c) 2020-present, Goldman Sachs
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
  CharStreams,
  CommonTokenStream,
  ParseTreeVisitor,
  ErrorListener,
} from 'antlr4';
import datacube_filterLexer from './generated/datacube_filter__lexer.js';
import datacube_filterParser from './generated/datacube_filter__parser.js';

class DataCubeFilterErrorListener extends ErrorListener<unknown> {
  syntaxError(
    recognizer: any,
    offendingSymbol: any,
    line: number,
    column: number,
    msg: string,
    e: any,
  ) {
    // TODO: we should make this set the parser error state when we use this in typeahead
    console.error(`${offendingSymbol} line ${line}, col ${column}: ${msg}`, e);
  }
}

export function parseDataCubeQueryFilter(code: string) {
  const charStream = CharStreams.fromString(code);
  const lexer = new datacube_filterLexer(charStream);
  const tokenStream = new CommonTokenStream(lexer);
  const parser = new datacube_filterParser(tokenStream);
  // parser.buildParseTrees = true;
  parser.removeErrorListeners();
  parser.addErrorListener(new DataCubeFilterErrorListener());
  const ruleContext = parser.filter();
  console.log(ruleContext);
  // TODO: the last token can be used for auto-complete/typeahead

  // ruleContext.children?.forEach((child) => {
  //   console.log('suggestion', child, child.getText());
  // });
}

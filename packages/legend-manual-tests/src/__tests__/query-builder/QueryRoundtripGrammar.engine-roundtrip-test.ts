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
  Core_GraphManagerPreset,
  RawLambda,
  type GraphManagerState,
  type V1_RawLambda,
} from '@finos/legend-graph';
import { expect, beforeAll, describe, test } from '@jest/globals';
import { parse, resolve } from 'path';
import fs from 'fs';
import {
  ENGINE_TEST_SUPPORT__getClassifierPathMapping,
  ENGINE_TEST_SUPPORT__getSubtypeInfo,
  ENGINE_TEST_SUPPORT__grammarToJSON_model,
  ENGINE_TEST_SUPPORT__grammarToJSON_valueSpecification,
  ENGINE_TEST_SUPPORT__JSONToGrammar_valueSpecification,
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '@finos/legend-graph/test';
import {
  guaranteeNonNullable,
  LOG_LEVEL,
  LogService,
  WebConsole,
} from '@finos/legend-shared';
import { DSL_Text_GraphManagerPreset } from '@finos/legend-extension-dsl-text/graph';
import { DSL_Diagram_GraphManagerPreset } from '@finos/legend-extension-dsl-diagram';
import { DSL_DataSpace_GraphManagerPreset } from '@finos/legend-extension-dsl-data-space/graph';
import { DSL_Persistence_GraphManagerPreset } from '@finos/legend-extension-dsl-persistence/graph';
import { STO_ServiceStore_GraphManagerPreset } from '@finos/legend-extension-store-service-store/graph';
import {
  QueryBuilder_GraphManagerPreset,
  QUERY_BUILDER_LAMBDA_WRITER_MODE,
  QueryBuilderAdvancedWorkflowState,
  TEST__LegendApplicationPluginManager,
  INTERNAL__BasicQueryBuilderState,
  TEST__getGenericApplicationConfig,
} from '@finos/legend-query-builder';
import {
  ApplicationStore,
  type LegendApplicationConfig,
} from '@finos/legend-application';

const TEST_CASE_DIR = resolve(__dirname, 'model');

type QueryTestCase = {
  testName: string;
  model: string;
  queryGrammar: string;
  isUnsupported?: boolean;
  convertedRelation?: string;
};

const TEST_CASES: QueryTestCase[] = [
  // Legacy
  {
    testName: '[LEGACY] Simple Projection',
    model: 'Relational_Business',
    queryGrammar:
      "var_1: String[0..1]|model::pure::tests::model::simple::Person.all()->project([x|$x.firstName, x|$x.lastName], ['Edited First Name', 'Last Name'])",
    convertedRelation: `var_1: String[0..1]|model::pure::tests::model::simple::Person.all()->project(~['Edited First Name':x|$x.firstName, 'Last Name':x|$x.lastName])`,
  },
  {
    testName: '[LEGACY] Result Modifier: Sort',
    model: 'Northwind',
    queryGrammar: `|showcase::northwind::model::crm::Customer.all()->project([x|$x.companyName, x|$x.companyTitle], ['Company Name', 'Company Title'])->sort([asc('Company Name'), desc('Company Title')])`,
    convertedRelation: `|showcase::northwind::model::crm::Customer.all()->project(~['Company Name':x|$x.companyName, 'Company Title':x|$x.companyTitle])->sort([~'Company Name'->ascending(), ~'Company Title'->descending()])`,
  },
  {
    testName: '[LEGACY] Result Modifier: Distinct',
    model: 'Northwind',
    queryGrammar: `|showcase::northwind::model::crm::Customer.all()->project([x|$x.companyName], ['name'])->distinct()`,
    convertedRelation: `|showcase::northwind::model::crm::Customer.all()->project(~[name:x|$x.companyName])->distinct()`,
  },
  {
    testName: '[LEGACY] Result Modifier: Take',
    model: 'Northwind',
    queryGrammar: `|showcase::northwind::model::crm::Customer.all()->project([x|$x.companyName], ['Company Name'])->take(27)`,
    convertedRelation: `|showcase::northwind::model::crm::Customer.all()->project(~['Company Name':x|$x.companyName])->limit(27)`,
  },
  {
    testName: '[LEGACY] Result Modifier: Slice',
    model: 'Northwind',
    queryGrammar: `|showcase::northwind::model::crm::Customer.all()->project([x|$x.companyName], ['Company Name'])->slice(1, 7)`,
    convertedRelation: `|showcase::northwind::model::crm::Customer.all()->project(~['Company Name':x|$x.companyName])->slice(1, 7)`,
  },
  {
    testName: '[LEGACY] Result Modifier: For Watermark',
    model: 'Northwind',
    queryGrammar: `|showcase::northwind::model::crm::Customer.all()->forWatermark('testing')->project([x|$x.companyName], ['Company Name'])`,
    convertedRelation: `|showcase::northwind::model::crm::Customer.all()->forWatermark('testing')->project(~['Company Name':x|$x.companyName])`,
  },
  // Relation
  {
    testName: '[RELATION] Simple Relation Projection',
    model: 'Northwind',
    queryGrammar:
      "|showcase::northwind::model::crm::Customer.all()->project(~['Company Name':x|$x.companyName, 'Company Title':x|$x.companyTitle, 'Contact Name':x|$x.contactName, 'Fax Number':x|$x.faxNumber, Id:x|$x.id, 'Telephone Number':x|$x.telephoneNumber])",
  },
  {
    testName: '[RELATION] Simple Relation Projection With Pre Filter',
    model: 'Northwind',
    queryGrammar:
      "|showcase::northwind::model::crm::Customer.all()->filter(x|$x.companyTitle == 'company title')->project(~['Company Name':x|$x.companyName, 'Company Title':x|$x.companyTitle])",
  },
  {
    testName: '[RELATION] Simple Relation Projection With Pre AND Post Filter',
    model: 'Northwind',
    queryGrammar:
      "|showcase::northwind::model::crm::Customer.all()->filter(x|$x.companyTitle == 'company title')->project(~['Company Name':x|$x.companyName, 'Company Title':x|$x.companyTitle])->filter(row|$row.'Company Name' == 'company name')",
  },
  // result modifier
  {
    testName: '[LEGACY] Result Modifier: Sort',
    model: 'Northwind',
    queryGrammar: `|showcase::northwind::model::crm::Customer.all()->project([x|$x.companyName, x|$x.companyTitle], ['Company Name', 'Company Title'])->sort([asc('Company Name'), desc('Company Title')])`,
  },
  {
    testName: '[LEGACY] Result Modifier: Distinct',
    model: 'Northwind',
    queryGrammar: `|showcase::northwind::model::crm::Customer.all()->project(~[name:x|$x.companyName])->distinct()`,
  },
  {
    testName: '[LEGACY] Result Modifier: Take',
    model: 'Northwind',
    queryGrammar: `|showcase::northwind::model::crm::Customer.all()->project(~['Company Name':x|$x.companyName])->limit(27)`,
  },
  {
    testName: '[LEGACY] Result Modifier: Slice',
    model: 'Northwind',
    queryGrammar: `|showcase::northwind::model::crm::Customer.all()->project(~['Company Name':x|$x.companyName])->slice(1, 7)`,
  },
  // conversion
  {
    testName: '[CONVERSION] Convert Query With Pre/Post Filter to Relation',
    model: 'Northwind',
    queryGrammar:
      "|showcase::northwind::model::crm::Customer.all()->filter(x|$x.companyTitle == 'company title')->project([x|$x.companyName, x|$x.companyTitle], ['Company Name', 'Company Title'])->filter(row|$row.getString('Company Name') == 'company name')",
    convertedRelation:
      "|showcase::northwind::model::crm::Customer.all()->filter(x|$x.companyTitle == 'company title')->project(~['Company Name':x|$x.companyName, 'Company Title':x|$x.companyTitle])->filter(row|$row.'Company Name' == 'company name')",
  },
  // aggregation
  {
    testName: '[LEGACY AGGREGATION] Simple wavg query',
    model: 'Northwind',
    queryGrammar:
      "|showcase::northwind::model::OrderLineItem.all()->groupBy([], [agg(x|$x.quantity->meta::pure::functions::math::wavgUtility::wavgRowMapper($x.unitPrice), y|$y->wavg())], ['Quantity (wavg)'])",
  },
  {
    testName: '[LEGACY AGGREGATION] Simple group by count query',
    model: 'Northwind',
    queryGrammar:
      "|showcase::northwind::model::Order.all()->groupBy([x|$x.shipToName], [agg(x|$x.id,x|$x->count())], ['Ship To Name','Id (count)'])",
    convertedRelation:
      "|showcase::northwind::model::Order.all()->project(~['Ship To Name':x|$x.shipToName, 'Id (count)':x|$x.id])->groupBy(~['Ship To Name'], ~['Id (count)':x|$x.'Id (count)':x|$x->count()])",
  },
  {
    testName: '[AGGREGATION] Group by count query with nested property',
    model: 'Northwind',
    queryGrammar:
      "|showcase::northwind::model::Order.all()->project(~['Ship To Name':x|$x.shipToName, 'Customer/Id (count)':x|$x.customer.id])->groupBy(~['Ship To Name'], ~['Customer/Id (count)':x|$x.'Customer/Id (count)':x|$x->count()])",
  },
  {
    testName:
      '[AGGREGATION] Group by count query with pre-filter and post-filter',
    model: 'Northwind',
    queryGrammar:
      "|showcase::northwind::model::Order.all()->filter(x|$x.shipToName == 'test')->project(~['Ship To Name':x|$x.shipToName, 'Id (count)':x|$x.id])->groupBy(~['Ship To Name'], ~['Id (count)':x|$x.'Id (count)':x|$x->count()])->filter(row|$row.'Id (count)' >= 5)",
  },
  {
    testName:
      '[AGGREGATION] Group by count query with post-filter before groupBy',
    model: 'Northwind',
    queryGrammar:
      "|showcase::northwind::model::Order.all()->project(~['Ship To Name':x|$x.shipToName, 'Id (count)':x|$x.id])->filter(row|$row.'Id (count)' >= 5)->groupBy(~['Ship To Name'], ~['Id (count)':x|$x.'Id (count)':x|$x->count()])",
    isUnsupported: true,
  },
];

const globalGraphManagerStates = new Map<string, GraphManagerState>();
let applicationStore: ApplicationStore<
  LegendApplicationConfig,
  TEST__LegendApplicationPluginManager
>;
beforeAll(async () => {
  const pluginManager = TEST__LegendApplicationPluginManager.create();
  const logger = new WebConsole();
  logger.setLevel(LOG_LEVEL.ERROR);
  applicationStore = new ApplicationStore(
    TEST__getGenericApplicationConfig(),
    pluginManager,
  );

  // NOTE: This is temporary, when we split the test here and move them to their respective
  // extensions, this will be updated accordingly
  // See https://github.com/finos/legend-studio/issues/820
  pluginManager
    .usePresets([
      new Core_GraphManagerPreset(),
      new DSL_Text_GraphManagerPreset(),
      new DSL_Diagram_GraphManagerPreset(),
      new DSL_DataSpace_GraphManagerPreset(),
      new DSL_Persistence_GraphManagerPreset(),
      new STO_ServiceStore_GraphManagerPreset(),
      new QueryBuilder_GraphManagerPreset(),
    ])
    .usePlugins([logger]);
  pluginManager.install();
  const log = new LogService();
  log.registerPlugins(pluginManager.getLoggerPlugins());
  await Promise.all(
    fs
      .readdirSync(TEST_CASE_DIR)
      .map((model) => resolve(TEST_CASE_DIR, model))
      .filter((filePath) => fs.statSync(filePath).isFile())
      .map(async (modelPath) => {
        const graphManagerState = TEST__getTestGraphManagerState(
          pluginManager,
          log,
        );
        await graphManagerState.graphManager.initialize({
          env: 'test',
          tabSize: 2,
          clientConfig: {},
          TEMPORARY__classifierPathMapping:
            await ENGINE_TEST_SUPPORT__getClassifierPathMapping(),
          TEMPORARY__subtypeInfo: await ENGINE_TEST_SUPPORT__getSubtypeInfo(),
        });
        const grammarText = fs.readFileSync(modelPath, { encoding: 'utf-8' });
        const transformGrammarToJsonResult =
          await ENGINE_TEST_SUPPORT__grammarToJSON_model(grammarText, false);
        const entities =
          graphManagerState.graphManager.pureProtocolTextToEntities(
            JSON.stringify(transformGrammarToJsonResult),
          );
        await TEST__buildGraphWithEntities(graphManagerState, entities, {
          TEMPORARY__preserveSectionIndex: true,
        });
        globalGraphManagerStates.set(parse(modelPath).name, graphManagerState);
      }),
  );
});

const queryGrammarRoundtrip = async (
  model: string,
  queryGrammar: string,
  isUnsupported?: boolean,
  convertedRelation?: string,
): Promise<void> => {
  const graphManagerState = guaranteeNonNullable(
    globalGraphManagerStates.get(model),
    `${model} model not found`,
  );
  const queryBuilderState = new INTERNAL__BasicQueryBuilderState(
    applicationStore,
    graphManagerState,
    QueryBuilderAdvancedWorkflowState.INSTANCE,
    undefined,
  );
  const inputLambda =
    (await ENGINE_TEST_SUPPORT__grammarToJSON_valueSpecification(
      queryGrammar,
    )) as unknown as V1_RawLambda;
  const rawLambda = new RawLambda(inputLambda.parameters, inputLambda.body);
  queryBuilderState.initializeWithQuery(rawLambda, undefined, undefined);
  expect(queryBuilderState.isQuerySupported).toBe(!isUnsupported);
  if (convertedRelation) {
    queryBuilderState.setLambdaWriteMode(
      QUERY_BUILDER_LAMBDA_WRITER_MODE.TYPED_FETCH_STRUCTURE,
    );
  }
  const processedLambda =
    graphManagerState.graphManager.serializeRawValueSpecification(
      queryBuilderState.buildQuery(),
    );
  const returnedQuery =
    await ENGINE_TEST_SUPPORT__JSONToGrammar_valueSpecification(
      processedLambda,
    );
  expect(processedLambda).toBe(processedLambda);
  expect(returnedQuery).toBe(convertedRelation ?? queryGrammar);
};

describe('Query Builder Grammar roundtrip test', () => {
  test.each(TEST_CASES)(
    '$testName',
    async ({
      testName,
      model,
      queryGrammar,
      isUnsupported,
      convertedRelation,
    }) => {
      await queryGrammarRoundtrip(
        model,
        queryGrammar,
        isUnsupported,
        convertedRelation,
      );
    },
  );
});

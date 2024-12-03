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

// References to resolve in Database
// - Includes
// - Filter
export const TEST_DATA__DatabaseRoundtrip = [
  {
    path: 'model::relational::tests::db',
    content: {
      _type: 'relational',
      filters: [
        {
          _type: 'filter',
          name: 'PositiveInteractionTimeFilter',
          operation: {
            _type: 'dynaFunc',
            funcName: 'greaterThan',
            parameters: [
              {
                _type: 'column',
                column: 'time',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'interactionTable',
                },
                tableAlias: 'interactionTable',
              },
              {
                _type: 'literal',
                value: 0,
              },
            ],
          },
        },
        {
          _type: 'filter',
          name: 'ProductSynonymFilter',
          operation: {
            _type: 'dynaFunc',
            funcName: 'notEqual',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'productSchema',
                  table: 'synonymTable',
                },
                tableAlias: 'synonymTable',
              },
              {
                _type: 'literal',
                value: 1,
              },
            ],
          },
        },
        {
          _type: 'filter',
          name: 'NonNegativePnlFilter',
          operation: {
            _type: 'dynaFunc',
            funcName: 'greaterThan',
            parameters: [
              {
                _type: 'column',
                column: 'pnl',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'orderPnlTable',
                },
                tableAlias: 'orderPnlTable',
              },
              {
                _type: 'literal',
                value: 0,
              },
            ],
          },
        },
        {
          _type: 'filter',
          name: 'LessThanEqualZeroPnlFilter',
          operation: {
            _type: 'dynaFunc',
            funcName: 'lessThanEqual',
            parameters: [
              {
                _type: 'column',
                column: 'pnl',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'orderPnlTable',
                },
                tableAlias: 'orderPnlTable',
              },
              {
                _type: 'literal',
                value: 0,
              },
            ],
          },
        },
      ],
      includedStores: [
        {
          path: 'model::relational::tests::dbInc',
          type: 'STORE',
        },
      ],
      joins: [
        {
          name: 'Product_Synonym',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'PRODID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'productSchema',
                  table: 'synonymTable',
                },
                tableAlias: 'synonymTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'productSchema',
                  table: 'productTable',
                },
                tableAlias: 'productTable',
              },
            ],
          },
        },
        {
          name: 'Trade_Product',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'prodId',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'tradeTable',
                },
                tableAlias: 'tradeTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'productSchema',
                  table: 'productTable',
                },
                tableAlias: 'productTable',
              },
            ],
          },
        },
        {
          name: 'Trade_Account',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'accountID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'tradeTable',
                },
                tableAlias: 'tradeTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'accountTable',
                },
                tableAlias: 'accountTable',
              },
            ],
          },
        },
        {
          name: 'Interaction_Source',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'sourceId',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'interactionTable',
                },
                tableAlias: 'interactionTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            ],
          },
        },
        {
          name: 'Interaction_Target',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'targetId',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'interactionTable',
                },
                tableAlias: 'interactionTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            ],
          },
        },
        {
          name: 'InteractionTable_InteractionViewMaxTime',
          operation: {
            _type: 'dynaFunc',
            funcName: 'and',
            parameters: [
              {
                _type: 'dynaFunc',
                funcName: 'equal',
                parameters: [
                  {
                    _type: 'column',
                    column: 'sourceId',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::db',
                      mainTableDb: 'model::relational::tests::db',
                      schema: 'default',
                      table: 'interactionTable',
                    },
                    tableAlias: 'interactionTable',
                  },
                  {
                    _type: 'column',
                    column: 'sourceId',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::db',
                      mainTableDb: 'model::relational::tests::db',
                      schema: 'default',
                      table: 'interactionViewMaxTime',
                    },
                    tableAlias: 'interactionViewMaxTime',
                  },
                ],
              },
              {
                _type: 'dynaFunc',
                funcName: 'equal',
                parameters: [
                  {
                    _type: 'column',
                    column: 'targetId',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::db',
                      mainTableDb: 'model::relational::tests::db',
                      schema: 'default',
                      table: 'interactionTable',
                    },
                    tableAlias: 'interactionTable',
                  },
                  {
                    _type: 'column',
                    column: 'targetId',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::db',
                      mainTableDb: 'model::relational::tests::db',
                      schema: 'default',
                      table: 'interactionViewMaxTime',
                    },
                    tableAlias: 'interactionViewMaxTime',
                  },
                ],
              },
            ],
          },
        },
        {
          name: 'Trade_TradeEvent',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'tradeTable',
                },
                tableAlias: 'tradeTable',
              },
              {
                _type: 'column',
                column: 'trade_id',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'tradeEventTable',
                },
                tableAlias: 'tradeEventTable',
              },
            ],
          },
        },
        {
          name: 'Trade_TradeEventViewMaxTradeEventDate',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'tradeTable',
                },
                tableAlias: 'tradeTable',
              },
              {
                _type: 'column',
                column: 'trade_id',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'tradeEventViewMaxTradeEventDate',
                },
                tableAlias: 'tradeEventViewMaxTradeEventDate',
              },
            ],
          },
        },
        {
          name: 'TradeEvent_Person',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'person_id',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'tradeEventTable',
                },
                tableAlias: 'tradeEventTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            ],
          },
        },
        {
          name: 'Interaction_Interaction',
          operation: {
            _type: 'dynaFunc',
            funcName: 'and',
            parameters: [
              {
                _type: 'dynaFunc',
                funcName: 'equal',
                parameters: [
                  {
                    _type: 'column',
                    column: 'sourceId',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::db',
                      mainTableDb: 'model::relational::tests::db',
                      schema: 'default',
                      table: 'interactionTable',
                    },
                    tableAlias: 'interactionTable',
                  },
                  {
                    _type: 'column',
                    column: 'sourceId',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::db',
                      mainTableDb: 'model::relational::tests::db',
                      schema: 'default',
                      table: '{target}',
                    },
                    tableAlias: '{target}',
                  },
                ],
              },
              {
                _type: 'dynaFunc',
                funcName: 'equal',
                parameters: [
                  {
                    _type: 'column',
                    column: 'targetId',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::db',
                      mainTableDb: 'model::relational::tests::db',
                      schema: 'default',
                      table: 'interactionTable',
                    },
                    tableAlias: 'interactionTable',
                  },
                  {
                    _type: 'column',
                    column: 'targetId',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::db',
                      mainTableDb: 'model::relational::tests::db',
                      schema: 'default',
                      table: '{target}',
                    },
                    tableAlias: '{target}',
                  },
                ],
              },
            ],
          },
        },
        {
          name: 'Order_SalesPerson',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'accountID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
              {
                _type: 'column',
                column: 'ACCOUNT_ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'salesPersonTable',
                },
                tableAlias: 'salesPersonTable',
              },
            ],
          },
        },
        {
          name: 'Order_Account',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'accountID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'accountTable',
                },
                tableAlias: 'accountTable',
              },
            ],
          },
        },
        {
          name: 'OrderPnlView_Order',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ORDER_ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'orderPnlView',
                },
                tableAlias: 'orderPnlView',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
            ],
          },
        },
        {
          name: 'OrderPnlViewOnView_Order',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ORDER_ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'orderPnlViewOnView',
                },
                tableAlias: 'orderPnlViewOnView',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
            ],
          },
        },
        {
          name: 'OrderNetativePnlView_Order',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ORDER_ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'orderNegativePnlView',
                },
                tableAlias: 'orderNegativePnlView',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
            ],
          },
        },
        {
          name: 'OrderNegativePnlViewOnView_Order',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ORDER_ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'orderNegativePnlViewOnView',
                },
                tableAlias: 'orderNegativePnlViewOnView',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
            ],
          },
        },
        {
          name: 'OrderPnlView_Person',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'supportContactId',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'orderPnlView',
                },
                tableAlias: 'orderPnlView',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            ],
          },
        },
        {
          name: 'SalesPerson_PersonView',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'PERSON_ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'salesPersonTable',
                },
                tableAlias: 'salesPersonTable',
              },
              {
                _type: 'column',
                column: 'PERSON_ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'PersonFirmView',
                },
                tableAlias: 'PersonFirmView',
              },
            ],
          },
        },
        {
          name: 'OrderPnlTable_Order',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ORDER_ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'orderPnlTable',
                },
                tableAlias: 'orderPnlTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
            ],
          },
        },
        {
          name: 'AccountPnlView_Account',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'accountId',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'accountOrderPnlView',
                },
                tableAlias: 'accountOrderPnlView',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'accountTable',
                },
                tableAlias: 'accountTable',
              },
            ],
          },
        },
        {
          name: 'Person_OtherNames',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
              {
                _type: 'column',
                column: 'PERSON_ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::db',
                  mainTableDb: 'model::relational::tests::db',
                  schema: 'default',
                  table: 'otherNamesTable',
                },
                tableAlias: 'otherNamesTable',
              },
            ],
          },
        },
      ],
      name: 'db',
      package: 'model::relational::tests',
      schemas: [
        {
          name: 'productSchema',
          tables: [
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'PRODID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'TYPE',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'NAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'DECIMAL_COL',
                  nullable: false,
                  type: {
                    _type: 'Decimal',
                    precision: 10,
                    scale: 4,
                  },
                },
              ],
              name: 'synonymTable',
              primaryKey: ['ID'],
            },
          ],
          views: [],
        },
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'sourceId',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'targetId',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'time',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'active',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 1,
                  },
                },
              ],
              name: 'interactionTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'prodId',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'accountID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'quantity',
                  nullable: true,
                  type: {
                    _type: 'Float',
                  },
                },
                {
                  name: 'tradeDate',
                  nullable: true,
                  type: {
                    _type: 'Date',
                  },
                },
                {
                  name: 'settlementDateTime',
                  nullable: true,
                  type: {
                    _type: 'Timestamp',
                  },
                },
              ],
              name: 'tradeTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'name',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'createDate',
                  nullable: true,
                  type: {
                    _type: 'Date',
                  },
                },
              ],
              name: 'accountTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'EVENT_ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'trade_id',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'eventType',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 10,
                  },
                },
                {
                  name: 'eventDate',
                  nullable: true,
                  type: {
                    _type: 'Date',
                  },
                },
                {
                  name: 'person_id',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'tradeEventTable',
              primaryKey: ['EVENT_ID'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'prodId',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'accountID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'quantity',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'orderDate',
                  nullable: true,
                  type: {
                    _type: 'Date',
                  },
                },
                {
                  name: 'settlementDateTime',
                  nullable: true,
                  type: {
                    _type: 'Timestamp',
                  },
                },
              ],
              name: 'orderTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ORDER_ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'pnl',
                  nullable: true,
                  type: {
                    _type: 'Float',
                  },
                },
                {
                  name: 'from_z',
                  nullable: true,
                  type: {
                    _type: 'Date',
                  },
                },
                {
                  name: 'thru_z',
                  nullable: true,
                  type: {
                    _type: 'Date',
                  },
                },
              ],
              name: 'orderPnlTable',
              primaryKey: ['ORDER_ID'],
            },
            {
              columns: [
                {
                  name: 'PERSON_ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'ACCOUNT_ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'NAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'from_z',
                  nullable: true,
                  type: {
                    _type: 'Date',
                  },
                },
                {
                  name: 'thru_z',
                  nullable: true,
                  type: {
                    _type: 'Date',
                  },
                },
              ],
              name: 'salesPersonTable',
              primaryKey: ['PERSON_ID', 'ACCOUNT_ID'],
            },
            {
              columns: [
                {
                  name: 'PERSON_ID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'OTHER_NAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'otherNamesTable',
              primaryKey: [],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: '"FIRST NAME"',
                  nullable: false,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: '"LAST NAME"',
                  nullable: false,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'tableWithQuotedColumns',
              primaryKey: ['ID', '"FIRST NAME"', '"LAST NAME"'],
            },
          ],
          views: [
            {
              columnMappings: [
                {
                  name: 'sourceId',
                  operation: {
                    _type: 'column',
                    column: 'sourceId',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::db',
                      mainTableDb: 'model::relational::tests::db',
                      schema: 'default',
                      table: 'interactionTable',
                    },
                    tableAlias: 'interactionTable',
                  },
                },
                {
                  name: 'targetId',
                  operation: {
                    _type: 'column',
                    column: 'targetId',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::db',
                      mainTableDb: 'model::relational::tests::db',
                      schema: 'default',
                      table: 'interactionTable',
                    },
                    tableAlias: 'interactionTable',
                  },
                },
                {
                  name: 'maxTime',
                  operation: {
                    _type: 'dynaFunc',
                    funcName: 'max',
                    parameters: [
                      {
                        _type: 'column',
                        column: 'time',
                        table: {
                          _type: 'Table',
                          database: 'model::relational::tests::db',
                          mainTableDb: 'model::relational::tests::db',
                          schema: 'default',
                          table: 'interactionTable',
                        },
                        tableAlias: 'interactionTable',
                      },
                    ],
                  },
                },
              ],
              distinct: false,
              groupBy: [
                {
                  _type: 'column',
                  column: 'sourceId',
                  table: {
                    _type: 'Table',
                    database: 'model::relational::tests::db',
                    mainTableDb: 'model::relational::tests::db',
                    schema: 'default',
                    table: 'interactionTable',
                  },
                  tableAlias: 'interactionTable',
                },
                {
                  _type: 'column',
                  column: 'targetId',
                  table: {
                    _type: 'Table',
                    database: 'model::relational::tests::db',
                    mainTableDb: 'model::relational::tests::db',
                    schema: 'default',
                    table: 'interactionTable',
                  },
                  tableAlias: 'interactionTable',
                },
              ],
              name: 'interactionViewMaxTime',
              primaryKey: [],
            },
            {
              columnMappings: [
                {
                  name: 'trade_id',
                  operation: {
                    _type: 'column',
                    column: 'trade_id',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::db',
                      mainTableDb: 'model::relational::tests::db',
                      schema: 'default',
                      table: 'tradeEventTable',
                    },
                    tableAlias: 'tradeEventTable',
                  },
                },
                {
                  name: 'maxTradeEventDate',
                  operation: {
                    _type: 'dynaFunc',
                    funcName: 'max',
                    parameters: [
                      {
                        _type: 'column',
                        column: 'eventDate',
                        table: {
                          _type: 'Table',
                          database: 'model::relational::tests::db',
                          mainTableDb: 'model::relational::tests::db',
                          schema: 'default',
                          table: 'tradeEventTable',
                        },
                        tableAlias: 'tradeEventTable',
                      },
                    ],
                  },
                },
              ],
              distinct: false,
              groupBy: [
                {
                  _type: 'column',
                  column: 'trade_id',
                  table: {
                    _type: 'Table',
                    database: 'model::relational::tests::db',
                    mainTableDb: 'model::relational::tests::db',
                    schema: 'default',
                    table: 'tradeEventTable',
                  },
                  tableAlias: 'tradeEventTable',
                },
              ],
              name: 'tradeEventViewMaxTradeEventDate',
              primaryKey: [],
            },
            {
              columnMappings: [
                {
                  name: 'ORDER_ID',
                  operation: {
                    _type: 'column',
                    column: 'ORDER_ID',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::db',
                      mainTableDb: 'model::relational::tests::db',
                      schema: 'default',
                      table: 'orderPnlTable',
                    },
                    tableAlias: 'orderPnlTable',
                  },
                },
                {
                  name: 'pnl',
                  operation: {
                    _type: 'column',
                    column: 'pnl',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::db',
                      mainTableDb: 'model::relational::tests::db',
                      schema: 'default',
                      table: 'orderPnlTable',
                    },
                    tableAlias: 'orderPnlTable',
                  },
                },
                {
                  name: 'accountId',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'model::relational::tests::db',
                        name: 'OrderPnlTable_Order',
                      },
                      {
                        db: 'model::relational::tests::db',
                        name: 'Order_Account',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'ID',
                      table: {
                        _type: 'Table',
                        database: 'model::relational::tests::db',
                        mainTableDb: 'model::relational::tests::db',
                        schema: 'default',
                        table: 'accountTable',
                      },
                      tableAlias: 'accountTable',
                    },
                  },
                },
                {
                  name: 'supportContact',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'model::relational::tests::db',
                        name: 'OrderPnlTable_Order',
                      },
                      {
                        db: 'model::relational::tests::db',
                        name: 'Order_SalesPerson',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'NAME',
                      table: {
                        _type: 'Table',
                        database: 'model::relational::tests::db',
                        mainTableDb: 'model::relational::tests::db',
                        schema: 'default',
                        table: 'salesPersonTable',
                      },
                      tableAlias: 'salesPersonTable',
                    },
                  },
                },
                {
                  name: 'supportContactId',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'model::relational::tests::db',
                        name: 'OrderPnlTable_Order',
                      },
                      {
                        db: 'model::relational::tests::db',
                        name: 'Order_SalesPerson',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'PERSON_ID',
                      table: {
                        _type: 'Table',
                        database: 'model::relational::tests::db',
                        mainTableDb: 'model::relational::tests::db',
                        schema: 'default',
                        table: 'salesPersonTable',
                      },
                      tableAlias: 'salesPersonTable',
                    },
                  },
                },
              ],
              distinct: true,
              groupBy: [],
              name: 'orderPnlView',
              primaryKey: ['ORDER_ID'],
            },
            {
              columnMappings: [
                {
                  name: 'ORDER_ID',
                  operation: {
                    _type: 'column',
                    column: 'ORDER_ID',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::db',
                      mainTableDb: 'model::relational::tests::db',
                      schema: 'default',
                      table: 'orderPnlView',
                    },
                    tableAlias: 'orderPnlView',
                  },
                },
                {
                  name: 'pnl',
                  operation: {
                    _type: 'column',
                    column: 'pnl',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::db',
                      mainTableDb: 'model::relational::tests::db',
                      schema: 'default',
                      table: 'orderPnlView',
                    },
                    tableAlias: 'orderPnlView',
                  },
                },
              ],
              distinct: false,
              groupBy: [],
              name: 'orderPnlViewOnView',
              primaryKey: ['ORDER_ID'],
            },
            {
              columnMappings: [
                {
                  name: 'ORDER_ID',
                  operation: {
                    _type: 'column',
                    column: 'ORDER_ID',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::db',
                      mainTableDb: 'model::relational::tests::db',
                      schema: 'default',
                      table: 'orderPnlTable',
                    },
                    tableAlias: 'orderPnlTable',
                  },
                },
                {
                  name: 'pnl',
                  operation: {
                    _type: 'column',
                    column: 'pnl',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::db',
                      mainTableDb: 'model::relational::tests::db',
                      schema: 'default',
                      table: 'orderPnlTable',
                    },
                    tableAlias: 'orderPnlTable',
                  },
                },
                {
                  name: 'accountId',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'model::relational::tests::db',
                        name: 'OrderPnlTable_Order',
                      },
                      {
                        db: 'model::relational::tests::db',
                        name: 'Order_Account',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'ID',
                      table: {
                        _type: 'Table',
                        database: 'model::relational::tests::db',
                        mainTableDb: 'model::relational::tests::db',
                        schema: 'default',
                        table: 'accountTable',
                      },
                      tableAlias: 'accountTable',
                    },
                  },
                },
                {
                  name: 'supportContact',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'model::relational::tests::db',
                        name: 'OrderPnlTable_Order',
                      },
                      {
                        db: 'model::relational::tests::db',
                        name: 'Order_SalesPerson',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'NAME',
                      table: {
                        _type: 'Table',
                        database: 'model::relational::tests::db',
                        mainTableDb: 'model::relational::tests::db',
                        schema: 'default',
                        table: 'salesPersonTable',
                      },
                      tableAlias: 'salesPersonTable',
                    },
                  },
                },
                {
                  name: 'supportContactId',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'model::relational::tests::db',
                        name: 'OrderPnlTable_Order',
                      },
                      {
                        db: 'model::relational::tests::db',
                        name: 'Order_SalesPerson',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'PERSON_ID',
                      table: {
                        _type: 'Table',
                        database: 'model::relational::tests::db',
                        mainTableDb: 'model::relational::tests::db',
                        schema: 'default',
                        table: 'salesPersonTable',
                      },
                      tableAlias: 'salesPersonTable',
                    },
                  },
                },
              ],
              distinct: true,
              groupBy: [],
              name: 'orderNegativePnlView',
              primaryKey: ['ORDER_ID'],
            },
            {
              columnMappings: [
                {
                  name: 'ORDER_ID',
                  operation: {
                    _type: 'column',
                    column: 'ORDER_ID',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::db',
                      mainTableDb: 'model::relational::tests::db',
                      schema: 'default',
                      table: 'orderNegativePnlView',
                    },
                    tableAlias: 'orderNegativePnlView',
                  },
                },
                {
                  name: 'pnl',
                  operation: {
                    _type: 'column',
                    column: 'pnl',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::db',
                      mainTableDb: 'model::relational::tests::db',
                      schema: 'default',
                      table: 'orderNegativePnlView',
                    },
                    tableAlias: 'orderNegativePnlView',
                  },
                },
              ],
              distinct: false,
              groupBy: [],
              name: 'orderNegativePnlViewOnView',
              primaryKey: ['ORDER_ID'],
            },
            {
              columnMappings: [
                {
                  name: 'accountId',
                  operation: {
                    _type: 'column',
                    column: 'accountID',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::db',
                      mainTableDb: 'model::relational::tests::db',
                      schema: 'default',
                      table: 'orderTable',
                    },
                    tableAlias: 'orderTable',
                  },
                },
                {
                  name: 'orderPnl',
                  operation: {
                    _type: 'dynaFunc',
                    funcName: 'sum',
                    parameters: [
                      {
                        _type: 'elemtWithJoins',
                        joins: [
                          {
                            db: 'model::relational::tests::db',
                            name: 'OrderPnlTable_Order',
                          },
                        ],
                        relationalElement: {
                          _type: 'column',
                          column: 'pnl',
                          table: {
                            _type: 'Table',
                            database: 'model::relational::tests::db',
                            mainTableDb: 'model::relational::tests::db',
                            schema: 'default',
                            table: 'orderPnlTable',
                          },
                          tableAlias: 'orderPnlTable',
                        },
                      },
                    ],
                  },
                },
              ],
              distinct: false,
              groupBy: [
                {
                  _type: 'column',
                  column: 'accountID',
                  table: {
                    _type: 'Table',
                    database: 'model::relational::tests::db',
                    mainTableDb: 'model::relational::tests::db',
                    schema: 'default',
                    table: 'orderTable',
                  },
                  tableAlias: 'orderTable',
                },
              ],
              name: 'accountOrderPnlView',
              primaryKey: ['accountId'],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'model::relational::tests::db2',
    content: {
      _type: 'relational',
      filters: [],
      includedStores: [
        {
          path: 'model::relational::tests::db',
          type: 'STORE',
        },
      ],
      joins: [],
      name: 'db2',
      package: 'model::relational::tests',
      schemas: [
        {
          name: 'default',
          tables: [],
          views: [
            {
              columnMappings: [
                {
                  name: 'PERSON_ID',
                  operation: {
                    _type: 'column',
                    column: 'ID',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::db2',
                      mainTableDb: 'model::relational::tests::db2',
                      schema: 'default',
                      table: 'personTable',
                    },
                    tableAlias: 'personTable',
                  },
                },
                {
                  name: 'lastName',
                  operation: {
                    _type: 'column',
                    column: 'LASTNAME',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::db2',
                      mainTableDb: 'model::relational::tests::db2',
                      schema: 'default',
                      table: 'personTable',
                    },
                    tableAlias: 'personTable',
                  },
                },
                {
                  name: 'firm_name',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'model::relational::tests::db2',
                        name: 'Firm_Person',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'LEGALNAME',
                      table: {
                        _type: 'Table',
                        database: 'model::relational::tests::db2',
                        mainTableDb: 'model::relational::tests::db2',
                        schema: 'default',
                        table: 'firmTable',
                      },
                      tableAlias: 'firmTable',
                    },
                  },
                },
              ],
              distinct: false,
              groupBy: [],
              name: 'ViewWithJoinInIncludedStore',
              primaryKey: ['PERSON_ID'],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'model::relational::tests::dbInc',
    content: {
      _type: 'relational',
      filters: [
        {
          _type: 'filter',
          name: 'FirmXFilter',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'LEGALNAME',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::dbInc',
                  mainTableDb: 'model::relational::tests::dbInc',
                  schema: 'default',
                  table: 'firmTable',
                },
                tableAlias: 'firmTable',
              },
              {
                _type: 'literal',
                value: 'Firm X',
              },
            ],
          },
        },
      ],
      joins: [
        {
          name: 'personViewWithFirmTable',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::dbInc',
                  mainTableDb: 'model::relational::tests::dbInc',
                  schema: 'default',
                  table: 'firmTable',
                },
                tableAlias: 'firmTable',
              },
              {
                _type: 'column',
                column: 'firmId',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::dbInc',
                  mainTableDb: 'model::relational::tests::dbInc',
                  schema: 'default',
                  table: 'PersonViewWithDistinct',
                },
                tableAlias: 'PersonViewWithDistinct',
              },
            ],
          },
        },
        {
          name: 'PersonWithPersonView',
          operation: {
            _type: 'dynaFunc',
            funcName: 'and',
            parameters: [
              {
                _type: 'dynaFunc',
                funcName: 'equal',
                parameters: [
                  {
                    _type: 'column',
                    column: 'ID',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::dbInc',
                      mainTableDb: 'model::relational::tests::dbInc',
                      schema: 'default',
                      table: 'personTable',
                    },
                    tableAlias: 'personTable',
                  },
                  {
                    _type: 'column',
                    column: 'id',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::dbInc',
                      mainTableDb: 'model::relational::tests::dbInc',
                      schema: 'default',
                      table: 'personViewWithGroupBy',
                    },
                    tableAlias: 'personViewWithGroupBy',
                  },
                ],
              },
              {
                _type: 'dynaFunc',
                funcName: 'equal',
                parameters: [
                  {
                    _type: 'column',
                    column: 'AGE',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::dbInc',
                      mainTableDb: 'model::relational::tests::dbInc',
                      schema: 'default',
                      table: 'personTable',
                    },
                    tableAlias: 'personTable',
                  },
                  {
                    _type: 'column',
                    column: 'maxage',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::dbInc',
                      mainTableDb: 'model::relational::tests::dbInc',
                      schema: 'default',
                      table: 'personViewWithGroupBy',
                    },
                    tableAlias: 'personViewWithGroupBy',
                  },
                ],
              },
            ],
          },
        },
        {
          name: 'Address_Firm',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::dbInc',
                  mainTableDb: 'model::relational::tests::dbInc',
                  schema: 'default',
                  table: 'addressTable',
                },
                tableAlias: 'addressTable',
              },
              {
                _type: 'column',
                column: 'ADDRESSID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::dbInc',
                  mainTableDb: 'model::relational::tests::dbInc',
                  schema: 'default',
                  table: 'firmTable',
                },
                tableAlias: 'firmTable',
              },
            ],
          },
        },
        {
          name: 'Address_Person',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::dbInc',
                  mainTableDb: 'model::relational::tests::dbInc',
                  schema: 'default',
                  table: 'addressTable',
                },
                tableAlias: 'addressTable',
              },
              {
                _type: 'column',
                column: 'ADDRESSID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::dbInc',
                  mainTableDb: 'model::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            ],
          },
        },
        {
          name: 'Firm_Ceo',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'CEOID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::dbInc',
                  mainTableDb: 'model::relational::tests::dbInc',
                  schema: 'default',
                  table: 'firmTable',
                },
                tableAlias: 'firmTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::dbInc',
                  mainTableDb: 'model::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            ],
          },
        },
        {
          name: 'Firm_Person',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::dbInc',
                  mainTableDb: 'model::relational::tests::dbInc',
                  schema: 'default',
                  table: 'firmTable',
                },
                tableAlias: 'firmTable',
              },
              {
                _type: 'column',
                column: 'FIRMID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::dbInc',
                  mainTableDb: 'model::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            ],
          },
        },
        {
          name: 'FirmExtension_PersonExtension',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'firmId',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::dbInc',
                  mainTableDb: 'model::relational::tests::dbInc',
                  schema: 'default',
                  table: 'firmExtensionTable',
                },
                tableAlias: 'firmExtensionTable',
              },
              {
                _type: 'column',
                column: 'FIRMID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::dbInc',
                  mainTableDb: 'model::relational::tests::dbInc',
                  schema: 'default',
                  table: 'PersonTableExtension',
                },
                tableAlias: 'PersonTableExtension',
              },
            ],
          },
        },
        {
          name: 'Person_Location',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::dbInc',
                  mainTableDb: 'model::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
              {
                _type: 'column',
                column: 'PERSONID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::dbInc',
                  mainTableDb: 'model::relational::tests::dbInc',
                  schema: 'default',
                  table: 'locationTable',
                },
                tableAlias: 'locationTable',
              },
            ],
          },
        },
        {
          name: 'Person_Manager',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'MANAGERID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::dbInc',
                  mainTableDb: 'model::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::dbInc',
                  mainTableDb: 'model::relational::tests::dbInc',
                  schema: 'default',
                  table: '{target}',
                },
                tableAlias: '{target}',
              },
            ],
          },
        },
        {
          name: 'location_PlaceOfInterest',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::dbInc',
                  mainTableDb: 'model::relational::tests::dbInc',
                  schema: 'default',
                  table: 'locationTable',
                },
                tableAlias: 'locationTable',
              },
              {
                _type: 'column',
                column: 'locationID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::dbInc',
                  mainTableDb: 'model::relational::tests::dbInc',
                  schema: 'default',
                  table: 'placeOfInterestTable',
                },
                tableAlias: 'placeOfInterestTable',
              },
            ],
          },
        },
        {
          name: 'Person_OtherFirm',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'FIRMID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::dbInc',
                  mainTableDb: 'model::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'model::relational::tests::dbInc',
                  mainTableDb: 'model::relational::tests::dbInc',
                  schema: 'default',
                  table: 'otherFirmTable',
                },
                tableAlias: 'otherFirmTable',
              },
            ],
          },
        },
      ],
      name: 'dbInc',
      package: 'model::relational::tests',
      schemas: [
        {
          name: 'productSchema',
          tables: [
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'NAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'productTable',
              primaryKey: ['ID'],
            },
          ],
          views: [],
        },
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FIRSTNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'LASTNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'AGE',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'ADDRESSID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FIRMID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'MANAGERID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'personTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FIRSTNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'LASTNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'AGE',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'ADDRESSID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FIRMID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'MANAGERID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'birthDate',
                  nullable: true,
                  type: {
                    _type: 'Date',
                  },
                },
              ],
              name: 'PersonTableExtension',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FIRSTNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'LASTNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'AGE',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'ADDRESSID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FIRMID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'MANAGERID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'differentPersonTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'LEGALNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'ADDRESSID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'CEOID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'firmTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'firmId',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'legalName',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'establishedDate',
                  nullable: true,
                  type: {
                    _type: 'Date',
                  },
                },
              ],
              name: 'firmExtensionTable',
              primaryKey: ['firmId'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'LEGALNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'ADDRESSID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'otherFirmTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'TYPE',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'NAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'STREET',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 100,
                  },
                },
                {
                  name: 'COMMENTS',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 100,
                  },
                },
              ],
              name: 'addressTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'PERSONID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'PLACE',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'date',
                  nullable: true,
                  type: {
                    _type: 'Date',
                  },
                },
              ],
              name: 'locationTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'locationID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'NAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'placeOfInterestTable',
              primaryKey: ['ID', 'locationID'],
            },
          ],
          views: [
            {
              columnMappings: [
                {
                  name: 'PERSON_ID',
                  operation: {
                    _type: 'column',
                    column: 'ID',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::dbInc',
                      mainTableDb: 'model::relational::tests::dbInc',
                      schema: 'default',
                      table: 'personTable',
                    },
                    tableAlias: 'personTable',
                  },
                },
                {
                  name: 'lastName',
                  operation: {
                    _type: 'column',
                    column: 'LASTNAME',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::dbInc',
                      mainTableDb: 'model::relational::tests::dbInc',
                      schema: 'default',
                      table: 'personTable',
                    },
                    tableAlias: 'personTable',
                  },
                },
                {
                  name: 'firm_name',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'model::relational::tests::dbInc',
                        name: 'Firm_Person',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'LEGALNAME',
                      table: {
                        _type: 'Table',
                        database: 'model::relational::tests::dbInc',
                        mainTableDb: 'model::relational::tests::dbInc',
                        schema: 'default',
                        table: 'firmTable',
                      },
                      tableAlias: 'firmTable',
                    },
                  },
                },
              ],
              distinct: false,
              groupBy: [],
              name: 'PersonFirmView',
              primaryKey: ['PERSON_ID'],
            },
            {
              columnMappings: [
                {
                  name: 'id',
                  operation: {
                    _type: 'column',
                    column: 'ID',
                    table: {
                      _type: 'Table',
                      database: 'model::relational::tests::dbInc',
                      mainTableDb: 'model::relational::tests::dbInc',
                      schema: 'default',
                      table: 'personTable',
                    },
                    tableAlias: 'personTable',
                  },
                },
                {
                  name: 'maxage',
                  operation: {
                    _type: 'dynaFunc',
                    funcName: 'max',
                    parameters: [
                      {
                        _type: 'column',
                        column: 'AGE',
                        table: {
                          _type: 'Table',
                          database: 'model::relational::tests::dbInc',
                          mainTableDb: 'model::relational::tests::dbInc',
                          schema: 'default',
                          table: 'personTable',
                        },
                        tableAlias: 'personTable',
                      },
                    ],
                  },
                },
              ],
              distinct: false,
              groupBy: [
                {
                  _type: 'column',
                  column: 'ID',
                  table: {
                    _type: 'Table',
                    database: 'model::relational::tests::dbInc',
                    mainTableDb: 'model::relational::tests::dbInc',
                    schema: 'default',
                    table: 'personTable',
                  },
                  tableAlias: 'personTable',
                },
              ],
              name: 'personViewWithGroupBy',
              primaryKey: ['id'],
            },
            {
              columnMappings: [
                {
                  name: 'id',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'model::relational::tests::dbInc',
                        name: 'PersonWithPersonView',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'ID',
                      table: {
                        _type: 'Table',
                        database: 'model::relational::tests::dbInc',
                        mainTableDb: 'model::relational::tests::dbInc',
                        schema: 'default',
                        table: 'personTable',
                      },
                      tableAlias: 'personTable',
                    },
                  },
                },
                {
                  name: 'firstName',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'model::relational::tests::dbInc',
                        name: 'PersonWithPersonView',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'FIRSTNAME',
                      table: {
                        _type: 'Table',
                        database: 'model::relational::tests::dbInc',
                        mainTableDb: 'model::relational::tests::dbInc',
                        schema: 'default',
                        table: 'personTable',
                      },
                      tableAlias: 'personTable',
                    },
                  },
                },
                {
                  name: 'lastName',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'model::relational::tests::dbInc',
                        name: 'PersonWithPersonView',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'LASTNAME',
                      table: {
                        _type: 'Table',
                        database: 'model::relational::tests::dbInc',
                        mainTableDb: 'model::relational::tests::dbInc',
                        schema: 'default',
                        table: 'personTable',
                      },
                      tableAlias: 'personTable',
                    },
                  },
                },
                {
                  name: 'firmId',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'model::relational::tests::dbInc',
                        name: 'PersonWithPersonView',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'FIRMID',
                      table: {
                        _type: 'Table',
                        database: 'model::relational::tests::dbInc',
                        mainTableDb: 'model::relational::tests::dbInc',
                        schema: 'default',
                        table: 'personTable',
                      },
                      tableAlias: 'personTable',
                    },
                  },
                },
              ],
              distinct: true,
              groupBy: [],
              name: 'PersonViewWithDistinct',
              primaryKey: ['id'],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
];

export const TEST_DATA__DatabaseWithSelfJoin = [
  {
    path: 'apps::meta::relational::tests::dbInc',
    content: {
      _type: 'relational',
      filters: [],
      joins: [
        {
          name: 'Person_Manager',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'MANAGERID',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: '{target}',
                },
                tableAlias: '{target}',
              },
            ],
          },
        },
      ],
      name: 'dbInc',
      package: 'apps::meta::relational::tests',
      schemas: [
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'MANAGERID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'personTable',
              primaryKey: ['ID'],
            },
          ],
          views: [],
        },
      ],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'apps::meta::relational::tests::dbInc1',
    content: {
      _type: 'relational',
      filters: [],
      joins: [
        {
          name: 'Person_Manager',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'MANAGERID',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc1',
                  mainTableDb: 'apps::meta::relational::tests::dbInc1',
                  schema: 'demoSchema',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc1',
                  mainTableDb: 'apps::meta::relational::tests::dbInc1',
                  schema: 'default',
                  table: '{target}',
                },
                tableAlias: '{target}',
              },
            ],
          },
        },
      ],
      name: 'dbInc1',
      package: 'apps::meta::relational::tests',
      schemas: [
        {
          name: 'demoSchema',
          tables: [
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'MANAGERID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'personTable',
              primaryKey: ['ID'],
            },
          ],
          views: [],
        },
      ],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
];

export const TEST_DATA__simpleEmbeddedRelationalRoundtrip = [
  {
    path: 'other::Address',
    content: {
      _type: 'class',
      name: 'Address',
      package: 'other',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'line1',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'other::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'other',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'legalName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'employees',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'other::Person',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'address',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'other::Address',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'other::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'other',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'firm',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'other::Firm',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'address',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'other::Address',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'mapping::db',
    content: {
      _type: 'relational',
      filters: [
        {
          _type: 'filter',
          name: 'PersonFilter',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'name',
                table: {
                  _type: 'Table',
                  database: 'mapping::db',
                  mainTableDb: 'mapping::db',
                  schema: 'default',
                  table: 'employeeFirmDenormTable',
                },
                tableAlias: 'employeeFirmDenormTable',
              },
              {
                _type: 'literal',
                value: 'Utkarsh',
              },
            ],
          },
        },
      ],
      joins: [
        {
          name: 'testJoin',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'name',
                table: {
                  _type: 'Table',
                  database: 'mapping::db',
                  mainTableDb: 'mapping::db',
                  schema: 'default',
                  table: 'employeeFirmDenormTable',
                },
                tableAlias: 'employeeFirmDenormTable',
              },
              {
                _type: 'column',
                column: 'name',
                table: {
                  _type: 'Table',
                  database: 'mapping::db',
                  mainTableDb: 'mapping::db',
                  schema: 'default',
                  table: '{target}',
                },
                tableAlias: '{target}',
              },
            ],
          },
        },
      ],
      name: 'db',
      package: 'mapping',
      schemas: [
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'id',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'name',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'firmId',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'legalName',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'address',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'employeeFirmDenormTable',
              primaryKey: ['id'],
            },
          ],
          views: [],
        },
      ],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'mappingPackage::myMapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'relational',
          class: 'other::Person',
          distinct: false,
          filter: {
            filter: {
              db: 'mapping::db',
              name: 'PersonFilter',
            },
            joins: [
              {
                db: 'mapping::db',
                name: 'testJoin',
              },
            ],
          },
          mainTable: {
            _type: 'Table',
            database: 'mapping::db',
            mainTableDb: 'mapping::db',
            schema: 'default',
            table: 'employeeFirmDenormTable',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'id',
              table: {
                _type: 'Table',
                database: 'mapping::db',
                mainTableDb: 'mapping::db',
                schema: 'default',
                table: 'employeeFirmDenormTable',
              },
              tableAlias: 'employeeFirmDenormTable',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'other::Person',
                property: 'name',
              },
              relationalOperation: {
                _type: 'column',
                column: 'name',
                table: {
                  _type: 'Table',
                  database: 'mapping::db',
                  mainTableDb: 'mapping::db',
                  schema: 'default',
                  table: 'employeeFirmDenormTable',
                },
                tableAlias: 'employeeFirmDenormTable',
              },
            },
            {
              _type: 'embeddedPropertyMapping',
              classMapping: {
                _type: 'embedded',
                primaryKey: [],
                propertyMappings: [
                  {
                    _type: 'relationalPropertyMapping',
                    property: {
                      property: 'legalName',
                    },
                    relationalOperation: {
                      _type: 'column',
                      column: 'legalName',
                      table: {
                        _type: 'Table',
                        database: 'mapping::db',
                        mainTableDb: 'mapping::db',
                        schema: 'default',
                        table: 'employeeFirmDenormTable',
                      },
                      tableAlias: 'employeeFirmDenormTable',
                    },
                  },
                ],
                root: false,
              },
              property: {
                class: 'other::Person',
                property: 'firm',
              },
            },
          ],
          root: false,
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'myMapping',
      package: 'mappingPackage',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
];

export const TEST_DATA__multiLevelEmbeddedRelationalRoundtrip = [
  {
    path: 'other::Address',
    content: {
      _type: 'class',
      name: 'Address',
      package: 'other',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'line1',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'other::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'other',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'legalName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'employees',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'other::Person',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'address',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'other::Address',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'other::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'other',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'firm',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'other::Firm',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'address',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'other::Address',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'mapping::db',
    content: {
      _type: 'relational',
      filters: [],
      joins: [],
      name: 'db',
      package: 'mapping',
      schemas: [
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'id',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'name',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'firmId',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'legalName',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'address',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'employeeFirmDenormTable',
              primaryKey: ['id'],
            },
          ],
          views: [],
        },
      ],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'mappingPackage::myMapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'relational',
          class: 'other::Person',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'mapping::db',
            mainTableDb: 'mapping::db',
            schema: 'default',
            table: 'employeeFirmDenormTable',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'id',
              table: {
                _type: 'Table',
                database: 'mapping::db',
                mainTableDb: 'mapping::db',
                schema: 'default',
                table: 'employeeFirmDenormTable',
              },
              tableAlias: '',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'other::Person',
                property: 'name',
              },
              relationalOperation: {
                _type: 'column',
                column: 'name',
                table: {
                  _type: 'Table',
                  database: 'mapping::db',
                  mainTableDb: 'mapping::db',
                  schema: 'default',
                  table: 'employeeFirmDenormTable',
                },
                tableAlias: 'employeeFirmDenormTable',
              },
            },
            {
              _type: 'embeddedPropertyMapping',
              classMapping: {
                _type: 'embedded',
                primaryKey: [
                  {
                    _type: 'column',
                    column: 'legalName',
                    table: {
                      _type: 'Table',
                      database: 'mapping::db',
                      mainTableDb: 'mapping::db',
                      schema: 'default',
                      table: 'employeeFirmDenormTable',
                    },
                    tableAlias: 'employeeFirmDenormTable',
                  },
                ],
                propertyMappings: [
                  {
                    _type: 'relationalPropertyMapping',
                    property: {
                      property: 'legalName',
                    },
                    relationalOperation: {
                      _type: 'column',
                      column: 'legalName',
                      table: {
                        _type: 'Table',
                        database: 'mapping::db',
                        mainTableDb: 'mapping::db',
                        schema: 'default',
                        table: 'employeeFirmDenormTable',
                      },
                      tableAlias: 'employeeFirmDenormTable',
                    },
                  },
                  {
                    _type: 'embeddedPropertyMapping',
                    classMapping: {
                      _type: 'embedded',
                      primaryKey: [],
                      propertyMappings: [
                        {
                          _type: 'relationalPropertyMapping',
                          property: {
                            property: 'line1',
                          },
                          relationalOperation: {
                            _type: 'column',
                            column: 'address',
                            table: {
                              _type: 'Table',
                              database: 'mapping::db',
                              mainTableDb: 'mapping::db',
                              schema: 'default',
                              table: 'employeeFirmDenormTable',
                            },
                            tableAlias: 'employeeFirmDenormTable',
                          },
                        },
                      ],
                      root: false,
                    },
                    property: {
                      property: 'address',
                    },
                  },
                ],
                root: false,
              },
              property: {
                class: 'other::Person',
                property: 'firm',
              },
            },
            {
              _type: 'embeddedPropertyMapping',
              classMapping: {
                _type: 'embedded',
                primaryKey: [],
                propertyMappings: [
                  {
                    _type: 'relationalPropertyMapping',
                    property: {
                      property: 'line1',
                    },
                    relationalOperation: {
                      _type: 'column',
                      column: 'address',
                      table: {
                        _type: 'Table',
                        database: 'mapping::db',
                        mainTableDb: 'mapping::db',
                        schema: 'default',
                        table: 'employeeFirmDenormTable',
                      },
                      tableAlias: 'employeeFirmDenormTable',
                    },
                  },
                ],
                root: false,
              },
              property: {
                class: 'other::Person',
                property: 'address',
              },
            },
          ],
          root: false,
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'myMapping',
      package: 'mappingPackage',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
];

// References to resolve in Relational Mapping
// - TablePointer / Maintable
// - JoinPointer
// - ColumnPointer
// - FilterPointer
export const TEST_DATA__RelationalMappingRoundtrip = [
  // TODO
];

// References to resolve in Relational Database Connection
// - Connection store
export const TEST_DATA__RelationalDatabaseConnectionRoundtrip = [
  {
    path: 'apps::pure::studio::relational::tests::dbInc',
    content: {
      _type: 'relational',
      filters: [],
      joins: [],
      name: 'dbInc',
      package: 'apps::pure::studio::relational::tests',
      schemas: [],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'apps::myRedshift',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'RelationalDatabaseConnection',
        authenticationStrategy: {
          _type: 'oauth',
          oauthKey: 'dummy',
          scopeName: 'UserPass',
        },
        databaseType: 'H2',
        datasourceSpecification: {
          _type: 'redshift',
          clusterID: 'cluster',
          databaseName: 'test',
          endpointURL: 'endpoint',
          host: 'myserver',
          port: 5439,
          region: 'region-1',
        },
        element: 'apps::pure::studio::relational::tests::dbInc',
        type: 'H2',
      },
      name: 'myRedshift',
      package: 'apps',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
  {
    path: 'apps::mySnowFlake',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'RelationalDatabaseConnection',
        authenticationStrategy: {
          _type: 'oauth',
          oauthKey: 'dummy',
          scopeName: 'UserPass',
        },
        databaseType: 'H2',
        datasourceSpecification: {
          _type: 'snowflake',
          accountName: 'dummy',
          databaseName: 'test',
          region: 'EMEA',
          warehouseName: 'test',
        },
        element: 'apps::pure::studio::relational::tests::dbInc',
        type: 'H2',
      },
      name: 'mySnowFlake',
      package: 'apps',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
  {
    path: 'apps::mySnowFlakeWithRole',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'RelationalDatabaseConnection',
        authenticationStrategy: {
          _type: 'oauth',
          oauthKey: 'dummy',
          scopeName: 'UserPass',
        },
        databaseType: 'H2',
        datasourceSpecification: {
          _type: 'snowflake',
          accountName: 'dummy',
          databaseName: 'test',
          region: 'EMEA',
          role: 'test',
          warehouseName: 'test',
        },
        element: 'apps::pure::studio::relational::tests::dbInc',
        type: 'H2',
      },
      name: 'mySnowFlakeWithRole',
      package: 'apps',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
  {
    path: 'apps::mySnowFlakeWithQuotedIdentifiersIgnoreCaseFlag',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'RelationalDatabaseConnection',
        authenticationStrategy: {
          _type: 'oauth',
          oauthKey: 'dummy',
          scopeName: 'UserPass',
        },
        databaseType: 'H2',
        datasourceSpecification: {
          _type: 'snowflake',
          accountName: 'dummy',
          databaseName: 'test',
          quotedIdentifiersIgnoreCase: true,
          region: 'EMEA',
          warehouseName: 'test',
        },
        element: 'apps::pure::studio::relational::tests::dbInc',
        type: 'H2',
      },
      name: 'mySnowFlakeWithQuotedIdentifiersIgnoreCaseFlag',
      package: 'apps',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
  {
    path: 'apps::mySnowFlakeWithQuotedIdentifiersIgnoreCaseFlag2',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'RelationalDatabaseConnection',
        authenticationStrategy: {
          _type: 'oauth',
          oauthKey: 'dummy',
          scopeName: 'UserPass',
        },
        databaseType: 'H2',
        datasourceSpecification: {
          _type: 'snowflake',
          accountName: 'dummy',
          databaseName: 'test',
          quotedIdentifiersIgnoreCase: false,
          region: 'EMEA',
          warehouseName: 'test',
        },
        element: 'apps::pure::studio::relational::tests::dbInc',
        type: 'H2',
      },
      name: 'mySnowFlakeWithQuotedIdentifiersIgnoreCaseFlag2',
      package: 'apps',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
  {
    path: 'simple::H2Connection',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'RelationalDatabaseConnection',
        authenticationStrategy: {
          _type: 'h2Default',
        },
        databaseType: 'H2',
        datasourceSpecification: {
          _type: 'static',
          databaseName: 'myDb',
          host: 'somehost',
          port: 999,
        },
        element: 'apps::pure::studio::relational::tests::dbInc',
        type: 'H2',
      },
      name: 'H2Connection',
      package: 'simple',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
  {
    path: 'simple::H2Connection2',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'RelationalDatabaseConnection',
        authenticationStrategy: {
          _type: 'h2Default',
        },
        databaseType: 'H2',
        datasourceSpecification: {
          _type: 'static',
          databaseName: 'myDb',
          host: 'somehost',
          port: 999,
        },
        element: 'apps::pure::studio::relational::tests::dbInc',
        queryTimeOutInSeconds: 1000,
        type: 'H2',
      },
      name: 'H2Connection2',
      package: 'simple',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
  {
    path: 'simple::SnowflakeConnection',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'RelationalDatabaseConnection',
        authenticationStrategy: {
          _type: 'h2Default',
        },
        databaseType: 'Snowflake',
        datasourceSpecification: {
          _type: 'snowflake',
          accountName: 'acct1',
          databaseName: 'dbName',
          region: 'reg1',
          warehouseName: 'warehouse',
        },
        element: 'apps::pure::studio::relational::tests::dbInc',
        type: 'Snowflake',
      },
      name: 'SnowflakeConnection',
      package: 'simple',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
  {
    path: 'simple::H2ConnectionWithQuoteIdentifiers',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'RelationalDatabaseConnection',
        authenticationStrategy: {
          _type: 'h2Default',
        },
        databaseType: 'H2',
        datasourceSpecification: {
          _type: 'static',
          databaseName: 'myDb',
          host: 'somehost',
          port: 999,
        },
        element: 'apps::pure::studio::relational::tests::dbInc',
        quoteIdentifiers: true,
        timeZone: 'IST',
        type: 'H2',
      },
      name: 'H2ConnectionWithQuoteIdentifiers',
      package: 'simple',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
  {
    path: 'simple::H2ConnectionWithQuoteIdentifiers1',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'RelationalDatabaseConnection',
        authenticationStrategy: {
          _type: 'h2Default',
        },
        databaseType: 'H2',
        datasourceSpecification: {
          _type: 'static',
          databaseName: 'myDb',
          host: 'somehost',
          port: 999,
        },
        element: 'apps::pure::studio::relational::tests::dbInc',
        quoteIdentifiers: false,
        timeZone: 'IST',
        type: 'H2',
      },
      name: 'H2ConnectionWithQuoteIdentifiers1',
      package: 'simple',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
  {
    path: 'apps::myBigQueryWithApplicationDefaultCredentials',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'RelationalDatabaseConnection',
        authenticationStrategy: {
          _type: 'gcpApplicationDefaultCredentials',
        },
        databaseType: 'BigQuery',
        datasourceSpecification: {
          _type: 'bigQuery',
          defaultDataset: 'legend_testing_dataset',
          projectId: 'legend-integration-testing',
          proxyHost: 'proxy-host',
          proxyPort: '8080',
        },
        element: 'apps::pure::studio::relational::tests::dbInc',
        type: 'BigQuery',
      },
      name: 'myBigQueryWithApplicationDefaultCredentials',
      package: 'apps',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
  {
    path: 'apps::middleTierUsernamePasswordConnection',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'RelationalDatabaseConnection',
        authenticationStrategy: {
          _type: 'middleTierUserNamePassword',
          vaultReference: 'value',
        },
        databaseType: 'H2',
        datasourceSpecification: {
          _type: 'static',
          databaseName: 'myDb',
          host: 'somehost',
          port: 999,
        },
        element: 'apps::pure::studio::relational::tests::dbInc',
        type: 'H2',
      },
      name: 'middleTierUsernamePasswordConnection',
      package: 'apps',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
  {
    path: 'apps::myBigQueryWithWorkloadIdentityFederation',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'RelationalDatabaseConnection',
        authenticationStrategy: {
          _type: 'gcpWorkloadIdentityFederation',
          additionalGcpScopes: [],
          serviceAccountEmail: 'serviceAccountEmail',
        },
        databaseType: 'BigQuery',
        datasourceSpecification: {
          _type: 'bigQuery',
          defaultDataset: 'legend_testing_dataset',
          projectId: 'legend-integration-testing',
          proxyHost: 'proxy-host',
          proxyPort: '8080',
        },
        element: 'apps::pure::studio::relational::tests::dbInc',
        type: 'BigQuery',
      },
      name: 'myBigQueryWithWorkloadIdentityFederation',
      package: 'apps',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
];

export const TEST_DATA__RelationalInputData = [
  // TODO
];

export const TEST_DATA__RelationalAssociationMapping = [
  {
    path: 'apps::meta::pure::tests::model::simple::GeographicEntityType',
    content: {
      _type: 'Enumeration',
      name: 'GeographicEntityType',
      package: 'apps::meta::pure::tests::model::simple',
      values: [
        {
          taggedValues: [
            {
              tag: {
                profile: 'doc',
                value: 'doc',
              },
              value: 'A city, town, village, or other urban area.',
            },
          ],
          value: 'CITY',
        },
        {
          stereotypes: [
            {
              profile: 'doc',
              value: 'deprecated',
            },
          ],
          value: 'COUNTRY',
        },
        {
          taggedValues: [
            {
              tag: {
                profile: 'doc',
                value: 'doc',
              },
              value: 'Any geographic entity other than a city or country.',
            },
          ],
          value: 'REGION',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
  },
  {
    path: 'apps::meta::pure::tests::model::simple::Address',
    content: {
      _type: 'class',
      name: 'Address',
      package: 'apps::meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'street',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'comments',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'plus',
              parameters: [
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 2,
                    upperBound: 2,
                  },
                  values: [
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      values: ['D:'],
                    },
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                        },
                      ],
                      property: 'name',
                    },
                  ],
                },
              ],
            },
          ],
          name: 'description',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
      superTypes: [
        {
          path: 'apps::meta::pure::tests::model::simple::GeographicEntity',
          type: 'CLASS',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'apps::meta::pure::tests::model::simple::Bridge',
    content: {
      _type: 'class',
      name: 'Bridge',
      package: 'apps::meta::pure::tests::model::simple',
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'apps::meta::pure::tests::model::simple::Department',
    content: {
      _type: 'class',
      name: 'Department',
      package: 'apps::meta::pure::tests::model::simple',
      superTypes: [
        {
          path: 'apps::meta::pure::tests::model::simple::Organization',
          type: 'CLASS',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'apps::meta::pure::tests::model::simple::Division',
    content: {
      _type: 'class',
      name: 'Division',
      package: 'apps::meta::pure::tests::model::simple',
      superTypes: [
        {
          path: 'apps::meta::pure::tests::model::simple::Organization',
          type: 'CLASS',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'apps::meta::pure::tests::model::simple::EntityWithAddress',
    content: {
      _type: 'class',
      name: 'EntityWithAddress',
      package: 'apps::meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'address',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Address',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'apps::meta::pure::tests::model::simple::EntityWithLocations',
    content: {
      _type: 'class',
      name: 'EntityWithLocations',
      package: 'apps::meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'locations',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Location',
            },
          },
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                    },
                  ],
                  property: 'locations',
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'exists',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'types',
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'is',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'l',
                                    },
                                  ],
                                  property: 'type',
                                },
                                {
                                  _type: 'var',
                                  name: 'type',
                                },
                              ],
                            },
                          ],
                          parameters: [
                            {
                              _type: 'var',
                              name: 'type',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'l',
                    },
                  ],
                },
              ],
            },
          ],
          name: 'locationsByType',
          parameters: [
            {
              _type: 'var',
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath:
                    'apps::meta::pure::tests::model::simple::GeographicEntityType',
                },
              },
              multiplicity: {
                lowerBound: 0,
              },
              name: 'types',
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Location',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'apps::meta::pure::tests::model::simple::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'apps::meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'legalName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'nickName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'times',
              parameters: [
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 2,
                    upperBound: 2,
                  },
                  values: [
                    {
                      _type: 'func',
                      function: 'average',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                },
                              ],
                              property: 'employees',
                            },
                          ],
                          property: 'age',
                        },
                      ],
                    },
                    {
                      _type: 'float',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      values: [2],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'averageEmployeesAge',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'sum',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                        },
                      ],
                      property: 'employees',
                    },
                  ],
                  property: 'age',
                },
              ],
            },
          ],
          name: 'sumEmployeesAge',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'max',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                        },
                      ],
                      property: 'employees',
                    },
                  ],
                  property: 'age',
                },
              ],
            },
          ],
          name: 'maxEmployeesAge',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'plus',
              parameters: [
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 3,
                    upperBound: 3,
                  },
                  values: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                        },
                      ],
                      property: 'legalName',
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      values: [','],
                    },
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'toOne',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                },
                              ],
                              property: 'address',
                            },
                          ],
                        },
                      ],
                      property: 'name',
                    },
                  ],
                },
              ],
            },
          ],
          name: 'nameAndAddress',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'func',
                  function: 'equal',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'toOne',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'this',
                            },
                          ],
                          property: 'legalName',
                        },
                      ],
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      values: ['Firm X'],
                    },
                  ],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      values: ['Yes'],
                    },
                  ],
                  parameters: [],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      values: ['No'],
                    },
                  ],
                  parameters: [],
                },
              ],
            },
          ],
          name: 'isfirmX',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'func',
                  function: 'equal',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                        },
                      ],
                      property: 'legalName',
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      values: ['Firm X'],
                    },
                  ],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'plus',
                      parameters: [
                        {
                          _type: 'collection',
                          multiplicity: {
                            lowerBound: 2,
                            upperBound: 2,
                          },
                          values: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                },
                              ],
                              property: 'legalName',
                            },
                            {
                              _type: 'string',
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                              values: [' , Top Secret'],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'plus',
                      parameters: [
                        {
                          _type: 'collection',
                          multiplicity: {
                            lowerBound: 3,
                            upperBound: 3,
                          },
                          values: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                },
                              ],
                              property: 'legalName',
                            },
                            {
                              _type: 'string',
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                              values: [','],
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'func',
                                  function: 'toOne',
                                  parameters: [
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'this',
                                        },
                                      ],
                                      property: 'address',
                                    },
                                  ],
                                },
                              ],
                              property: 'name',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [],
                },
              ],
            },
          ],
          name: 'nameAndMaskedAddress',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                        },
                      ],
                      property: 'employees',
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'e',
                                },
                              ],
                              property: 'lastName',
                            },
                            {
                              _type: 'var',
                              name: 'lastName',
                            },
                          ],
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'e',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'employeeByLastName',
          parameters: [
            {
              _type: 'var',
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'String',
                },
              },
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'lastName',
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Person',
            },
          },
        },
        {
          body: [
            {
              _type: 'property',
              parameters: [
                {
                  _type: 'func',
                  function: 'toOne',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'filter',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'this',
                            },
                          ],
                          property: 'employees',
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'equal',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'e',
                                    },
                                  ],
                                  property: 'lastName',
                                },
                                {
                                  _type: 'var',
                                  name: 'lastName',
                                },
                              ],
                            },
                          ],
                          parameters: [
                            {
                              _type: 'var',
                              name: 'e',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
              property: 'firstName',
            },
          ],
          name: 'employeeByLastNameFirstName',
          parameters: [
            {
              _type: 'var',
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'String',
                },
              },
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'lastName',
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                        },
                      ],
                      property: 'employees',
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'lastName',
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'e',
                                },
                              ],
                              property: 'lastName',
                            },
                          ],
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'e',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'employeeByLastNameWhereVarIsFirstEqualArg',
          parameters: [
            {
              _type: 'var',
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'String',
                },
              },
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'lastName',
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Person',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                    },
                  ],
                  property: 'employees',
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'lessThan',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'toOne',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'e',
                                },
                              ],
                              property: 'age',
                            },
                          ],
                        },
                        {
                          _type: 'var',
                          name: 'age',
                        },
                      ],
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'e',
                    },
                  ],
                },
              ],
            },
          ],
          name: 'employeesByAge',
          parameters: [
            {
              _type: 'var',
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'Integer',
                },
              },
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'age',
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Person',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                    },
                  ],
                  property: 'employees',
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'or',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'e',
                                    },
                                  ],
                                  property: 'address',
                                },
                              ],
                              property: 'name',
                            },
                            {
                              _type: 'var',
                              name: 'city',
                            },
                          ],
                        },
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'e',
                                    },
                                  ],
                                  property: 'manager',
                                },
                              ],
                              property: 'name',
                            },
                            {
                              _type: 'var',
                              name: 'managerName',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'e',
                    },
                  ],
                },
              ],
            },
          ],
          name: 'employeesByCityOrManager',
          parameters: [
            {
              _type: 'var',
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'String',
                },
              },
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'city',
            },
            {
              _type: 'var',
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'String',
                },
              },
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'managerName',
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Person',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                        },
                      ],
                      property: 'employees',
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'and',
                          parameters: [
                            {
                              _type: 'func',
                              function: 'equal',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'e',
                                    },
                                  ],
                                  property: 'lastName',
                                },
                                {
                                  _type: 'var',
                                  name: 'name',
                                },
                              ],
                            },
                            {
                              _type: 'func',
                              function: 'or',
                              parameters: [
                                {
                                  _type: 'func',
                                  function: 'equal',
                                  parameters: [
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'property',
                                          parameters: [
                                            {
                                              _type: 'var',
                                              name: 'e',
                                            },
                                          ],
                                          property: 'address',
                                        },
                                      ],
                                      property: 'name',
                                    },
                                    {
                                      _type: 'var',
                                      name: 'city',
                                    },
                                  ],
                                },
                                {
                                  _type: 'func',
                                  function: 'equal',
                                  parameters: [
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'property',
                                          parameters: [
                                            {
                                              _type: 'var',
                                              name: 'e',
                                            },
                                          ],
                                          property: 'manager',
                                        },
                                      ],
                                      property: 'name',
                                    },
                                    {
                                      _type: 'var',
                                      name: 'managerName',
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'e',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'employeesByCityOrManagerAndLastName',
          parameters: [
            {
              _type: 'var',
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'String',
                },
              },
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'name',
            },
            {
              _type: 'var',
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'String',
                },
              },
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'city',
            },
            {
              _type: 'var',
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'String',
                },
              },
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'managerName',
            },
          ],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Person',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'exists',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                    },
                  ],
                  property: 'employees',
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'lessThan',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'toOne',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'e',
                                },
                              ],
                              property: 'age',
                            },
                          ],
                        },
                        {
                          _type: 'var',
                          name: 'age',
                        },
                      ],
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'e',
                    },
                  ],
                },
              ],
            },
          ],
          name: 'hasEmployeeBelowAge',
          parameters: [
            {
              _type: 'var',
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'Integer',
                },
              },
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'age',
            },
          ],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'first',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                        },
                      ],
                      property: 'employees',
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'e',
                                },
                              ],
                              property: 'name',
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'this',
                                    },
                                  ],
                                  property: 'address',
                                },
                              ],
                              property: 'name',
                            },
                          ],
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'e',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'employeeWithFirmAddressName',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Person',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'first',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                        },
                      ],
                      property: 'employees',
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'e',
                                    },
                                  ],
                                  property: 'address',
                                },
                              ],
                              property: 'name',
                            },
                            {
                              _type: 'var',
                              name: 'name',
                            },
                          ],
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'e',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'employeeWithAddressName',
          parameters: [
            {
              _type: 'var',
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'String',
                },
              },
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'name',
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Person',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'joinStrings',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'sortBy',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'filter',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                },
                              ],
                              property: 'employees',
                            },
                            {
                              _type: 'lambda',
                              body: [
                                {
                                  _type: 'func',
                                  function: 'equal',
                                  parameters: [
                                    {
                                      _type: 'func',
                                      function: 'trim',
                                      parameters: [
                                        {
                                          _type: 'func',
                                          function: 'toOne',
                                          parameters: [
                                            {
                                              _type: 'property',
                                              parameters: [
                                                {
                                                  _type: 'property',
                                                  parameters: [
                                                    {
                                                      _type: 'var',
                                                      name: 'e',
                                                    },
                                                  ],
                                                  property: 'address',
                                                },
                                              ],
                                              property: 'name',
                                            },
                                          ],
                                        },
                                      ],
                                    },
                                    {
                                      _type: 'var',
                                      name: 'name',
                                    },
                                  ],
                                },
                              ],
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'e',
                                },
                              ],
                            },
                          ],
                        },
                        {
                          _type: 'path',
                          path: [
                            {
                              _type: 'propertyPath',
                              parameters: [],
                              property: 'lastName',
                            },
                          ],
                          startType:
                            'apps::meta::pure::tests::model::simple::Person',
                        },
                      ],
                    },
                  ],
                  property: 'lastName',
                },
                {
                  _type: 'string',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  values: [''],
                },
              ],
            },
          ],
          name: 'employeesWithAddressNameSorted',
          parameters: [
            {
              _type: 'var',
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'String',
                },
              },
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'name',
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'func',
                  function: 'map',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                        },
                      ],
                      property: 'employees',
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'e',
                            },
                          ],
                          property: 'address',
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'e',
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'and',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'name',
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'this',
                                    },
                                  ],
                                  property: 'address',
                                },
                              ],
                              property: 'name',
                            },
                          ],
                        },
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'var',
                              name: 't',
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'x',
                                },
                              ],
                              property: 'type',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x',
                    },
                  ],
                },
              ],
            },
          ],
          name: 'employeeAddressesWithFirmAddressName',
          parameters: [
            {
              _type: 'var',
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'String',
                },
              },
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'name',
            },
            {
              _type: 'var',
              class:
                'apps::meta::pure::tests::model::simple::GeographicEntityType',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 't',
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Address',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'in',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                    },
                  ],
                  property: 'legalName',
                },
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 3,
                    upperBound: 3,
                  },
                  values: [
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      values: ['Firm X'],
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      values: ['Firm X & Co.'],
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      values: ['Firm X and Group'],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'isfirmXGroup',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
        },
      ],
      superTypes: [
        {
          path: 'apps::meta::pure::tests::model::simple::EntityWithAddress',
          type: 'CLASS',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'apps::meta::pure::tests::model::simple::FirmExtension',
    content: {
      _type: 'class',
      name: 'FirmExtension',
      package: 'apps::meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'establishedDate',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Date',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'employeesExt',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath:
                'apps::meta::pure::tests::model::simple::PersonExtension',
            },
          },
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'year',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                    },
                  ],
                  property: 'establishedDate',
                },
              ],
            },
          ],
          name: 'establishedYear',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'joinStrings',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                        },
                      ],
                      property: 'employeesExt',
                    },
                  ],
                  property: 'lastName',
                },
                {
                  _type: 'string',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  values: [','],
                },
              ],
            },
          ],
          name: 'allEmployeesLastName',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
      superTypes: [
        {
          path: 'apps::meta::pure::tests::model::simple::Firm',
          type: 'CLASS',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'apps::meta::pure::tests::model::simple::GeographicEntity',
    content: {
      _type: 'class',
      name: 'GeographicEntity',
      package: 'apps::meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'type',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath:
                'apps::meta::pure::tests::model::simple::GeographicEntityType',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'apps::meta::pure::tests::model::simple::Location',
    content: {
      _type: 'class',
      name: 'Location',
      package: 'apps::meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'place',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'censusdate',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Date',
            },
          },
        },
      ],
      superTypes: [
        {
          path: 'apps::meta::pure::tests::model::simple::GeographicEntity',
          type: 'CLASS',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'apps::meta::pure::tests::model::simple::Organization',
    content: {
      _type: 'class',
      name: 'Organization',
      package: 'apps::meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'func',
                  function: 'isEmpty',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                        },
                      ],
                      property: 'parent',
                    },
                  ],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'collection',
                      multiplicity: {
                        lowerBound: 0,
                        upperBound: 0,
                      },
                      values: [],
                    },
                  ],
                  parameters: [],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'concatenate',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'this',
                            },
                          ],
                          property: 'parent',
                        },
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'func',
                              function: 'toOne',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'this',
                                    },
                                  ],
                                  property: 'parent',
                                },
                              ],
                            },
                          ],
                          property: 'superOrganizations',
                        },
                      ],
                    },
                  ],
                  parameters: [],
                },
              ],
            },
          ],
          name: 'superOrganizations',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Organization',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'removeDuplicates',
              parameters: [
                {
                  _type: 'func',
                  function: 'concatenate',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                        },
                      ],
                      property: 'children',
                    },
                    {
                      _type: 'func',
                      function: 'map',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'this',
                            },
                          ],
                          property: 'children',
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'c',
                                },
                              ],
                              property: 'subOrganizations',
                            },
                          ],
                          parameters: [
                            {
                              _type: 'var',
                              name: 'c',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'subOrganizations',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Organization',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                        },
                      ],
                      property: 'children',
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'c',
                                },
                              ],
                              property: 'name',
                            },
                            {
                              _type: 'var',
                              name: 'name',
                            },
                          ],
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'c',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'child',
          parameters: [
            {
              _type: 'var',
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'String',
                },
              },
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'name',
            },
          ],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Organization',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'removeDuplicates',
              parameters: [
                {
                  _type: 'func',
                  function: 'concatenate',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                        },
                      ],
                      property: 'members',
                    },
                    {
                      _type: 'func',
                      function: 'map',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'this',
                            },
                          ],
                          property: 'subOrganizations',
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'o',
                                },
                              ],
                              property: 'members',
                            },
                          ],
                          parameters: [
                            {
                              _type: 'var',
                              name: 'o',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'allMembers',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Person',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'apps::meta::pure::tests::model::simple::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'apps::meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'firstName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'lastName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'otherNames',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'extraInformation',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'manager',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Person',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'age',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'nickName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'activeEmployment',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'plus',
              parameters: [
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 3,
                    upperBound: 3,
                  },
                  values: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                        },
                      ],
                      property: 'firstName',
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      values: [' '],
                    },
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                        },
                      ],
                      property: 'lastName',
                    },
                  ],
                },
              ],
            },
          ],
          name: 'name',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'plus',
              parameters: [
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 5,
                    upperBound: 5,
                  },
                  values: [
                    {
                      _type: 'var',
                      name: 'title',
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      values: [' '],
                    },
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                        },
                      ],
                      property: 'firstName',
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      values: [' '],
                    },
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                        },
                      ],
                      property: 'lastName',
                    },
                  ],
                },
              ],
            },
          ],
          name: 'nameWithTitle',
          parameters: [
            {
              _type: 'var',
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'String',
                },
              },
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'title',
            },
          ],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'func',
                  function: 'isEmpty',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'prefix',
                    },
                  ],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'if',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'isEmpty',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'suffixes',
                            },
                          ],
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'plus',
                              parameters: [
                                {
                                  _type: 'collection',
                                  multiplicity: {
                                    lowerBound: 3,
                                    upperBound: 3,
                                  },
                                  values: [
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'this',
                                        },
                                      ],
                                      property: 'firstName',
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      values: [' '],
                                    },
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'this',
                                        },
                                      ],
                                      property: 'lastName',
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                          parameters: [],
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'plus',
                              parameters: [
                                {
                                  _type: 'collection',
                                  multiplicity: {
                                    lowerBound: 5,
                                    upperBound: 5,
                                  },
                                  values: [
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'this',
                                        },
                                      ],
                                      property: 'firstName',
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      values: [' '],
                                    },
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'this',
                                        },
                                      ],
                                      property: 'lastName',
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      values: [', '],
                                    },
                                    {
                                      _type: 'func',
                                      function: 'joinStrings',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'suffixes',
                                        },
                                        {
                                          _type: 'string',
                                          multiplicity: {
                                            lowerBound: 1,
                                            upperBound: 1,
                                          },
                                          values: [', '],
                                        },
                                      ],
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                          parameters: [],
                        },
                      ],
                    },
                  ],
                  parameters: [],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'if',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'isEmpty',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'suffixes',
                            },
                          ],
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'plus',
                              parameters: [
                                {
                                  _type: 'collection',
                                  multiplicity: {
                                    lowerBound: 5,
                                    upperBound: 5,
                                  },
                                  values: [
                                    {
                                      _type: 'func',
                                      function: 'toOne',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'prefix',
                                        },
                                      ],
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      values: [' '],
                                    },
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'this',
                                        },
                                      ],
                                      property: 'firstName',
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      values: [' '],
                                    },
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'this',
                                        },
                                      ],
                                      property: 'lastName',
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                          parameters: [],
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'plus',
                              parameters: [
                                {
                                  _type: 'collection',
                                  multiplicity: {
                                    lowerBound: 7,
                                    upperBound: 7,
                                  },
                                  values: [
                                    {
                                      _type: 'func',
                                      function: 'toOne',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'prefix',
                                        },
                                      ],
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      values: [' '],
                                    },
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'this',
                                        },
                                      ],
                                      property: 'firstName',
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      values: [' '],
                                    },
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'this',
                                        },
                                      ],
                                      property: 'lastName',
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      values: [', '],
                                    },
                                    {
                                      _type: 'func',
                                      function: 'joinStrings',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'suffixes',
                                        },
                                        {
                                          _type: 'string',
                                          multiplicity: {
                                            lowerBound: 1,
                                            upperBound: 1,
                                          },
                                          values: [', '],
                                        },
                                      ],
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                          parameters: [],
                        },
                      ],
                    },
                  ],
                  parameters: [],
                },
              ],
            },
          ],
          name: 'nameWithPrefixAndSuffix',
          parameters: [
            {
              _type: 'var',
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'String',
                },
              },
              multiplicity: {
                lowerBound: 0,
                upperBound: 1,
              },
              name: 'prefix',
            },
            {
              _type: 'var',
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'String',
                },
              },
              multiplicity: {
                lowerBound: 0,
              },
              name: 'suffixes',
            },
          ],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'var',
                  name: 'lastNameFirst',
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'plus',
                      parameters: [
                        {
                          _type: 'collection',
                          multiplicity: {
                            lowerBound: 3,
                            upperBound: 3,
                          },
                          values: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                },
                              ],
                              property: 'lastName',
                            },
                            {
                              _type: 'string',
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                              values: [', '],
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                },
                              ],
                              property: 'firstName',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'plus',
                      parameters: [
                        {
                          _type: 'collection',
                          multiplicity: {
                            lowerBound: 3,
                            upperBound: 3,
                          },
                          values: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                },
                              ],
                              property: 'firstName',
                            },
                            {
                              _type: 'string',
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                              values: [' '],
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                },
                              ],
                              property: 'lastName',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [],
                },
              ],
            },
          ],
          name: 'fullName',
          parameters: [
            {
              _type: 'var',
              class: 'Boolean',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'lastNameFirst',
            },
          ],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'personNameParameter',
                    },
                  ],
                  property: 'lastNameFirst',
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'plus',
                      parameters: [
                        {
                          _type: 'collection',
                          multiplicity: {
                            lowerBound: 5,
                            upperBound: 5,
                          },
                          values: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'personNameParameter',
                                    },
                                  ],
                                  property: 'nested',
                                },
                              ],
                              property: 'prefix',
                            },
                            {
                              _type: 'string',
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                              values: [' '],
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                },
                              ],
                              property: 'lastName',
                            },
                            {
                              _type: 'string',
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                              values: [', '],
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                },
                              ],
                              property: 'firstName',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'plus',
                      parameters: [
                        {
                          _type: 'collection',
                          multiplicity: {
                            lowerBound: 3,
                            upperBound: 3,
                          },
                          values: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                },
                              ],
                              property: 'firstName',
                            },
                            {
                              _type: 'string',
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                              values: [' '],
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                },
                              ],
                              property: 'lastName',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [],
                },
              ],
            },
          ],
          name: 'parameterizedName',
          parameters: [
            {
              _type: 'var',
              class:
                'apps::meta::pure::tests::model::simple::PersonNameParameter',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'personNameParameter',
            },
          ],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'removeDuplicates',
              parameters: [
                {
                  _type: 'func',
                  function: 'concatenate',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                        },
                      ],
                      property: 'organizations',
                    },
                    {
                      _type: 'func',
                      function: 'map',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'this',
                            },
                          ],
                          property: 'organizations',
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'o',
                                },
                              ],
                              property: 'superOrganizations',
                            },
                          ],
                          parameters: [
                            {
                              _type: 'var',
                              name: 'o',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'allOrganizations',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Organization',
            },
          },
        },
        {
          body: [
            {
              _type: 'string',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              values: ['constant'],
            },
          ],
          name: 'constant',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'concatenate',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                    },
                  ],
                  property: 'address',
                },
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                        },
                      ],
                      property: 'firm',
                    },
                  ],
                  property: 'address',
                },
              ],
            },
          ],
          name: 'addresses',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Address',
            },
          },
        },
      ],
      superTypes: [
        {
          path: 'apps::meta::pure::tests::model::simple::EntityWithAddress',
          type: 'CLASS',
        },
        {
          path: 'apps::meta::pure::tests::model::simple::EntityWithLocations',
          type: 'CLASS',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'apps::meta::pure::tests::model::simple::PersonExtension',
    content: {
      _type: 'class',
      name: 'PersonExtension',
      package: 'apps::meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'birthdate',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Date',
            },
          },
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'year',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                    },
                  ],
                  property: 'birthdate',
                },
              ],
            },
          ],
          name: 'birthYear',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
      ],
      superTypes: [
        {
          path: 'apps::meta::pure::tests::model::simple::Person',
          type: 'CLASS',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'apps::meta::pure::tests::model::simple::PersonNameParameter',
    content: {
      _type: 'class',
      name: 'PersonNameParameter',
      package: 'apps::meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'lastNameFirst',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'nested',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath:
                'apps::meta::pure::tests::model::simple::PersonNameParameterNested',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'apps::meta::pure::tests::model::simple::PersonNameParameterNested',
    content: {
      _type: 'class',
      name: 'PersonNameParameterNested',
      package: 'apps::meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'prefix',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'apps::meta::pure::tests::model::simple::PlaceOfInterest',
    content: {
      _type: 'class',
      name: 'PlaceOfInterest',
      package: 'apps::meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'apps::meta::pure::tests::model::simple::Team',
    content: {
      _type: 'class',
      name: 'Team',
      package: 'apps::meta::pure::tests::model::simple',
      superTypes: [
        {
          path: 'apps::meta::pure::tests::model::simple::Organization',
          type: 'CLASS',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'apps::meta::relational::tests::mapping::union::extend::Address',
    content: {
      _type: 'class',
      name: 'Address',
      package: 'apps::meta::relational::tests::mapping::union::extend',
      superTypes: [
        {
          path: 'apps::meta::pure::tests::model::simple::Address',
          type: 'CLASS',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'apps::meta::relational::tests::mapping::union::extend::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'apps::meta::relational::tests::mapping::union::extend',
      superTypes: [
        {
          path: 'apps::meta::pure::tests::model::simple::Firm',
          type: 'CLASS',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'apps::meta::relational::tests::mapping::union::extend::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'apps::meta::relational::tests::mapping::union::extend',
      superTypes: [
        {
          path: 'apps::meta::pure::tests::model::simple::Person',
          type: 'CLASS',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'apps::meta::pure::tests::model::simple::AddressLocation',
    content: {
      _type: 'association',
      name: 'AddressLocation',
      package: 'apps::meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'location',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Location',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'addresses',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Address',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'apps::meta::pure::tests::model::simple::BridgeAsso1',
    content: {
      _type: 'association',
      name: 'BridgeAsso1',
      package: 'apps::meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'bridge',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Bridge',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'employees',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Person',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'apps::meta::pure::tests::model::simple::BridgeAsso2',
    content: {
      _type: 'association',
      name: 'BridgeAsso2',
      package: 'apps::meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'bridge',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Bridge',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'firm',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Firm',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'apps::meta::pure::tests::model::simple::Employment',
    content: {
      _type: 'association',
      name: 'Employment',
      package: 'apps::meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'firm',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Firm',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'employees',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Person',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'apps::meta::pure::tests::model::simple::FirmCEO',
    content: {
      _type: 'association',
      name: 'FirmCEO',
      package: 'apps::meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'ceoFirm',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Firm',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'ceo',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Person',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'apps::meta::pure::tests::model::simple::FirmOrganizations',
    content: {
      _type: 'association',
      name: 'FirmOrganizations',
      package: 'apps::meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'firm',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Firm',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'organizations',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Organization',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'apps::meta::pure::tests::model::simple::Membership',
    content: {
      _type: 'association',
      name: 'Membership',
      package: 'apps::meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'organizations',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Organization',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'members',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Person',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'apps::meta::pure::tests::model::simple::PlacesOfInterest',
    content: {
      _type: 'association',
      name: 'PlacesOfInterest',
      package: 'apps::meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'location',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Location',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'placeOfInterest',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath:
                'apps::meta::pure::tests::model::simple::PlaceOfInterest',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'apps::meta::pure::tests::model::simple::SubOrganization',
    content: {
      _type: 'association',
      name: 'SubOrganization',
      package: 'apps::meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'parent',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Organization',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'children',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'apps::meta::pure::tests::model::simple::Organization',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'apps::meta::relational::tests::dbInc',
    content: {
      _type: 'relational',
      filters: [
        {
          _type: 'filter',
          name: 'Firm X',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'LEGALNAME',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'firmTable',
                },
                tableAlias: 'firmTable',
              },
              {
                _type: 'literal',
                value: 'Firm X',
              },
            ],
          },
        },
      ],
      joins: [
        {
          name: 'personViewWithFirmTable',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'firmTable',
                },
                tableAlias: 'firmTable',
              },
              {
                _type: 'column',
                column: 'firmId',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'PersonViewWithDistinct',
                },
                tableAlias: 'PersonViewWithDistinct',
              },
            ],
          },
        },
        {
          name: 'PersonWithPersonView',
          operation: {
            _type: 'dynaFunc',
            funcName: 'and',
            parameters: [
              {
                _type: 'dynaFunc',
                funcName: 'equal',
                parameters: [
                  {
                    _type: 'column',
                    column: 'ID',
                    table: {
                      _type: 'Table',
                      database: 'apps::meta::relational::tests::dbInc',
                      mainTableDb: 'apps::meta::relational::tests::dbInc',
                      schema: 'default',
                      table: 'personTable',
                    },
                    tableAlias: 'personTable',
                  },
                  {
                    _type: 'column',
                    column: 'id',
                    table: {
                      _type: 'Table',
                      database: 'apps::meta::relational::tests::dbInc',
                      mainTableDb: 'apps::meta::relational::tests::dbInc',
                      schema: 'default',
                      table: 'personViewWithGroupBy',
                    },
                    tableAlias: 'personViewWithGroupBy',
                  },
                ],
              },
              {
                _type: 'dynaFunc',
                funcName: 'equal',
                parameters: [
                  {
                    _type: 'column',
                    column: 'AGE',
                    table: {
                      _type: 'Table',
                      database: 'apps::meta::relational::tests::dbInc',
                      mainTableDb: 'apps::meta::relational::tests::dbInc',
                      schema: 'default',
                      table: 'personTable',
                    },
                    tableAlias: 'personTable',
                  },
                  {
                    _type: 'column',
                    column: 'maxage',
                    table: {
                      _type: 'Table',
                      database: 'apps::meta::relational::tests::dbInc',
                      mainTableDb: 'apps::meta::relational::tests::dbInc',
                      schema: 'default',
                      table: 'personViewWithGroupBy',
                    },
                    tableAlias: 'personViewWithGroupBy',
                  },
                ],
              },
            ],
          },
        },
        {
          name: 'Address_Firm',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'addressTable',
                },
                tableAlias: 'addressTable',
              },
              {
                _type: 'column',
                column: 'ADDRESSID',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'firmTable',
                },
                tableAlias: 'firmTable',
              },
            ],
          },
        },
        {
          name: 'Address_Person',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'addressTable',
                },
                tableAlias: 'addressTable',
              },
              {
                _type: 'column',
                column: 'ADDRESSID',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            ],
          },
        },
        {
          name: 'Firm_Ceo',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'CEOID',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'firmTable',
                },
                tableAlias: 'firmTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            ],
          },
        },
        {
          name: 'Firm_Person',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'firmTable',
                },
                tableAlias: 'firmTable',
              },
              {
                _type: 'column',
                column: 'FIRMID',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            ],
          },
        },
        {
          name: 'FirmExtension_PersonExtension',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'firmId',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'firmExtensionTable',
                },
                tableAlias: 'firmExtensionTable',
              },
              {
                _type: 'column',
                column: 'FIRMID',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'PersonTableExtension',
                },
                tableAlias: 'PersonTableExtension',
              },
            ],
          },
        },
        {
          name: 'Person_Location',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
              {
                _type: 'column',
                column: 'PERSONID',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'locationTable',
                },
                tableAlias: 'locationTable',
              },
            ],
          },
        },
        {
          name: 'Person_Manager',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'MANAGERID',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: '{target}',
                },
                tableAlias: '{target}',
              },
            ],
          },
        },
        {
          name: 'location_PlaceOfInterest',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'locationTable',
                },
                tableAlias: 'locationTable',
              },
              {
                _type: 'column',
                column: 'locationID',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'placeOfInterestTable',
                },
                tableAlias: 'placeOfInterestTable',
              },
            ],
          },
        },
        {
          name: 'Person_OtherFirm',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'FIRMID',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'otherFirmTable',
                },
                tableAlias: 'otherFirmTable',
              },
            ],
          },
        },
      ],
      name: 'dbInc',
      package: 'apps::meta::relational::tests',
      schemas: [
        {
          name: 'productSchema',
          tables: [
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'NAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'productTable',
              primaryKey: ['ID'],
            },
          ],
          views: [],
        },
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FIRSTNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'LASTNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'AGE',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'ADDRESSID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FIRMID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'MANAGERID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'personTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FIRSTNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'LASTNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'AGE',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'ADDRESSID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FIRMID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'MANAGERID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'birthDate',
                  nullable: true,
                  type: {
                    _type: 'Date',
                  },
                },
              ],
              name: 'PersonTableExtension',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FIRSTNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'LASTNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'AGE',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'ADDRESSID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FIRMID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'MANAGERID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'differentPersonTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'LEGALNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'ADDRESSID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'CEOID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'firmTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'firmId',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'legalName',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'establishedDate',
                  nullable: true,
                  type: {
                    _type: 'Date',
                  },
                },
              ],
              name: 'firmExtensionTable',
              primaryKey: ['firmId'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'LEGALNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'ADDRESSID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'otherFirmTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'TYPE',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'NAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'STREET',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 100,
                  },
                },
                {
                  name: 'COMMENTS',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 100,
                  },
                },
              ],
              name: 'addressTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'PERSONID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'PLACE',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'date',
                  nullable: true,
                  type: {
                    _type: 'Date',
                  },
                },
              ],
              name: 'locationTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'locationID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'NAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'placeOfInterestTable',
              primaryKey: ['ID', 'locationID'],
            },
          ],
          views: [
            {
              columnMappings: [
                {
                  name: 'PERSON_ID',
                  operation: {
                    _type: 'column',
                    column: 'ID',
                    table: {
                      _type: 'Table',
                      database: 'apps::meta::relational::tests::dbInc',
                      mainTableDb: 'apps::meta::relational::tests::dbInc',
                      schema: 'default',
                      table: 'personTable',
                    },
                    tableAlias: 'personTable',
                  },
                },
                {
                  name: 'lastName',
                  operation: {
                    _type: 'column',
                    column: 'LASTNAME',
                    table: {
                      _type: 'Table',
                      database: 'apps::meta::relational::tests::dbInc',
                      mainTableDb: 'apps::meta::relational::tests::dbInc',
                      schema: 'default',
                      table: 'personTable',
                    },
                    tableAlias: 'personTable',
                  },
                },
                {
                  name: 'firm_name',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'apps::meta::relational::tests::dbInc',
                        name: 'Firm_Person',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'LEGALNAME',
                      table: {
                        _type: 'Table',
                        database: 'apps::meta::relational::tests::dbInc',
                        mainTableDb: 'apps::meta::relational::tests::dbInc',
                        schema: 'default',
                        table: 'firmTable',
                      },
                      tableAlias: 'firmTable',
                    },
                  },
                },
              ],
              distinct: false,
              groupBy: [],
              name: 'PersonFirmView',
              primaryKey: ['PERSON_ID'],
            },
            {
              columnMappings: [
                {
                  name: 'id',
                  operation: {
                    _type: 'column',
                    column: 'ID',
                    table: {
                      _type: 'Table',
                      database: 'apps::meta::relational::tests::dbInc',
                      mainTableDb: 'apps::meta::relational::tests::dbInc',
                      schema: 'default',
                      table: 'personTable',
                    },
                    tableAlias: 'personTable',
                  },
                },
                {
                  name: 'maxage',
                  operation: {
                    _type: 'dynaFunc',
                    funcName: 'max',
                    parameters: [
                      {
                        _type: 'column',
                        column: 'AGE',
                        table: {
                          _type: 'Table',
                          database: 'apps::meta::relational::tests::dbInc',
                          mainTableDb: 'apps::meta::relational::tests::dbInc',
                          schema: 'default',
                          table: 'personTable',
                        },
                        tableAlias: 'personTable',
                      },
                    ],
                  },
                },
              ],
              distinct: false,
              groupBy: [
                {
                  _type: 'column',
                  column: 'ID',
                  table: {
                    _type: 'Table',
                    database: 'apps::meta::relational::tests::dbInc',
                    mainTableDb: 'apps::meta::relational::tests::dbInc',
                    schema: 'default',
                    table: 'personTable',
                  },
                  tableAlias: 'personTable',
                },
              ],
              name: 'personViewWithGroupBy',
              primaryKey: ['id'],
            },
            {
              columnMappings: [
                {
                  name: 'id',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'apps::meta::relational::tests::dbInc',
                        name: 'PersonWithPersonView',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'ID',
                      table: {
                        _type: 'Table',
                        database: 'apps::meta::relational::tests::dbInc',
                        mainTableDb: 'apps::meta::relational::tests::dbInc',
                        schema: 'default',
                        table: 'personTable',
                      },
                      tableAlias: 'personTable',
                    },
                  },
                },
                {
                  name: 'firstName',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'apps::meta::relational::tests::dbInc',
                        name: 'PersonWithPersonView',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'FIRSTNAME',
                      table: {
                        _type: 'Table',
                        database: 'apps::meta::relational::tests::dbInc',
                        mainTableDb: 'apps::meta::relational::tests::dbInc',
                        schema: 'default',
                        table: 'personTable',
                      },
                      tableAlias: 'personTable',
                    },
                  },
                },
                {
                  name: 'lastName',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'apps::meta::relational::tests::dbInc',
                        name: 'PersonWithPersonView',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'LASTNAME',
                      table: {
                        _type: 'Table',
                        database: 'apps::meta::relational::tests::dbInc',
                        mainTableDb: 'apps::meta::relational::tests::dbInc',
                        schema: 'default',
                        table: 'personTable',
                      },
                      tableAlias: 'personTable',
                    },
                  },
                },
                {
                  name: 'firmId',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'apps::meta::relational::tests::dbInc',
                        name: 'PersonWithPersonView',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'FIRMID',
                      table: {
                        _type: 'Table',
                        database: 'apps::meta::relational::tests::dbInc',
                        mainTableDb: 'apps::meta::relational::tests::dbInc',
                        schema: 'default',
                        table: 'personTable',
                      },
                      tableAlias: 'personTable',
                    },
                  },
                },
              ],
              distinct: true,
              groupBy: [],
              name: 'PersonViewWithDistinct',
              primaryKey: ['id'],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'apps::meta::relational::tests::simpleRelationalMappingInc',
    content: {
      _type: 'mapping',
      associationMappings: [
        {
          _type: 'relational',
          association: {
            path: 'apps::meta::pure::tests::model::simple::PlacesOfInterest',
            type: 'ASSOCIATION',
          },
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                property: 'location',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'apps::meta::relational::tests::dbInc',
                    name: 'location_PlaceOfInterest',
                  },
                ],
              },
              source: 'apps_meta_pure_tests_model_simple_PlaceOfInterest',
              target: 'apps_meta_pure_tests_model_simple_Location',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                property: 'placeOfInterest',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'apps::meta::relational::tests::dbInc',
                    name: 'location_PlaceOfInterest',
                  },
                ],
              },
              source: 'apps_meta_pure_tests_model_simple_Location',
              target: 'apps_meta_pure_tests_model_simple_PlaceOfInterest',
            },
          ],
          stores: [],
        },
      ],
      classMappings: [
        {
          _type: 'relational',
          class: 'apps::meta::pure::tests::model::simple::Person',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'apps::meta::relational::tests::dbInc',
            mainTableDb: 'apps::meta::relational::tests::dbInc',
            schema: 'default',
            table: 'personTable',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'ID',
              table: {
                _type: 'Table',
                database: 'apps::meta::relational::tests::dbInc',
                mainTableDb: 'apps::meta::relational::tests::dbInc',
                schema: 'default',
                table: 'personTable',
              },
              tableAlias: '',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'apps::meta::pure::tests::model::simple::Person',
                property: 'firstName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'FIRSTNAME',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'apps::meta::pure::tests::model::simple::Person',
                property: 'age',
              },
              relationalOperation: {
                _type: 'column',
                column: 'AGE',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'apps::meta::pure::tests::model::simple::Person',
                property: 'lastName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'LASTNAME',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'apps::meta::pure::tests::model::simple::Person',
                property: 'firm',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'apps::meta::relational::tests::dbInc',
                    name: 'Firm_Person',
                  },
                ],
              },
              target: 'apps_meta_pure_tests_model_simple_Firm',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class:
                  'apps::meta::pure::tests::model::simple::EntityWithAddress',
                property: 'address',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'apps::meta::relational::tests::dbInc',
                    name: 'Address_Person',
                  },
                ],
              },
              target: 'apps_meta_pure_tests_model_simple_Address',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class:
                  'apps::meta::pure::tests::model::simple::EntityWithLocations',
                property: 'locations',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'apps::meta::relational::tests::dbInc',
                    name: 'Person_Location',
                  },
                ],
              },
              target: 'apps_meta_pure_tests_model_simple_Location',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'apps::meta::pure::tests::model::simple::Person',
                property: 'manager',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'apps::meta::relational::tests::dbInc',
                    name: 'Person_Manager',
                  },
                ],
              },
              target: 'apps_meta_pure_tests_model_simple_Person',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'apps::meta::pure::tests::model::simple::Firm',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'apps::meta::relational::tests::dbInc',
            mainTableDb: 'apps::meta::relational::tests::dbInc',
            schema: 'default',
            table: 'firmTable',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'ID',
              table: {
                _type: 'Table',
                database: 'apps::meta::relational::tests::dbInc',
                mainTableDb: 'apps::meta::relational::tests::dbInc',
                schema: 'default',
                table: 'firmTable',
              },
              tableAlias: '',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'apps::meta::pure::tests::model::simple::Firm',
                property: 'legalName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'LEGALNAME',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'firmTable',
                },
                tableAlias: 'firmTable',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'apps::meta::pure::tests::model::simple::Firm',
                property: 'employees',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'apps::meta::relational::tests::dbInc',
                    name: 'Firm_Person',
                  },
                ],
              },
              target: 'apps_meta_pure_tests_model_simple_Person',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class:
                  'apps::meta::pure::tests::model::simple::EntityWithAddress',
                property: 'address',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'apps::meta::relational::tests::dbInc',
                    name: 'Address_Firm',
                  },
                ],
              },
              target: 'apps_meta_pure_tests_model_simple_Address',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'apps::meta::pure::tests::model::simple::FirmExtension',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'apps::meta::relational::tests::dbInc',
            mainTableDb: 'apps::meta::relational::tests::dbInc',
            schema: 'default',
            table: 'firmExtensionTable',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'firmId',
              table: {
                _type: 'Table',
                database: 'apps::meta::relational::tests::dbInc',
                mainTableDb: 'apps::meta::relational::tests::dbInc',
                schema: 'default',
                table: 'firmExtensionTable',
              },
              tableAlias: '',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'apps::meta::pure::tests::model::simple::Firm',
                property: 'legalName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'legalName',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'firmExtensionTable',
                },
                tableAlias: 'firmExtensionTable',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'apps::meta::pure::tests::model::simple::FirmExtension',
                property: 'establishedDate',
              },
              relationalOperation: {
                _type: 'column',
                column: 'establishedDate',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'firmExtensionTable',
                },
                tableAlias: 'firmExtensionTable',
              },
            },
            {
              _type: 'embeddedPropertyMapping',
              classMapping: {
                _type: 'embedded',
                primaryKey: [],
                propertyMappings: [
                  {
                    _type: 'relationalPropertyMapping',
                    property: {
                      property: 'birthdate',
                    },
                    relationalOperation: {
                      _type: 'elemtWithJoins',
                      joins: [
                        {
                          db: 'apps::meta::relational::tests::dbInc',
                          name: 'FirmExtension_PersonExtension',
                        },
                      ],
                      relationalElement: {
                        _type: 'column',
                        column: 'birthDate',
                        table: {
                          _type: 'Table',
                          database: 'apps::meta::relational::tests::dbInc',
                          mainTableDb: 'apps::meta::relational::tests::dbInc',
                          schema: 'default',
                          table: 'PersonTableExtension',
                        },
                        tableAlias: 'PersonTableExtension',
                      },
                    },
                  },
                ],
                root: false,
              },
              property: {
                class: 'apps::meta::pure::tests::model::simple::FirmExtension',
                property: 'employeesExt',
              },
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'apps::meta::pure::tests::model::simple::Address',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'apps::meta::relational::tests::dbInc',
            mainTableDb: 'apps::meta::relational::tests::dbInc',
            schema: 'default',
            table: 'addressTable',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'ID',
              table: {
                _type: 'Table',
                database: 'apps::meta::relational::tests::dbInc',
                mainTableDb: 'apps::meta::relational::tests::dbInc',
                schema: 'default',
                table: 'addressTable',
              },
              tableAlias: '',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'apps::meta::pure::tests::model::simple::Address',
                property: 'name',
              },
              relationalOperation: {
                _type: 'column',
                column: 'NAME',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'addressTable',
                },
                tableAlias: 'addressTable',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'apps::meta::pure::tests::model::simple::Address',
                property: 'street',
              },
              relationalOperation: {
                _type: 'column',
                column: 'STREET',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'addressTable',
                },
                tableAlias: 'addressTable',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              enumMappingId: 'GE',
              property: {
                class:
                  'apps::meta::pure::tests::model::simple::GeographicEntity',
                property: 'type',
              },
              relationalOperation: {
                _type: 'column',
                column: 'TYPE',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'addressTable',
                },
                tableAlias: 'addressTable',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'apps::meta::pure::tests::model::simple::Address',
                property: 'comments',
              },
              relationalOperation: {
                _type: 'column',
                column: 'COMMENTS',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'addressTable',
                },
                tableAlias: 'addressTable',
              },
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'apps::meta::pure::tests::model::simple::Location',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'apps::meta::relational::tests::dbInc',
            mainTableDb: 'apps::meta::relational::tests::dbInc',
            schema: 'default',
            table: 'locationTable',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'ID',
              table: {
                _type: 'Table',
                database: 'apps::meta::relational::tests::dbInc',
                mainTableDb: 'apps::meta::relational::tests::dbInc',
                schema: 'default',
                table: 'locationTable',
              },
              tableAlias: '',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'apps::meta::pure::tests::model::simple::Location',
                property: 'place',
              },
              relationalOperation: {
                _type: 'column',
                column: 'PLACE',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'locationTable',
                },
                tableAlias: 'locationTable',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'apps::meta::pure::tests::model::simple::Location',
                property: 'censusdate',
              },
              relationalOperation: {
                _type: 'column',
                column: 'date',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'locationTable',
                },
                tableAlias: 'locationTable',
              },
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'apps::meta::pure::tests::model::simple::PlaceOfInterest',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'apps::meta::relational::tests::dbInc',
            mainTableDb: 'apps::meta::relational::tests::dbInc',
            schema: 'default',
            table: 'placeOfInterestTable',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'ID',
              table: {
                _type: 'Table',
                database: 'apps::meta::relational::tests::dbInc',
                mainTableDb: 'apps::meta::relational::tests::dbInc',
                schema: 'default',
                table: 'placeOfInterestTable',
              },
              tableAlias: '',
            },
            {
              _type: 'column',
              column: 'locationID',
              table: {
                _type: 'Table',
                database: 'apps::meta::relational::tests::dbInc',
                mainTableDb: 'apps::meta::relational::tests::dbInc',
                schema: 'default',
                table: 'placeOfInterestTable',
              },
              tableAlias: '',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class:
                  'apps::meta::pure::tests::model::simple::PlaceOfInterest',
                property: 'name',
              },
              relationalOperation: {
                _type: 'column',
                column: 'NAME',
                table: {
                  _type: 'Table',
                  database: 'apps::meta::relational::tests::dbInc',
                  mainTableDb: 'apps::meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'placeOfInterestTable',
                },
                tableAlias: 'placeOfInterestTable',
              },
            },
          ],
          root: false,
        },
      ],
      enumerationMappings: [
        {
          enumValueMappings: [
            {
              enumValue: 'CITY',
              sourceValues: [
                {
                  _type: 'integerSourceValue',
                  value: 1,
                },
              ],
            },
          ],
          enumeration: {
            path: 'apps::meta::pure::tests::model::simple::GeographicEntityType',
            type: 'ENUMERATION',
          },
          id: 'GE',
        },
      ],
      includedMappings: [],
      name: 'simpleRelationalMappingInc',
      package: 'apps::meta::relational::tests',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
];

export const TEST_DATA__XStoreAssociationMapping = [
  {
    path: 'test::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'id',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'legalName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::Firm_Person',
    content: {
      _type: 'association',
      name: 'Firm_Person',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'employer',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'test::Firm',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'employees',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'test::Person',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'test::crossPropertyMappingWithLocalProperties',
    content: {
      _type: 'mapping',
      associationMappings: [
        {
          _type: 'xStore',
          association: {
            path: 'test::Firm_Person',
            type: 'ASSOCIATION',
          },
          propertyMappings: [
            {
              _type: 'xStorePropertyMapping',
              crossExpression: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'func',
                    function: 'equal',
                    parameters: [
                      {
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'this',
                          },
                        ],
                        property: 'name',
                      },
                      {
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'that',
                          },
                        ],
                        property: 'legalName',
                      },
                    ],
                  },
                ],
                parameters: [],
              },
              property: {
                class: 'test::Person',
                property: 'employer',
              },
              source: 'p',
              target: 'f',
            },
          ],
          stores: [],
        },
      ],
      classMappings: [
        {
          _type: 'pureInstance',
          class: 'test::Person',
          id: 'p',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'test::Person',
                property: 'name',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                    ],
                    property: 'name',
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: false,
          srcClass: 'test::Person',
        },
        {
          _type: 'pureInstance',
          class: 'test::Firm',
          id: 'f',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'test::Firm',
                property: 'id',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                    ],
                    property: 'id',
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'test::Firm',
                property: 'legalName',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                    ],
                    property: 'legalName',
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: false,
          srcClass: 'test::Firm',
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'crossPropertyMappingWithLocalProperties',
      package: 'test',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
];

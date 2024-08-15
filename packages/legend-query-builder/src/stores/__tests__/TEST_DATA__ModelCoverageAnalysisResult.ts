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

export const TEST_DATA__ModelCoverageAnalysisResult_ComplexM2M = {
  mappedEntities: [
    {
      path: 'model::target::NFirm',
      properties: [
        {
          _type: 'entity',
          entityPath: 'model::target::NPerson',
          name: 'nEmployees',
        },
        {
          _type: 'enum',
          enumPath: 'model::target::IncType',
          name: 'incType',
        },
        {
          _type: 'MappedProperty',
          name: 'name',
        },
        {
          _type: 'entity',
          entityPath: 'model::target::NPerson',
          name: 'firstEmployee',
        },
        {
          _type: 'MappedProperty',
          name: 'myName',
        },
      ],
    },
    {
      path: 'model::target::NPerson',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'fullName',
        },
      ],
    },
  ],
};

export const TEST_DATA__ModelCoverageAnalysisResult_COVIDDataSimple = {
  mappedEntities: [
    {
      path: 'domain::Demographics',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'state',
        },
        {
          _type: 'MappedProperty',
          name: 'fips',
        },
      ],
    },
    {
      path: 'domain::COVIDData',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'caseType',
        },
        {
          _type: 'MappedProperty',
          name: 'lastReportedFlag',
        },
        {
          _type: 'entity',
          entityPath: 'domain::Demographics',
          name: 'demographics',
        },
        {
          _type: 'MappedProperty',
          name: 'id',
        },
        {
          _type: 'MappedProperty',
          name: 'date',
        },
        {
          _type: 'MappedProperty',
          name: 'fips',
        },
        {
          _type: 'MappedProperty',
          name: 'cases',
        },
      ],
    },
  ],
};

export const TEST_DATA__ModelCoverageAnalysisResult_M2MAutoMapped = {
  mappedEntities: [
    {
      path: 'test::autoMapping::Firm',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'name',
        },
        {
          _type: 'MappedProperty',
          name: 'location',
        },
      ],
    },
  ],
};

export const TEST_DATA__ModelCoverageAnalysisResult_RelationalInline = {
  mappedEntities: [
    {
      path: 'Oct::models::Firm',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'name',
        },
        {
          _type: 'MappedProperty',
          name: 'id',
        },
      ],
    },
    {
      path: 'Oct::models::Person',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'fName',
        },
        {
          _type: 'entity',
          entityPath: 'Oct::models::Firm',
          name: 'firm',
        },
      ],
    },
  ],
};

export const TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalInheritance =
  {
    mappedEntities: [
      {
        path: 'model::Firm',
        properties: [
          {
            _type: 'entity',
            entityPath: 'model::Person',
            name: 'employees',
          },
          {
            _type: 'MappedProperty',
            name: 'legalName',
          },
          {
            _type: 'MappedProperty',
            name: 'employeeSize',
          },
        ],
      },
      {
        path: 'model::LegalEntity',
        properties: [
          {
            _type: 'MappedProperty',
            name: 'legalName',
          },
        ],
      },
      {
        path: 'model::Person',
        properties: [
          {
            _type: 'MappedProperty',
            name: 'lastName',
          },
          {
            _type: 'MappedProperty',
            name: 'firstName',
          },
        ],
      },
    ],
  };

export const TEST_DATA__ModelCoverageAnalysisResult_AssociationMapping = {
  mappedEntities: [
    {
      path: 'model::Person',
      properties: [
        {
          _type: 'entity',
          entityPath: 'model::Firm',
          name: 'firm',
        },
        {
          _type: 'MappedProperty',
          name: 'lastName',
        },
        {
          _type: 'MappedProperty',
          name: 'firstName',
        },
      ],
    },
    {
      path: 'model::Firm',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'name',
        },
        {
          _type: 'entity',
          entityPath: 'model::Person',
          name: 'employee',
        },
      ],
    },
  ],
};

export const TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational = {
  mappedEntities: [
    {
      path: 'model::pure::tests::model::simple::PersonExtension',
      properties: [
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Person',
          name: 'manager',
        },
        {
          _type: 'MappedProperty',
          name: 'birthdate',
        },
        {
          _type: 'MappedProperty',
          name: 'firstName',
        },
        {
          _type: 'MappedProperty',
          name: 'lastName',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Location',
          name: 'locations',
        },
        {
          _type: 'MappedProperty',
          name: 'age',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Firm',
          name: 'firm',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Address',
          name: 'address',
        },
        {
          _type: 'MappedProperty',
          name: 'birthYear',
        },
        {
          _type: 'MappedProperty',
          name: 'name',
        },
        {
          _type: 'MappedProperty',
          name: 'nameWithTitle',
        },
        {
          _type: 'MappedProperty',
          name: 'nameWithPrefixAndSuffix',
        },
        {
          _type: 'MappedProperty',
          name: 'fullName',
        },
        {
          _type: 'MappedProperty',
          name: 'constant',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Address',
          name: 'addresses',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Location',
          name: 'locationsByType',
        },
      ],
    },
    {
      path: 'model::pure::tests::model::simple::FirmExtension',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'legalName',
        },
        {
          _type: 'MappedProperty',
          name: 'establishedDate',
        },
        {
          _type: 'entity',
          entityPath:
            'model_pure_tests_model_simple_FirmExtension_employeesExt',
          name: 'employeesExt',
        },
        {
          _type: 'MappedProperty',
          name: 'establishedYear',
        },
        {
          _type: 'MappedProperty',
          name: 'allEmployeesLastName',
        },
        {
          _type: 'MappedProperty',
          name: 'averageEmployeesAge',
        },
        {
          _type: 'MappedProperty',
          name: 'sumEmployeesAge',
        },
        {
          _type: 'MappedProperty',
          name: 'maxEmployeesAge',
        },
        {
          _type: 'MappedProperty',
          name: 'nameAndAddress',
        },
        {
          _type: 'MappedProperty',
          name: 'isfirmX',
        },
        {
          _type: 'MappedProperty',
          name: 'nameAndMaskedAddress',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Person',
          name: 'employeeByLastName',
        },
        {
          _type: 'MappedProperty',
          name: 'employeeByLastNameFirstName',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Person',
          name: 'employeeByLastNameWhereVarIsFirstEqualArg',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Person',
          name: 'employeesByAge',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Person',
          name: 'employeesByCityOrManager',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Person',
          name: 'employeesByCityOrManagerAndLastName',
        },
        {
          _type: 'MappedProperty',
          name: 'hasEmployeeBelowAge',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Person',
          name: 'employeeWithFirmAddressName',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Person',
          name: 'employeeWithAddressName',
        },
        {
          _type: 'MappedProperty',
          name: 'employeesWithAddressNameSorted',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Address',
          name: 'employeeAddressesWithFirmAddressName',
        },
        {
          _type: 'MappedProperty',
          name: 'isfirmXGroup',
        },
      ],
    },
    {
      name: 'model::pure::tests::model::simple::TradeEvent',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'eventType',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Person',
          name: 'initiator',
        },
        {
          _type: 'MappedProperty',
          name: 'traderAddress',
        },
        {
          _type: 'MappedProperty',
          name: 'date',
        },
      ],
    },
    {
      path: 'model::pure::tests::model::simple::Synonym',
      properties: [
        {
          _type: 'enum',
          enumPath: 'model::pure::tests::model::simple::ProductSynonymType',
          name: 'type',
        },
        {
          _type: 'MappedProperty',
          name: 'name',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Product',
          name: 'product',
        },
        {
          _type: 'MappedProperty',
          name: 'typeAsString',
        },
      ],
    },
    {
      path: 'model::pure::tests::model::simple::Interaction',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'time',
        },
        {
          _type: 'MappedProperty',
          name: 'id',
        },
        {
          _type: 'MappedProperty',
          name: 'longestInteractionBetweenSourceAndTarget',
        },
        {
          _type: 'MappedProperty',
          name: 'active',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Person',
          name: 'target',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Person',
          name: 'source',
        },
      ],
    },
    {
      path: 'model::pure::tests::model::simple::Person',
      properties: [
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Person',
          name: 'manager',
        },
        {
          _type: 'MappedProperty',
          name: 'firstName',
        },
        {
          _type: 'MappedProperty',
          name: 'lastName',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Location',
          name: 'locations',
        },
        {
          _type: 'MappedProperty',
          name: 'age',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Firm',
          name: 'firm',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Address',
          name: 'address',
        },
        {
          _type: 'MappedProperty',
          name: 'name',
        },
        {
          _type: 'MappedProperty',
          name: 'nameWithTitle',
        },
        {
          _type: 'MappedProperty',
          name: 'nameWithPrefixAndSuffix',
        },
        {
          _type: 'MappedProperty',
          name: 'fullName',
        },
        {
          _type: 'MappedProperty',
          name: 'constant',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Address',
          name: 'addresses',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Location',
          name: 'locationsByType',
        },
      ],
    },
    {
      name: 'model::pure::tests::model::simple::Order',
      properties: [
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Person',
          name: 'pnlContact',
        },
        {
          _type: 'MappedProperty',
          name: 'settlementDateTime',
        },
        {
          _type: 'MappedProperty',
          name: 'id',
        },
        {
          _type: 'MappedProperty',
          name: 'date',
        },
        {
          _type: 'MappedProperty',
          name: 'quantity',
        },
        {
          _type: 'MappedProperty',
          name: 'zeroPnl',
        },
        {
          _type: 'MappedProperty',
          name: 'pnl',
        },
      ],
    },
    {
      path: 'model::pure::tests::model::simple::Trade',
      properties: [
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Account',
          name: 'account',
        },
        {
          _type: 'MappedProperty',
          name: 'settlementDateTime',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Product',
          name: 'product',
        },
        {
          _type: 'MappedProperty',
          name: 'quantity',
        },
        {
          _type: 'MappedProperty',
          name: 'id',
        },
        {
          _type: 'MappedProperty',
          name: 'date',
        },
        {
          _type: 'MappedProperty',
          name: 'latestEventDate',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::TradeEvent',
          name: 'events',
        },
        {
          _type: 'MappedProperty',
          name: 'productIdentifier',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Product',
          name: 'filterProductByNameAndTradeDate',
        },
        {
          _type: 'MappedProperty',
          name: 'classificationType',
        },
        {
          _type: 'MappedProperty',
          name: 'productDescription',
        },
        {
          _type: 'MappedProperty',
          name: 'accountDescription',
        },
        {
          _type: 'MappedProperty',
          name: 'productIdentifierWithNull',
        },
        {
          _type: 'MappedProperty',
          name: 'customerQuantity',
        },
        {
          _type: 'MappedProperty',
          name: 'daysToLastEvent',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::TradeEvent',
          name: 'latestEvent',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::TradeEvent',
          name: 'eventsByDate',
        },
        {
          _type: 'MappedProperty',
          name: 'tradeDateEventType',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::TradeEvent',
          name: 'tradeDateEvent',
        },
        {
          _type: 'MappedProperty',
          name: 'tradeDateEventTypeInlined',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Person',
          name: 'initiator',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Person',
          name: 'initiatorInlined',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Person',
          name: 'initiatorInlinedByProductName',
        },
      ],
    },
    {
      name: 'model::pure::tests::model::simple::Location',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'censusdate',
        },
        {
          _type: 'MappedProperty',
          name: 'place',
        },
      ],
    },
    {
      path: 'model::pure::tests::model::simple::PlaceOfInterest',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'name',
        },
      ],
    },
    {
      path: 'model::pure::tests::model::simple::Firm',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'legalName',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Person',
          name: 'employees',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Address',
          name: 'address',
        },
        {
          _type: 'MappedProperty',
          name: 'averageEmployeesAge',
        },
        {
          _type: 'MappedProperty',
          name: 'sumEmployeesAge',
        },
        {
          _type: 'MappedProperty',
          name: 'maxEmployeesAge',
        },
        {
          _type: 'MappedProperty',
          name: 'nameAndAddress',
        },
        {
          _type: 'MappedProperty',
          name: 'isfirmX',
        },
        {
          _type: 'MappedProperty',
          name: 'nameAndMaskedAddress',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Person',
          name: 'employeeByLastName',
        },
        {
          _type: 'MappedProperty',
          name: 'employeeByLastNameFirstName',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Person',
          name: 'employeeByLastNameWhereVarIsFirstEqualArg',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Person',
          name: 'employeesByAge',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Person',
          name: 'employeesByCityOrManager',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Person',
          name: 'employeesByCityOrManagerAndLastName',
        },
        {
          _type: 'MappedProperty',
          name: 'hasEmployeeBelowAge',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Person',
          name: 'employeeWithFirmAddressName',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Person',
          name: 'employeeWithAddressName',
        },
        {
          _type: 'MappedProperty',
          name: 'employeesWithAddressNameSorted',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Address',
          name: 'employeeAddressesWithFirmAddressName',
        },
        {
          _type: 'MappedProperty',
          name: 'isfirmXGroup',
        },
      ],
    },
    {
      path: 'model::pure::tests::model::simple::OrderPnl',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'supportContactName',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Order',
          name: 'order',
        },
        {
          _type: 'MappedProperty',
          name: 'pnl',
        },
      ],
    },
    {
      path: 'model::pure::tests::model::simple::Product',
      properties: [
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Synonym',
          name: 'synonyms',
        },
        {
          _type: 'MappedProperty',
          name: 'name',
        },
        {
          _type: 'MappedProperty',
          name: 'cusip',
        },
        {
          _type: 'MappedProperty',
          name: 'isin',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Synonym',
          name: 'cusipSynonym',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Synonym',
          name: 'isinSynonym',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Synonym',
          name: 'synonymByType',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Synonym',
          name: 'synonymsByTypes',
        },
      ],
    },
    {
      path: 'model::pure::tests::model::simple::AccountPnl',
      properties: [
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Account',
          name: 'account',
        },
        {
          _type: 'MappedProperty',
          name: 'pnl',
        },
      ],
    },
    {
      path: 'model::pure::tests::model::simple::Address',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'name',
        },
        {
          _type: 'MappedProperty',
          name: 'street',
        },
        {
          _type: 'MappedProperty',
          name: 'comments',
        },
        {
          _type: 'enum',
          enumPath: 'model::pure::tests::model::simple::GeographicEntityType',
          name: 'type',
        },
        {
          _type: 'MappedProperty',
          name: 'description',
        },
      ],
    },
    {
      path: 'model::pure::tests::model::simple::Account',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'createDate',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Trade',
          name: 'trades',
        },
        {
          _type: 'MappedProperty',
          name: 'name',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Order',
          name: 'orders',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::AccountPnl',
          name: 'accountPnl',
        },
        {
          _type: 'MappedProperty',
          name: 'accountCategory',
        },
        {
          _type: 'MappedProperty',
          name: 'isTypeA',
        },
      ],
    },
    {
      path: 'model_pure_tests_model_simple_FirmExtension_employeesExt',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'birthdate',
        },
        {
          _type: 'MappedProperty',
          name: 'birthYear',
        },
        {
          _type: 'MappedProperty',
          name: 'name',
        },
        {
          _type: 'MappedProperty',
          name: 'nameWithTitle',
        },
        {
          _type: 'MappedProperty',
          name: 'nameWithPrefixAndSuffix',
        },
        {
          _type: 'MappedProperty',
          name: 'fullName',
        },
        {
          _type: 'MappedProperty',
          name: 'constant',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Address',
          name: 'addresses',
        },
        {
          _type: 'entity',
          entityPath: 'model::pure::tests::model::simple::Location',
          name: 'locationsByType',
        },
      ],
    },
  ],
};

export const TEST_DATA__ModelCoverageAnalysisResult_SimpleSubtype = {
  mappedEntities: [
    {
      path: 'model::Colony',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'id',
        },
        {
          _type: 'MappedProperty',
          name: 'streetName',
        },
        {
          _type: 'MappedProperty',
          name: 'zipcode',
        },
      ],
    },
    {
      path: 'model::Firm',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'Name',
        },
        {
          _type: 'entity',
          entityPath: 'model::Person',
          name: 'employees',
        },
      ],
    },
    {
      path: 'model::LegalEntity',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'Name',
        },
        {
          _type: 'entity',
          entityPath: 'model::Person',
          name: 'employees',
        },
        {
          _type: 'entity',
          entityPath: '@model::Firm',
          name: 'firm',
          subType: 'model::Firm',
        },
      ],
    },
    {
      path: '@model::Firm',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'Name',
        },
        {
          _type: 'entity',
          entityPath: 'model::Person',
          name: 'employees',
        },
      ],
    },
    {
      path: 'model::Person',
      properties: [
        {
          _type: 'entity',
          entityPath: 'model::Colony',
          name: 'address',
          subType: 'model::Colony',
        },
        {
          _type: 'MappedProperty',
          name: 'firstName',
        },
        {
          _type: 'MappedProperty',
          name: 'lastName',
        },
      ],
    },
    {
      path: 'model_Person_address',
      properties: [],
    },
  ],
};

export const TEST_DATA__ModelCoverageAnalysisResult_SimpleRelational = {
  mappedEntities: [
    {
      path: 'my::Firm',
      properties: [
        { _type: 'MappedProperty', name: 'legalName' },
        { _type: 'entity', entityPath: 'my::Person', name: 'employees' },
        { _type: 'MappedProperty', name: 'id' },
      ],
    },
    {
      path: 'my::Person',
      properties: [
        { _type: 'MappedProperty', name: 'age' },
        { _type: 'MappedProperty', name: 'firmID' },
        { _type: 'MappedProperty', name: 'lastName' },
        { _type: 'MappedProperty', name: 'firstName' },
        { _type: 'MappedProperty', name: 'hobbies' },
      ],
    },
  ],
};

export const TEST_DATA__ModelCoverageAnalysisResult_CircularDependency = {
  mappedEntities: [
    {
      path: 'my::Firm',
      properties: [
        { _type: 'MappedProperty', name: 'legalName' },
        { _type: 'entity', entityPath: 'my::Person', name: 'employees' },
        { _type: 'MappedProperty', name: 'id' },
      ],
    },
    {
      path: 'my::Person',
      properties: [
        { _type: 'MappedProperty', name: 'age' },
        { _type: 'entity', entityPath: 'my::Firm', name: 'employer' },
        { _type: 'MappedProperty', name: 'firmID' },
        { _type: 'MappedProperty', name: 'firstName' },
        { _type: 'entity', entityPath: 'my::Hobby', name: 'hobbies' },
        { _type: 'MappedProperty', name: 'lastName' },
      ],
    },
    {
      path: 'my::Hobby',
      properties: [
        { _type: 'MappedProperty', name: 'id' },
        { _type: 'MappedProperty', name: 'name' },
      ],
    },
  ],
};

export const TEST_DATA__ModelCoverageAnalysisResult_HighlightProperties = {
  mappedEntities: [
    {
      path: 'my::Firm',
      properties: [
        { _type: 'entity', entityPath: 'my::Person', name: 'employees' },
        { _type: 'MappedProperty', name: 'legalName' },
      ],
    },
    {
      path: 'my::Person',
      properties: [
        { _type: 'MappedProperty', name: 'name' },
        { _type: 'entity', entityPath: 'my::Firm', name: 'firm' },
      ],
    },
  ],
};

export const TEST_DATA__ModelCoverageAnalysisResult_NestedSubtype = {
  mappedEntities: [
    {
      path: 'model::Address',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'streetName',
        },
        {
          _type: 'MappedProperty',
          name: 'zip',
        },
        {
          _type: 'MappedProperty',
          name: 'zipcode',
        },
        {
          _type: 'entity',
          entityPath: '@model::AddressType1',
          name: 'addressType1',
          subType: 'model::AddressType1',
        },
      ],
    },
    {
      path: '@model::AddressType1',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'streetName',
        },
        {
          _type: 'MappedProperty',
          name: 'zip',
        },
        {
          _type: 'MappedProperty',
          name: 'zipcode',
        },
        {
          _type: 'entity',
          entityPath: '@model::AddressType2',
          name: 'addressType2',
          subType: 'model::AddressType2',
        },
        {
          _type: 'entity',
          entityPath: '@model::AddressType3',
          name: 'addressType3',
          subType: 'model::AddressType3',
        },
      ],
    },
    {
      path: '@model::AddressType2',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'streetName',
        },
        {
          _type: 'MappedProperty',
          name: 'zip',
        },
        {
          _type: 'MappedProperty',
          name: 'zipcode',
        },
      ],
    },
    {
      path: '@model::AddressType3',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'streetName',
        },
        {
          _type: 'MappedProperty',
          name: 'zipcode',
        },
      ],
    },
    {
      path: 'model::AddressType1',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'streetName',
        },
        {
          _type: 'MappedProperty',
          name: 'zip',
        },
        {
          _type: 'MappedProperty',
          name: 'zipcode',
        },
        {
          _type: 'entity',
          entityPath: '@model::AddressType2',
          name: 'addressType2',
          subType: 'model::AddressType2',
        },
        {
          _type: 'entity',
          entityPath: '@model::AddressType3',
          name: 'addressType3',
          subType: 'model::AddressType3',
        },
      ],
    },
    {
      path: 'model::AddressType2',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'streetName',
        },
        {
          _type: 'MappedProperty',
          name: 'zip',
        },
        {
          _type: 'MappedProperty',
          name: 'zipcode',
        },
      ],
    },
    {
      path: 'model::AddressType3',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'streetName',
        },
        {
          _type: 'MappedProperty',
          name: 'zipcode',
        },
      ],
    },
    {
      path: 'model::Person',
      properties: [
        {
          _type: 'entity',
          entityPath: 'model::Address',
          name: 'address',
        },
        {
          _type: 'MappedProperty',
          name: 'name',
        },
      ],
    },
  ],
};

export const TEST_DATA__ModelCoverageAnalysisResult_MultiMappedNestedSubtype = {
  mappedEntities: [
    {
      path: 'model::Firm',
      properties: [
        { _type: 'MappedProperty', name: 'name' },
        {
          _type: 'entity',
          entityPath: 'pos',
          name: 'position',
          subType: 'model::SubPosition',
        },
      ],
    },
    {
      path: 'model::SubPosition',
      properties: [
        { _type: 'entity', entityPath: 'model::Firm', name: 'firm' },
        { _type: 'MappedProperty', name: 'rank' },
        { _type: 'MappedProperty', name: 'subName' },
      ],
    },
    {
      path: 'pos',
      properties: [
        { _type: 'entity', entityPath: 'model::Firm', name: 'firm' },
        { _type: 'MappedProperty', name: 'rank' },
        { _type: 'MappedProperty', name: 'subName' },
      ],
    },
    {
      path: 'pos2',
      properties: [{ _type: 'MappedProperty', name: 'subName' }],
    },
  ],
};

export const TEST_DATA__ModelCoverageAnalysisResult_ChangeDetection = {
  mappedEntities: [
    {
      path: 'my::Firm',
      properties: [
        { _type: 'MappedProperty', name: 'legalName' },
        { _type: 'entity', entityPath: 'my::Person', name: 'employees' },
      ],
    },
    {
      path: 'my::Person',
      properties: [
        { _type: 'MappedProperty', name: 'name' },
        { _type: 'entity', entityPath: 'my::Firm', name: 'firm' },
      ],
    },
  ],
};

export const TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalResult = {
  mappedEntities: [
    {
      path: 'my::Firm',
      properties: [
        { _type: 'entity', entityPath: 'my::employee', name: 'employee' },
        { _type: 'MappedProperty', name: 'id' },
        { _type: 'MappedProperty', name: 'legalName' },
        { _type: 'entity', entityPath: 'my::employee', name: 'derivedProp' },
      ],
    },
    {
      path: 'my::employee',
      properties: [
        { _type: 'MappedProperty', name: 'id' },
        { _type: 'MappedProperty', name: 'name' },
      ],
    },
    {
      path: 'my_Firm_milestoning',
      properties: [
        { _type: 'MappedProperty', name: 'from' },
        { _type: 'MappedProperty', name: 'thru' },
      ],
    },
    {
      path: 'my_employee_milestoning',
      properties: [
        { _type: 'MappedProperty', name: 'from' },
        { _type: 'MappedProperty', name: 'thru' },
      ],
    },
  ],
};

export const TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithExists =
  {
    mappedEntities: [
      {
        path: 'model::Address',
        properties: [
          {
            _type: 'MappedProperty',
            name: 'pincode',
          },
          {
            _type: 'MappedProperty',
            name: 'streetName',
          },
        ],
      },
      {
        path: 'model::Firm',
        properties: [
          {
            _type: 'entity',
            entityPath: 'model::Address',
            name: 'address',
          },
          {
            _type: 'entity',
            entityPath: 'model::Person',
            name: 'contractors',
          },
          {
            _type: 'entity',
            entityPath: 'model::Person',
            name: 'employees',
          },
          {
            _type: 'MappedProperty',
            name: 'id',
          },
          {
            _type: 'MappedProperty',
            name: 'legalName',
          },
        ],
      },
      {
        path: 'model::Hobby',
        properties: [
          {
            _type: 'MappedProperty',
            name: 'id',
          },
          {
            _type: 'MappedProperty',
            name: 'name',
          },
        ],
      },
      {
        path: 'model::Person',
        properties: [
          {
            _type: 'MappedProperty',
            name: 'firstName',
          },
          {
            _type: 'entity',
            entityPath: 'model::Hobby',
            name: 'hobbies',
          },
          {
            _type: 'MappedProperty',
            name: 'lastName',
          },
          {
            _type: 'MappedProperty',
            name: 'isActive',
          },
          {
            _type: 'MappedProperty',
            name: 'prependedName',
          },
        ],
      },
      {
        path: 'model_Address_milestoning',
        properties: [
          {
            _type: 'MappedProperty',
            name: 'from',
          },
          {
            _type: 'MappedProperty',
            name: 'thru',
          },
        ],
      },
    ],
  };

export const TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithDates =
  {
    mappedEntities: [
      {
        path: 'model::Person',
        properties: [
          {
            _type: 'MappedProperty',
            name: 'age',
          },
          {
            _type: 'MappedProperty',
            name: 'dobDate',
          },
          {
            _type: 'MappedProperty',
            name: 'dobStrictDate',
          },
          {
            _type: 'MappedProperty',
            name: 'dobTime',
          },
          {
            _type: 'MappedProperty',
            name: 'firstName',
          },
          {
            _type: 'MappedProperty',
            name: 'lastName',
          },
        ],
      },
    ],
  };

export const TEST_DATA__ModelCoverageAnalysisResult_Milestoning = {
  mappedEntities: [
    {
      path: 'my::Firm',
      properties: [
        {
          _type: 'entity',
          entityPath: 'my::Person1',
          name: 'biTemporal',
        },
        {
          _type: 'entity',
          entityPath: 'my::Person',
          name: 'businessTemporal',
        },
        {
          _type: 'MappedProperty',
          name: 'firmID',
        },
        {
          _type: 'entity',
          entityPath: 'my::Person2',
          name: 'processingTemporal',
        },
      ],
    },
    {
      path: 'my::Person',
      properties: [
        {
          _type: 'entity',
          entityPath: 'my::Person1',
          name: 'biTemporal',
        },
        {
          _type: 'entity',
          entityPath: 'my::Person',
          name: 'businessTemporal',
        },
        {
          _type: 'MappedProperty',
          name: 'date',
        },
        {
          _type: 'MappedProperty',
          name: 'firmID',
        },
        {
          _type: 'entity',
          entityPath: 'my::Person2',
          name: 'processingTemporal',
        },
      ],
    },
    {
      path: 'my::Person1',
      properties: [
        {
          _type: 'entity',
          entityPath: 'my::Person1',
          name: 'biTemporal',
        },
        {
          _type: 'entity',
          entityPath: 'my::Person',
          name: 'businessTemporal',
        },
        {
          _type: 'MappedProperty',
          name: 'firmID',
        },
        {
          _type: 'entity',
          entityPath: 'my::Person2',
          name: 'processingTemporal',
        },
        {
          _type: 'MappedProperty',
          name: 'prop',
        },
      ],
    },
    {
      path: 'my::Person2',
      properties: [
        {
          _type: 'entity',
          entityPath: 'my::Person1',
          name: 'biTemporal',
        },
        {
          _type: 'entity',
          entityPath: 'my::Person',
          name: 'businessTemporal',
        },
        {
          _type: 'MappedProperty',
          name: 'firmID',
        },
        {
          _type: 'entity',
          entityPath: 'my::Person2',
          name: 'processingTemporal',
        },
      ],
    },
    {
      path: 'my_Person_milestoning',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'from',
        },
        {
          _type: 'MappedProperty',
          name: 'thru',
        },
      ],
    },
    {
      path: 'my_Person1_milestoning',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'from',
        },
        {
          _type: 'MappedProperty',
          name: 'in',
        },
        {
          _type: 'MappedProperty',
          name: 'out',
        },
        {
          _type: 'MappedProperty',
          name: 'thru',
        },
      ],
    },
    {
      path: 'my_Person2_milestoning',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'in',
        },
        {
          _type: 'MappedProperty',
          name: 'out',
        },
      ],
    },
  ],
};

export const TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalWithDerivedPropFromParentUsedInFilter =
  {
    mappedEntities: [
      {
        path: 'model::Address',
        properties: [
          {
            _type: 'MappedProperty',
            name: 'pincode',
          },
          {
            _type: 'MappedProperty',
            name: 'streetName',
          },
        ],
      },
      {
        path: 'model::Firm',
        properties: [
          {
            _type: 'entity',
            entityPath: 'model::Address',
            name: 'address',
          },
          {
            _type: 'entity',
            entityPath: 'model::Person',
            name: 'contractors',
          },
          {
            _type: 'entity',
            entityPath: 'model::Person',
            name: 'employees',
          },
          {
            _type: 'MappedProperty',
            name: 'id',
          },
          {
            _type: 'MappedProperty',
            name: 'legalName',
          },
          {
            _type: 'MappedProperty',
            name: 'derivedPropFromParent',
          },
        ],
      },
      {
        path: 'model::Hobby',
        properties: [
          {
            _type: 'MappedProperty',
            name: 'id',
          },
          {
            _type: 'MappedProperty',
            name: 'name',
          },
        ],
      },
      {
        path: 'model::Person',
        properties: [
          {
            _type: 'MappedProperty',
            name: 'firstName',
          },
          {
            _type: 'entity',
            entityPath: 'model::Hobby',
            name: 'hobbies',
          },
          {
            _type: 'MappedProperty',
            name: 'lastName',
          },
        ],
      },
      {
        path: 'model_Address_milestoning',
        properties: [
          {
            _type: 'MappedProperty',
            name: 'from',
          },
          {
            _type: 'MappedProperty',
            name: 'thru',
          },
        ],
      },
    ],
  };

export const TEST_DATA__ModelCoverageAnalysisResult_QueryExecution_Entities = {
  mappedEntities: [
    {
      path: 'model::Firm',
      properties: [
        { _type: 'entity', entityPath: 'model::Person', name: 'employees' },
        { _type: 'enum', enumPath: 'model::IncType', name: 'incType' },
        { _type: 'MappedProperty', name: 'isApple' },
        { _type: 'MappedProperty', name: 'legalName' },
        { _type: 'MappedProperty', name: 'employeeSizes' },
        { _type: 'MappedProperty', name: 'averageAge' },
      ],
    },
    {
      path: 'model::Person',
      properties: [
        { _type: 'MappedProperty', name: 'age' },
        { _type: 'MappedProperty', name: 'firstName' },
        { _type: 'MappedProperty', name: 'lastName' },
        { _type: 'MappedProperty', name: 'fullName' },
      ],
    },
  ],
};

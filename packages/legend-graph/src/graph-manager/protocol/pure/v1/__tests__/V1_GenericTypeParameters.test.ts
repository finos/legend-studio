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

import { test, describe, expect } from '@jest/globals';
import { deserialize } from 'serializr';
import type { Entity } from '@finos/legend-storage';
import { guaranteeType, type PlainObject } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '../../../../__test-utils__/GraphManagerTestUtils.js';
import {
  TEST_DATA__PrecisePrimitiveFunctionRoundtrip,
  TEST_DATA__PrecisePrimitiveRoundtrip,
} from '../../../../__tests__/roundtripTestData/TEST_DATA__PrecisePrimitiveRoundtrip.js';
import { TEST_DATA__Function_genericType } from '../../../../__tests__/roundtripTestData/TEST_DATA__Function-generictype.js';
import {
  V1_derivedPropertyModelSchema,
  V1_propertyModelSchema,
} from '../transformation/pureProtocol/serializationHelpers/V1_DomainSerializationHelper.js';
import { V1_rawVariableModelSchema } from '../transformation/pureProtocol/serializationHelpers/V1_RawValueSpecificationSerializationHelper.js';
import { V1_deserializeValueSpecification } from '../transformation/pureProtocol/serializationHelpers/V1_ValueSpecificationSerializer.js';
import { V1_Lambda } from '../model/valueSpecification/raw/V1_Lambda.js';
import { getOwnProperty } from '../../../../../graph/helpers/DomainHelper.js';
import { Property } from '../../../../../graph/metamodel/pure/packageableElements/domain/Property.js';
import { DerivedProperty } from '../../../../../graph/metamodel/pure/packageableElements/domain/DerivedProperty.js';
import { LambdaFunctionInstanceValue } from '../../../../../graph/metamodel/pure/valueSpecification/LambdaFunction.js';
import { RelationType } from '../../../../../graph/metamodel/pure/packageableElements/relation/RelationType.js';

const PRECISE_PERSON_PATH = 'test::PrecisePerson';

const varcharGenericType = (
  length: number,
): PlainObject<Record<string, unknown>> => ({
  rawType: {
    _type: 'packageableType',
    fullPath: 'Varchar',
  },
  typeVariableValues: [
    {
      _type: 'integer',
      value: length,
    },
  ],
});

/**
 * Replaces the `Varchar(200)` of the property `name` and of the derived property
 * `displayName` of `test::PrecisePerson` by `Varchar(<length>)`
 */
const withNameLength = (length: number): Entity[] =>
  (
    JSON.parse(JSON.stringify(TEST_DATA__PrecisePrimitiveRoundtrip)) as Entity[]
  ).map((entity) => {
    if (entity.path === PRECISE_PERSON_PATH) {
      const content = entity.content as {
        properties: { name: string; genericType: unknown }[];
        qualifiedProperties: { name: string; returnGenericType: unknown }[];
      };
      content.properties
        .filter((property) => property.name === 'name')
        .forEach((property) => {
          property.genericType = varcharGenericType(length);
        });
      content.qualifiedProperties
        .filter((property) => property.name === 'displayName')
        .forEach((property) => {
          property.returnGenericType = varcharGenericType(length);
        });
    }
    return entity;
  });

const buildPrecisePerson = async (
  entities: Entity[],
): Promise<{ name: Property; displayName: DerivedProperty }> => {
  const graphManagerState = TEST__getTestGraphManagerState();
  await TEST__buildGraphWithEntities(graphManagerState, entities);
  const _class = graphManagerState.graph.getClass(PRECISE_PERSON_PATH);
  return {
    name: guaranteeType(getOwnProperty(_class, 'name'), Property),
    displayName: guaranteeType(
      getOwnProperty(_class, 'displayName'),
      DerivedProperty,
    ),
  };
};

describe(unitTest('Property type variable values'), () => {
  test('Metamodel property and derived property hashes include type variable values', async () => {
    const varchar200 = await buildPrecisePerson(withNameLength(200));
    const varchar200Again = await buildPrecisePerson(withNameLength(200));
    const varchar300 = await buildPrecisePerson(withNameLength(300));

    expect(varchar200.name.hashCode).toEqual(varchar200Again.name.hashCode);
    expect(varchar200.name.hashCode).not.toEqual(varchar300.name.hashCode);
    expect(varchar200.displayName.hashCode).toEqual(
      varchar200Again.displayName.hashCode,
    );
    expect(varchar200.displayName.hashCode).not.toEqual(
      varchar300.displayName.hashCode,
    );
  });

  test('Protocol property and derived property hashes include type variable values', () => {
    const property = (length: number): string =>
      deserialize(V1_propertyModelSchema, {
        genericType: varcharGenericType(length),
        multiplicity: { lowerBound: 1, upperBound: 1 },
        name: 'name',
      }).hashCode;
    const derivedProperty = (length: number): string =>
      deserialize(V1_derivedPropertyModelSchema, {
        body: [
          {
            _type: 'property',
            parameters: [{ _type: 'var', name: 'this' }],
            property: 'name',
          },
        ],
        name: 'displayName',
        parameters: [],
        returnGenericType: varcharGenericType(length),
        returnMultiplicity: { lowerBound: 1, upperBound: 1 },
      }).hashCode;

    expect(property(200)).toEqual(property(200));
    expect(property(200)).not.toEqual(property(300));
    expect(derivedProperty(200)).toEqual(derivedProperty(200));
    expect(derivedProperty(200)).not.toEqual(derivedProperty(300));
  });

  test('Protocol and metamodel class hashes agree, and change with type variable values', async () => {
    const graphManagerState = TEST__getTestGraphManagerState();
    await TEST__buildGraphWithEntities(graphManagerState, []);
    const protocolHash = async (entities: Entity[]): Promise<string> =>
      (await graphManagerState.graphManager.buildHashesIndex(entities)).get(
        PRECISE_PERSON_PATH,
      ) as string;
    const metamodelHash = async (entities: Entity[]): Promise<string> => {
      const state = TEST__getTestGraphManagerState();
      await TEST__buildGraphWithEntities(state, entities, {
        TEMPORARY__preserveSectionIndex: true,
      });
      return state.graph.getClass(PRECISE_PERSON_PATH).hashCode;
    };

    const varchar200 = withNameLength(200);
    const varchar300 = withNameLength(300);
    expect(await protocolHash(varchar200)).toEqual(
      await metamodelHash(varchar200),
    );
    expect(await protocolHash(varchar300)).toEqual(
      await metamodelHash(varchar300),
    );
    expect(await protocolHash(varchar200)).not.toEqual(
      await protocolHash(varchar300),
    );
  });

  test('Hashes of properties without type variable values are unchanged', async () => {
    // NOTE: these hashes were computed before type variable values were hashed.
    // Properties without type variable values must keep exactly the same hash,
    // otherwise every existing class would show up as modified.
    const entities = [
      {
        path: 'test::Plain',
        content: {
          _type: 'class',
          name: 'Plain',
          package: 'test',
          properties: [
            {
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'String',
                },
              },
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'name',
            },
          ],
          qualifiedProperties: [
            {
              body: [
                {
                  _type: 'property',
                  parameters: [{ _type: 'var', name: 'this' }],
                  property: 'name',
                },
              ],
              name: 'displayName',
              parameters: [],
              returnGenericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'String',
                },
              },
              returnMultiplicity: { lowerBound: 1, upperBound: 1 },
            },
          ],
        },
        classifierPath: 'meta::pure::metamodel::type::Class',
      },
    ];
    const graphManagerState = TEST__getTestGraphManagerState();
    await TEST__buildGraphWithEntities(graphManagerState, entities);
    const _class = graphManagerState.graph.getClass('test::Plain');

    expect({
      property: getOwnProperty(_class, 'name').hashCode,
      derivedProperty: getOwnProperty(_class, 'displayName').hashCode,
      class: _class.hashCode,
    }).toEqual({
      property: '1fdec18b6bc15814e32664d9a0ddb189034da3f6',
      derivedProperty: '09ebad9bcf82076632ed3ace4e2840535d39f90f',
      class: 'f04fad277042777bc2275e637050236c823ecfe7',
    });
    expect(
      (await graphManagerState.graphManager.buildHashesIndex(entities)).get(
        'test::Plain',
      ),
    ).toEqual(_class.hashCode);
  });
});

const lambdaWithParameter = (
  parameter: PlainObject<Record<string, unknown>>,
): PlainObject<Record<string, unknown>> => ({
  _type: 'lambda',
  body: [
    {
      _type: 'var',
      name: parameter.name,
    },
  ],
  parameters: [parameter],
});

const LAMBDA__VARCHAR_PARAMETER = lambdaWithParameter({
  _type: 'var',
  genericType: varcharGenericType(10),
  multiplicity: { lowerBound: 1, upperBound: 1 },
  name: 'v',
});

const LAMBDA__NUMERIC_PARAMETER = lambdaWithParameter({
  _type: 'var',
  genericType: {
    rawType: {
      _type: 'packageableType',
      fullPath: 'Numeric',
    },
    typeVariableValues: [
      {
        _type: 'integer',
        value: 10,
      },
      {
        _type: 'integer',
        value: 2,
      },
    ],
  },
  multiplicity: { lowerBound: 0, upperBound: 1 },
  name: 'n',
});

const LAMBDA__RELATION_PARAMETER = lambdaWithParameter({
  _type: 'var',
  genericType: {
    rawType: {
      _type: 'packageableType',
      fullPath: 'meta::pure::metamodel::relation::Relation',
    },
    typeArguments: [
      {
        rawType: {
          _type: 'relationType',
          columns: [
            {
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'Integer',
                },
              },
              multiplicity: { lowerBound: 0, upperBound: 1 },
              name: 'a',
            },
          ],
        },
      },
    ],
  },
  multiplicity: { lowerBound: 1, upperBound: 1 },
  name: 'r',
});

const LAMBDA__RELATION_ANY_PARAMETER = lambdaWithParameter({
  _type: 'var',
  genericType: {
    rawType: {
      _type: 'packageableType',
      fullPath: 'meta::pure::metamodel::relation::Relation',
    },
    typeArguments: [
      {
        rawType: {
          _type: 'packageableType',
          fullPath: 'meta::pure::metamodel::type::Any',
        },
      },
    ],
  },
  multiplicity: { lowerBound: 1, upperBound: 1 },
  name: 'r',
});

const LAMBDA__CLASS_PARAMETER = lambdaWithParameter({
  _type: 'var',
  genericType: {
    rawType: {
      _type: 'packageableType',
      fullPath: 'test::Address',
    },
  },
  multiplicity: { lowerBound: 1, upperBound: 1 },
  name: 'a',
});

describe(unitTest('Lambda parameter type parameters roundtrip'), () => {
  test.each([
    ['{v: Varchar(10)[1]|$v}', LAMBDA__VARCHAR_PARAMETER],
    ['{n: Numeric(10,2)[0..1]|$n}', LAMBDA__NUMERIC_PARAMETER],
    [
      '{r: meta::pure::metamodel::relation::Relation<(a:Integer)>[1]|$r}',
      LAMBDA__RELATION_PARAMETER,
    ],
    [
      '{r: meta::pure::metamodel::relation::Relation<Any>[1]|$r}',
      LAMBDA__RELATION_ANY_PARAMETER,
    ],
    ['{a: test::Address[1]|$a}', LAMBDA__CLASS_PARAMETER],
  ])('%s', async (testName, lambda) => {
    const graphManagerState = TEST__getTestGraphManagerState();
    await TEST__buildGraphWithEntities(
      graphManagerState,
      TEST_DATA__PrecisePrimitiveRoundtrip,
    );
    const valueSpecification =
      graphManagerState.graphManager.buildValueSpecification(
        lambda,
        graphManagerState.graph,
      );
    expect(
      graphManagerState.graphManager.serializeValueSpecification(
        valueSpecification,
      ),
    ).toEqual(lambda);
  });

  test('Relation lambda parameter is built with its relation type', async () => {
    const graphManagerState = TEST__getTestGraphManagerState();
    await TEST__buildGraphWithEntities(graphManagerState, []);
    const lambda = guaranteeType(
      graphManagerState.graphManager.buildValueSpecification(
        LAMBDA__RELATION_PARAMETER,
        graphManagerState.graph,
      ),
      LambdaFunctionInstanceValue,
    );
    const relationType = guaranteeType(
      lambda.values[0]?.functionType.parameters[0]?.genericType?.value
        .typeArguments?.[0]?.value.rawType,
      RelationType,
    );
    expect(relationType.columns.map((column) => column.name)).toEqual(['a']);
  });
});

const CURRENCY_CODE_OF_PATH =
  'test::currencyCodeOf_Varchar_1__Numeric_$0_1$__Varchar_1_';

/**
 * Replaces the `Varchar(10)` of the parameter `code` and the `Varchar(3)` of the
 * return type of `test::currencyCodeOf` by `Varchar(<codeLength>)` and
 * `Varchar(<returnLength>)`
 */
const withFunctionLengths = (
  codeLength: number,
  returnLength: number,
  options?: { withoutSignature?: boolean },
): Entity[] =>
  (
    JSON.parse(
      JSON.stringify(TEST_DATA__PrecisePrimitiveFunctionRoundtrip),
    ) as Entity[]
  ).map((entity) => {
    const content = entity.content as {
      name: string;
      parameters: { name: string; genericType: unknown }[];
      returnGenericType: unknown;
    };
    content.parameters
      .filter((parameter) => parameter.name === 'code')
      .forEach((parameter) => {
        parameter.genericType = varcharGenericType(codeLength);
      });
    content.returnGenericType = varcharGenericType(returnLength);
    if (options?.withoutSignature) {
      content.name = 'currencyCodeOf';
    }
    return entity;
  });

const buildFunctionHashes = async (
  entities: Entity[],
): Promise<{
  protocol: string | undefined;
  metamodel: string;
  parameter: string | undefined;
}> => {
  const graphManagerState = TEST__getTestGraphManagerState();
  await TEST__buildGraphWithEntities(graphManagerState, entities, {
    TEMPORARY__preserveSectionIndex: true,
  });
  const func = graphManagerState.graph.getFunction(CURRENCY_CODE_OF_PATH);
  return {
    protocol: (
      await graphManagerState.graphManager.buildHashesIndex(entities)
    ).get(CURRENCY_CODE_OF_PATH),
    metamodel: func.hashCode,
    parameter: func.parameters[0]?.hashCode,
  };
};

describe(unitTest('Function type variable values'), () => {
  test('Function path does not depend on type variable values', async () => {
    for (const [codeLength, returnLength] of [
      [10, 3],
      [20, 4],
    ] as const) {
      const graphManagerState = TEST__getTestGraphManagerState();
      await TEST__buildGraphWithEntities(
        graphManagerState,
        withFunctionLengths(codeLength, returnLength, {
          withoutSignature: true,
        }),
      );
      const func = graphManagerState.graph.getFunction(CURRENCY_CODE_OF_PATH);
      expect(func.path).toEqual(CURRENCY_CODE_OF_PATH);
      expect(func.functionName).toEqual('currencyCodeOf');
    }
  });

  test('Protocol and metamodel function hashes agree', async () => {
    for (const [codeLength, returnLength] of [
      [10, 3],
      [20, 3],
      [10, 4],
    ] as const) {
      const hashes = await buildFunctionHashes(
        withFunctionLengths(codeLength, returnLength),
      );
      expect(hashes.protocol).toEqual(hashes.metamodel);
    }
  });

  test('Function hash changes with the type variable values of a parameter', async () => {
    // `code: Varchar(10)[1]` vs `code: Varchar(20)[1]`
    const varchar10 = await buildFunctionHashes(withFunctionLengths(10, 3));
    const varchar10Again = await buildFunctionHashes(
      withFunctionLengths(10, 3),
    );
    const varchar20 = await buildFunctionHashes(withFunctionLengths(20, 3));

    expect(varchar10).toEqual(varchar10Again);
    expect(varchar10.parameter).not.toEqual(varchar20.parameter);
    expect(varchar10.metamodel).not.toEqual(varchar20.metamodel);
    expect(varchar10.protocol).not.toEqual(varchar20.protocol);
  });

  test('Function hash changes with the type variable values of the return type', async () => {
    // `: Varchar(3)[1]` vs `: Varchar(4)[1]`
    const varchar3 = await buildFunctionHashes(withFunctionLengths(10, 3));
    const varchar4 = await buildFunctionHashes(withFunctionLengths(10, 4));

    expect(varchar3.parameter).toEqual(varchar4.parameter);
    expect(varchar3.metamodel).not.toEqual(varchar4.metamodel);
    expect(varchar3.protocol).not.toEqual(varchar4.protocol);
  });

  test('Protocol function parameter hash includes type variable values', async () => {
    const parameter = (
      length: number,
    ): PlainObject<Record<string, unknown>> => ({
      _type: 'var',
      genericType: varcharGenericType(length),
      multiplicity: { lowerBound: 1, upperBound: 1 },
      name: 'code',
    });
    const protocolHash = (length: number): string =>
      deserialize(V1_rawVariableModelSchema, parameter(length)).hashCode;

    expect(protocolHash(10)).toEqual(protocolHash(10));
    expect(protocolHash(10)).not.toEqual(protocolHash(20));
    expect(protocolHash(10)).toEqual(
      (await buildFunctionHashes(withFunctionLengths(10, 3))).parameter,
    );
  });

  test('Function parameter built from a raw value specification keeps type variable values', async () => {
    const graphManagerState = TEST__getTestGraphManagerState();
    await TEST__buildGraphWithEntities(graphManagerState, []);
    const parameter = {
      _type: 'var',
      genericType: {
        rawType: {
          _type: 'packageableType',
          fullPath: 'Numeric',
        },
        typeVariableValues: [
          {
            _type: 'integer',
            value: 10,
          },
          {
            _type: 'integer',
            value: 2,
          },
        ],
      },
      multiplicity: { lowerBound: 0, upperBound: 1 },
      name: 'amount',
    };
    expect(
      graphManagerState.graphManager.serializeRawValueSpecification(
        graphManagerState.graphManager.buildRawValueSpecification(
          parameter,
          graphManagerState.graph,
        ),
      ),
    ).toEqual(parameter);
  });

  test('Hashes of functions without type variable values are unchanged', async () => {
    // NOTE: these hashes were computed before type variable values of function
    // parameters and return types were hashed. Functions without type variable
    // values, including functions returning a relation (whose columns have some),
    // must keep exactly the same hash, otherwise every existing function would
    // show up as modified.
    const entities = [
      {
        path: 'test::plainCodeOf_String_1__Decimal_$0_1$__String_1_',
        content: {
          _type: 'function',
          body: [
            {
              _type: 'string',
              value: 'USD',
            },
          ],
          name: 'plainCodeOf_String_1__Decimal_$0_1$__String_1_',
          package: 'test',
          parameters: [
            {
              _type: 'var',
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'String',
                },
              },
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'code',
            },
            {
              _type: 'var',
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'Decimal',
                },
              },
              multiplicity: { lowerBound: 0, upperBound: 1 },
              name: 'amount',
            },
          ],
          postConstraints: [],
          preConstraints: [],
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
        },
        classifierPath:
          'meta::pure::metamodel::function::ConcreteFunctionDefinition',
      },
      ...TEST_DATA__Function_genericType,
    ] as Entity[];
    const graphManagerState = TEST__getTestGraphManagerState();
    await TEST__buildGraphWithEntities(graphManagerState, entities);
    const plainFunction = graphManagerState.graph.getFunction(
      'test::plainCodeOf_String_1__Decimal_$0_1$__String_1_',
    );
    const relationFunction = graphManagerState.graph.getFunction(
      'my::firmFunction__Relation_1_',
    );

    expect({
      parameter: plainFunction.parameters[0]?.hashCode,
      plainFunction: plainFunction.hashCode,
      relationFunction: relationFunction.hashCode,
    }).toEqual({
      parameter: 'd848aa8ff2c0956ffa4975c33101ef73e7b546fc',
      plainFunction: 'cad23d9de1a884f8ddb28473c3c474487f8cf76e',
      relationFunction: '8d0ceb03fe01b6744ab4f3b302969f498126ebb3',
    });
    const protocolHashes =
      await graphManagerState.graphManager.buildHashesIndex(entities);
    expect(protocolHashes.get(plainFunction.path)).toEqual(
      plainFunction.hashCode,
    );
    expect(protocolHashes.get(relationFunction.path)).toEqual(
      relationFunction.hashCode,
    );
  });
});

describe(unitTest('Lambda parameter type parameters hash'), () => {
  const buildVariableHashes = async (
    lambda: PlainObject<Record<string, unknown>>,
  ): Promise<{
    metamodel: string | undefined;
    protocol: string | undefined;
  }> => {
    const graphManagerState = TEST__getTestGraphManagerState();
    await TEST__buildGraphWithEntities(graphManagerState, []);
    return {
      metamodel: guaranteeType(
        graphManagerState.graphManager.buildValueSpecification(
          lambda,
          graphManagerState.graph,
        ),
        LambdaFunctionInstanceValue,
      ).values[0]?.functionType.parameters[0]?.hashCode,
      protocol: guaranteeType(
        V1_deserializeValueSpecification(lambda, []),
        V1_Lambda,
      ).parameters[0]?.hashCode,
    };
  };

  const LAMBDA__VARCHAR_20_PARAMETER = lambdaWithParameter({
    _type: 'var',
    genericType: varcharGenericType(20),
    multiplicity: { lowerBound: 1, upperBound: 1 },
    name: 'v',
  });

  const LAMBDA__RELATION_STRING_PARAMETER = lambdaWithParameter({
    _type: 'var',
    genericType: {
      rawType: {
        _type: 'packageableType',
        fullPath: 'meta::pure::metamodel::relation::Relation',
      },
      typeArguments: [
        {
          rawType: {
            _type: 'relationType',
            columns: [
              {
                genericType: {
                  rawType: {
                    _type: 'packageableType',
                    fullPath: 'String',
                  },
                },
                multiplicity: { lowerBound: 0, upperBound: 1 },
                name: 'a',
              },
            ],
          },
        },
      ],
    },
    multiplicity: { lowerBound: 1, upperBound: 1 },
    name: 'r',
  });

  test('Variable hashes include type variable values', async () => {
    // `v: Varchar(10)[1]` vs `v: Varchar(20)[1]`
    const varchar10 = await buildVariableHashes(LAMBDA__VARCHAR_PARAMETER);
    const varchar10Again = await buildVariableHashes(LAMBDA__VARCHAR_PARAMETER);
    const varchar20 = await buildVariableHashes(LAMBDA__VARCHAR_20_PARAMETER);

    expect(varchar10).toEqual(varchar10Again);
    expect(varchar10.metamodel).not.toEqual(varchar20.metamodel);
    expect(varchar10.protocol).not.toEqual(varchar20.protocol);
  });

  test('Variable hashes include type arguments', async () => {
    // `r: Relation<(a:Integer)>[1]` vs `r: Relation<(a:String)>[1]` vs `r: Relation<Any>[1]`
    const relationInteger = await buildVariableHashes(
      LAMBDA__RELATION_PARAMETER,
    );
    const relationString = await buildVariableHashes(
      LAMBDA__RELATION_STRING_PARAMETER,
    );
    const relationAny = await buildVariableHashes(
      LAMBDA__RELATION_ANY_PARAMETER,
    );

    expect(relationInteger.metamodel).not.toEqual(relationString.metamodel);
    expect(relationInteger.protocol).not.toEqual(relationString.protocol);
    expect(relationInteger.metamodel).not.toEqual(relationAny.metamodel);
    expect(relationInteger.protocol).not.toEqual(relationAny.protocol);
  });

  test.each([
    ['{v: Varchar(10)[1]|$v}', LAMBDA__VARCHAR_PARAMETER],
    ['{n: Numeric(10,2)[0..1]|$n}', LAMBDA__NUMERIC_PARAMETER],
    [
      '{r: meta::pure::metamodel::relation::Relation<Any>[1]|$r}',
      LAMBDA__RELATION_ANY_PARAMETER,
    ],
  ])(
    'Protocol and metamodel variable hashes agree: %s',
    async (testName, lambda) => {
      const hashes = await buildVariableHashes(lambda);
      expect(hashes.protocol).toEqual(hashes.metamodel);
    },
  );

  test('Hashes of variables without type parameters are unchanged', async () => {
    // NOTE: these hashes were computed before type parameters of variables were hashed
    expect(
      await buildVariableHashes(
        lambdaWithParameter({
          _type: 'var',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 's',
        }),
      ),
    ).toEqual({
      metamodel: 'd87cb7a56c4381da08cef2bf96c8a2194d6d4cae',
      protocol: 'd87cb7a56c4381da08cef2bf96c8a2194d6d4cae',
    });
  });
});

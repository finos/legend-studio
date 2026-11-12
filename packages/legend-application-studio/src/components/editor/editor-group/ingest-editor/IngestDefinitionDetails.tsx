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

import { clsx, ChevronDownIcon, ChevronUpIcon } from '@finos/legend-art';
import {
  getIngestDatasetWriteMode,
  IngestDeltaReadMode,
  IngestFunctionSource,
  IngestSerializedSource,
  IngestWholeRelationLookupIndex,
  type IngestDataset,
  type IngestDefinitionSpecification,
  type PackageableElement,
  type PackageableElementReference,
  type RawLambda,
} from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import type { ReactNode } from 'react';
import type { IngestDefinitionFlowState } from '../../../../stores/editor/editor-state/element-editor-state/ingest/IngestDefinitionFlowState.js';
import {
  getIngestDefinitionDoc,
  getIngestDeleteIndicatorLabel,
  getIngestLookupIndexLabel,
  getIngestMessageFormatLabel,
  getIngestMessageFormatOptions,
  getIngestOwnerLabel,
  getIngestPreprocessorLabel,
  getIngestPrivacyClassificationLabel,
  getIngestReadModeLabel,
  getIngestReferencePath,
  getIngestStereotypeLabel,
  getIngestTaggedValueTag,
  getIngestWriteModeDescription,
  isIngestDocTaggedValue,
} from '../../../../stores/editor/editor-state/element-editor-state/ingest/IngestDefinitionSpecificationHelper.js';

// What the Overview shows of an ingest definition's specification besides
// its views' flows and its data sets' columns, read-only: the definition's
// own section, its main settings always shown, the rest opening below them;
// and each data set's or view's metadata, in groups

/** A row of a property sheet: a key where its label may repeat, e.g. a tag's */
interface IngestPropertyRow {
  readonly label: string;
  readonly value: ReactNode;
  readonly key?: string | undefined;
}

/** Labels down the left, their values on the right */
const PropertySheet = (props: { rows: IngestPropertyRow[] }) => (
  <dl className="ingest-definition-properties__sheet">
    {props.rows.map((row) => (
      <div
        key={row.key ?? row.label}
        className="ingest-definition-properties__row"
      >
        <dt className="ingest-definition-properties__label">{row.label}</dt>
        <dd className="ingest-definition-properties__value">{row.value}</dd>
      </div>
    ))}
  </dl>
);

/** Properties under a heading; nothing when there are none */
const PropertyGroup = (props: { title: string; rows: IngestPropertyRow[] }) =>
  props.rows.length ? (
    <section
      className="ingest-definition-properties__group"
      aria-label={props.title}
    >
      <h3 className="ingest-definition-properties__group__title">
        {props.title}
      </h3>
      <PropertySheet rows={props.rows} />
    </section>
  ) : null;

/** Groups of properties, side by side in as many columns as fit */
const PropertyGroups = (props: {
  groups: [string, IngestPropertyRow[]][];
  label: string;
}) => (
  <div className="ingest-definition-properties" aria-label={props.label}>
    {props.groups.map(([title, rows]) => (
      <PropertyGroup key={title} title={title} rows={rows} />
    ))}
  </div>
);

const Chips = (props: { values: string[]; isMuted?: boolean }) => (
  <span className="ingest-definition-properties__chips">
    {props.values.map((value) => (
      <span
        key={value}
        className={clsx('ingest-definition-properties__chip', {
          'ingest-definition-properties__chip--muted': props.isMuted,
        })}
      >
        {value}
      </span>
    ))}
  </span>
);

/** Where a value comes from: the data set's own, or the definition's */
const Origin = (props: { isOwn: boolean }) => (
  <span className="ingest-definition-properties__origin">
    {props.isOwn ? 'its own' : "the definition's"}
  </span>
);

/** A lambda of the specification as Pure, as the editor gets it from the engine */
const LambdaPure = observer(
  (props: { flowState: IngestDefinitionFlowState; lambda: RawLambda }) => {
    const { flowState, lambda } = props;
    const { lambdaGrammars, lambdaGrammarsState } = flowState.editorState;
    return (
      <code className="ingest-definition-properties__pure">
        {lambdaGrammars.get(lambda) ??
          (lambdaGrammarsState.isInProgress
            ? 'Getting its Pure…'
            : "Couldn't get its Pure")}
      </code>
    );
  },
);

/** The lambdas of a list, e.g. a data set's partitions, one under the other */
const LambdaList = (props: {
  flowState: IngestDefinitionFlowState;
  lambdas: RawLambda[];
}) => (
  <span className="ingest-definition-properties__lambdas">
    {props.lambdas.map((lambda, index) => (
      // a list's lambdas have nothing else to tell them apart
      // eslint-disable-next-line react/no-array-index-key
      <LambdaPure key={index} flowState={props.flowState} lambda={lambda} />
    ))}
  </span>
);

/** An element the specification names: a link that opens it where the project has it */
const ElementReference = observer(
  (props: {
    flowState: IngestDefinitionFlowState;
    reference: PackageableElementReference<PackageableElement> | string;
  }) => {
    const { flowState, reference } = props;
    const { editorStore } = flowState.editorState;
    const path = getIngestReferencePath(reference);
    const name = path.split('::').pop() ?? path;
    const element =
      editorStore.graphManagerState.graph.getNullableElement(path);
    return element ? (
      <button
        type="button"
        className="ingest-definition-flow__link"
        title={`Open ${path}`}
        onClick={() => editorStore.graphEditorMode.openElement(element)}
      >
        {name}
      </button>
    ) : (
      <span title={`${path}, which isn't in the project`}>{name}</span>
    );
  },
);

/**
 * The settings the definition's section always shows, which every data set
 * follows unless it sets its own: who owns it, how it reads and writes, its
 * data set group and its compute
 */
const getMainSettings = (
  flowState: IngestDefinitionFlowState,
  specification: IngestDefinitionSpecification,
): IngestPropertyRow[] => {
  const { readMode, writeMode, owner, compute } = specification;
  return [
    { label: 'Owner', value: owner ? getIngestOwnerLabel(owner) : 'None' },
    {
      label: 'Read mode',
      value: readMode
        ? `${getIngestReadModeLabel(readMode)}${
            readMode.format
              ? ` · ${getIngestMessageFormatLabel(readMode.format)}`
              : ''
          }`
        : 'None',
    },
    {
      label: 'Write mode',
      value: writeMode ? getIngestWriteModeDescription(writeMode) : 'None',
    },
    { label: 'Data set group', value: specification.datasetGroup },
    ...(compute
      ? [
          {
            label: 'Compute',
            value: (
              <ElementReference flowState={flowState} reference={compute} />
            ),
          },
        ]
      : []),
  ];
};

/**
 * The rest of the definition's settings, in groups: who runs it, how it
 * reads files, how it writes, its batches and its annotations. Its main
 * settings and its doc, which its section shows above, aren't repeated
 */
const IngestDefinitionOtherSettings = observer(
  (props: {
    flowState: IngestDefinitionFlowState;
    specification: IngestDefinitionSpecification;
  }) => {
    const { flowState, specification } = props;
    const { readMode } = specification;
    const reference = (
      value: PackageableElementReference<PackageableElement> | string,
    ): ReactNode => (
      <ElementReference flowState={flowState} reference={value} />
    );
    const lambda = (value: RawLambda): ReactNode => (
      <LambdaPure flowState={flowState} lambda={value} />
    );
    const ownWriteModes = specification.datasets.filter(
      (dataset) => dataset.writeMode,
    );
    const override = specification.prodDataProductOverride;
    const optional = (
      label: string,
      value: ReactNode | undefined,
    ): IngestPropertyRow[] =>
      value === undefined || value === false ? [] : [{ label, value }];
    return (
      <PropertyGroups
        label="The definition's other settings"
        groups={[
          [
            'Ownership',
            [
              ...optional('Evaluation user', specification.evaluationUser),
              ...optional(
                'Production override',
                override &&
                  (override.all ? (
                    'Every data product'
                  ) : (
                    <span className="ingest-definition-properties__references">
                      {override.dataProducts.map((dataProduct) => (
                        <ElementReference
                          key={getIngestReferencePath(dataProduct)}
                          flowState={flowState}
                          reference={dataProduct}
                        />
                      ))}
                    </span>
                  )),
              ),
            ],
          ],
          [
            'Reading',
            [
              ...(readMode?.format
                ? getIngestMessageFormatOptions(readMode.format).map(
                    ([label, value]) => ({
                      label,
                      value: (
                        <code className="ingest-definition-properties__literal">
                          {value}
                        </code>
                      ),
                    }),
                  )
                : []),
              ...optional(
                'Deletes',
                readMode instanceof IngestDeltaReadMode &&
                  readMode.deleteIndicator
                  ? getIngestDeleteIndicatorLabel(readMode.deleteIndicator)
                  : undefined,
              ),
            ],
          ],
          [
            'Writing',
            [
              ...optional(
                'Data sets with their own write mode',
                ownWriteModes.length > 0 && (
                  <span className="ingest-definition-properties__references">
                    {ownWriteModes.map((dataset) => (
                      <button
                        key={dataset.name}
                        type="button"
                        className="ingest-definition-flow__link"
                        title={`Show the data set ${dataset.name}`}
                        onClick={() => flowState.selectDataSet(dataset.name)}
                      >
                        {dataset.name}
                      </button>
                    ))}
                  </span>
                ),
              ),
              ...optional(
                'Auto trigger',
                specification.autoTrigger === undefined
                  ? undefined
                  : specification.autoTrigger
                    ? 'Yes'
                    : 'No',
              ),
              ...optional(
                'Type system validations',
                specification.enableTypeSystemValidations === undefined
                  ? undefined
                  : specification.enableTypeSystemValidations
                    ? 'On'
                    : 'Off',
              ),
            ],
          ],
          [
            'Batches',
            [
              ...optional(
                'Batch attributes',
                specification.batchAttributes &&
                  lambda(specification.batchAttributes),
              ),
              ...optional(
                'Of type',
                specification.batchAttributesType &&
                  reference(specification.batchAttributesType),
              ),
              ...optional(
                'Barrier',
                specification.barrier && lambda(specification.barrier),
              ),
              ...optional(
                'Batch attributes generator',
                specification.batchAttributesGenerator &&
                  reference(specification.batchAttributesGenerator),
              ),
              ...optional(
                'Temporal date generator',
                specification.temporalDateGenerator &&
                  reference(specification.temporalDateGenerator),
              ),
              ...optional(
                'Barrier generator',
                specification.barrierGenerator &&
                  reference(specification.barrierGenerator),
              ),
            ],
          ],
          [
            'Annotations',
            [
              ...optional(
                'Stereotypes',
                specification.stereotypes.length > 0 && (
                  <Chips
                    values={specification.stereotypes.map(
                      getIngestStereotypeLabel,
                    )}
                  />
                ),
              ),
              ...specification.taggedValues
                .filter((taggedValue) => !isIngestDocTaggedValue(taggedValue))
                .map((taggedValue, index) => ({
                  label: getIngestTaggedValueTag(taggedValue),
                  value: taggedValue.value,
                  key: `tag-${index}`,
                })),
            ],
          ],
        ]}
      />
    );
  },
);

/**
 * The definition's own section, above its materialized views and data sets:
 * its name and doc, then the settings every data set follows unless it sets
 * its own; the rest opens below them
 */
export const IngestDefinitionSection = observer(
  (props: {
    flowState: IngestDefinitionFlowState;
    specification: IngestDefinitionSpecification;
  }) => {
    const { flowState, specification } = props;
    const { isDefinitionOpen } = flowState;
    const doc = getIngestDefinitionDoc(specification);
    return (
      <section className="ingest-definition-section" aria-label="Definition">
        <h2 className="ingest-definition-overview__title">Definition</h2>
        <div className="ingest-definition-section__box">
          <div className="ingest-definition-section__head">
            <span className="ingest-definition-section__name">
              {flowState.editorState.ingest.name}
            </span>
            {doc && (
              <span className="ingest-definition-section__doc" title={doc}>
                {doc}
              </span>
            )}
            <button
              type="button"
              className="ingest-definition-section__toggle"
              aria-expanded={isDefinitionOpen}
              onClick={() => flowState.setDefinitionOpen(!isDefinitionOpen)}
            >
              {isDefinitionOpen ? 'Fewer settings' : 'All settings'}
              {isDefinitionOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </button>
          </div>
          <dl
            className="ingest-definition-section__main"
            aria-label="Main settings"
          >
            {getMainSettings(flowState, specification).map((setting) => (
              <div
                key={setting.label}
                className="ingest-definition-section__setting"
              >
                <dt className="ingest-definition-section__setting__label">
                  {setting.label}
                </dt>
                <dd className="ingest-definition-section__setting__value">
                  {setting.value}
                </dd>
              </div>
            ))}
          </dl>
          {isDefinitionOpen && (
            <div className="ingest-definition-section__more">
              <IngestDefinitionOtherSettings
                flowState={flowState}
                specification={specification}
              />
              <div className="ingest-definition-section__hint">
                Read-only here: edit the definition in text mode.
              </div>
            </div>
          )}
        </div>
      </section>
    );
  },
);

/**
 * Everything a data set or a view says besides its columns or its flow, in
 * groups: its key and governance, what reads it or what it reads, how it's
 * written, stored and read. A setting it takes from the definition says so
 */
export const IngestDataSetMetadata = observer(
  (props: {
    flowState: IngestDefinitionFlowState;
    dataset: IngestDataset;
    /** What reads the data set, or what the view reads */
    lineage: IngestPropertyRow;
  }) => {
    const { flowState, dataset, lineage } = props;
    const { specification } = flowState;
    const writeMode = specification
      ? getIngestDatasetWriteMode(dataset, specification)
      : dataset.writeMode;
    const { source } = dataset;
    const format =
      source instanceof IngestSerializedSource
        ? (source.format ?? specification?.readMode?.format)
        : undefined;
    const lambdas = (
      label: string,
      values: RawLambda[],
    ): IngestPropertyRow[] =>
      values.length
        ? [
            {
              label,
              value: <LambdaList flowState={flowState} lambdas={values} />,
            },
          ]
        : [];
    return (
      <PropertyGroups
        label={`Metadata of ${dataset.name}`}
        groups={[
          [
            'Key and governance',
            [
              {
                label: 'Primary key',
                value: dataset.primaryKey.length ? (
                  <Chips values={dataset.primaryKey} />
                ) : (
                  'None'
                ),
              },
              {
                label: 'Classification',
                value: dataset.privacyClassification
                  ? getIngestPrivacyClassificationLabel(
                      dataset.privacyClassification,
                    )
                  : 'None',
              },
              {
                label: 'Residency',
                value: dataset.dataResidencyJurisdictions.length
                  ? dataset.dataResidencyJurisdictions.join(', ')
                  : 'None',
              },
            ],
          ],
          ['Lineage', [lineage]],
          [
            'Writing',
            [
              {
                label: 'Write mode',
                value: writeMode ? (
                  <>
                    {getIngestWriteModeDescription(writeMode)}{' '}
                    <Origin isOwn={Boolean(dataset.writeMode)} />
                  </>
                ) : (
                  'None'
                ),
              },
              ...(dataset.businessTemporalField
                ? [
                    {
                      label: 'Business temporal field',
                      value: dataset.businessTemporalField,
                    },
                  ]
                : []),
              ...(dataset.deleteIndicatorField
                ? [
                    {
                      label: 'Deletes',
                      value: getIngestDeleteIndicatorLabel(
                        dataset.deleteIndicatorField,
                      ),
                    },
                  ]
                : []),
            ],
          ],
          [
            'Storage',
            [
              ...lambdas('Ingest partitions', dataset.ingestPartitionColumns),
              ...lambdas(
                'Cluster columns',
                dataset.storageLayoutClusterColumns,
              ),
              ...lambdas(
                'Storage partitions',
                dataset.storageLayoutPartitionColumns,
              ),
              ...(dataset.lookupIndexes.length
                ? [
                    {
                      label: 'Lookup indexes',
                      value: (
                        <ul className="ingest-definition-properties__list">
                          {dataset.lookupIndexes.map((index, position) => (
                            // an index may repeat another, e.g. on another path
                            // eslint-disable-next-line react/no-array-index-key
                            <li key={position}>
                              {getIngestLookupIndexLabel(index)}
                              {index instanceof
                                IngestWholeRelationLookupIndex && (
                                <LambdaPure
                                  flowState={flowState}
                                  lambda={index.lambda}
                                />
                              )}
                            </li>
                          ))}
                        </ul>
                      ),
                    },
                  ]
                : []),
            ],
          ],
          [
            'Reading',
            [
              // a view isn't sent files: it has no format
              ...(source instanceof IngestFunctionSource || !format
                ? []
                : [
                    {
                      label: 'Format',
                      value: (
                        <>
                          {getIngestMessageFormatLabel(format)}{' '}
                          <Origin
                            isOwn={
                              source instanceof IngestSerializedSource &&
                              source.format !== undefined
                            }
                          />
                        </>
                      ),
                    },
                  ]),
              ...(source instanceof IngestSerializedSource && source.format
                ? getIngestMessageFormatOptions(source.format).map(
                    ([label, value]) => ({
                      label,
                      value: (
                        <code className="ingest-definition-properties__literal">
                          {value}
                        </code>
                      ),
                    }),
                  )
                : []),
              ...(dataset.preprocessors.length
                ? [
                    {
                      label: 'Preprocessing',
                      value: (
                        <ol className="ingest-definition-properties__list ingest-definition-properties__list--ordered">
                          {dataset.preprocessors.map(
                            (preprocessor, position) => (
                              // a step may repeat another
                              // eslint-disable-next-line react/no-array-index-key
                              <li key={position}>
                                {getIngestPreprocessorLabel(preprocessor)}
                              </li>
                            ),
                          )}
                        </ol>
                      ),
                    },
                  ]
                : []),
            ],
          ],
        ]}
      />
    );
  },
);

/** A data set's classification and residency, as chips beside its name */
export const IngestDataSetChips = (props: { dataset: IngestDataset }) => {
  const { dataset } = props;
  const values = [
    ...(dataset.privacyClassification
      ? [getIngestPrivacyClassificationLabel(dataset.privacyClassification)]
      : []),
    ...dataset.dataResidencyJurisdictions.map((region) => `${region} only`),
  ];
  return values.length ? <Chips values={values} isMuted={true} /> : null;
};

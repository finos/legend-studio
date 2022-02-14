import packageJson from '../../../../package.json';

import { PersistencePipe } from '../../metamodels/pure/model/packageableElements/persistence/Persistence';

import { V1_PersistencePipe } from './v1/model/packageableElements/persistence/V1_Persistence';

import {
  V1_PERSISTENCE_PIPE_ELEMENT_PROTOCOL_TYPE,
  V1_persistencePipeModelSchema,
} from './v1/transformation/pureProtocol/V1_DSLPersistence_ProtocolHelper';

import {
  PackageableElement,
  PureProtocolProcessorPlugin,
  V1_ElementProtocolClassifierPathGetter,
  V1_ElementProtocolDeserializer,
  V1_ElementProtocolSerializer,
  V1_ElementTransformer,
  V1_GraphTransformerContext,
  V1_PackageableElement,
} from '@finos/legend-graph';

import type { PlainObject } from '@finos/legend-shared';

import { deserialize, serialize } from 'serializr';

export const PERSISTENCE_PIPE_ELEMENT_CLASSIFIER_PATH =
  'meta::pure::persistence::metamodel::PersistencePipe';

export class DSLPersistence_PureProtocolProcessorPlugin extends PureProtocolProcessorPlugin {
  constructor() {
    super(
      packageJson.extensions.pureProtocolProcessorPlugin,
      packageJson.version,
    );
  }

  override V1_getExtraElementClassifierPathGetters(): V1_ElementProtocolClassifierPathGetter[] {
    return [
      (elementProtocol: V1_PackageableElement): string | undefined => {
        if (elementProtocol instanceof V1_PersistencePipe) {
          return PERSISTENCE_PIPE_ELEMENT_CLASSIFIER_PATH;
        }
        return undefined;
      },
    ];
  }

  override V1_getExtraElementProtocolSerializers(): V1_ElementProtocolSerializer[] {
    return [
      (
        elementProtocol: V1_PackageableElement,
        plugins: PureProtocolProcessorPlugin[],
      ): PlainObject<V1_PackageableElement> | undefined => {
        if (elementProtocol instanceof V1_PersistencePipe) {
          return serialize(V1_persistencePipeModelSchema, elementProtocol);
        }
        return undefined;
      },
    ];
  }

  override V1_getExtraElementProtocolDeserializers(): V1_ElementProtocolDeserializer[] {
    return [
      (
        json: PlainObject<V1_PackageableElement>,
        plugins: PureProtocolProcessorPlugin[],
      ): V1_PackageableElement | undefined => {
        if (json._type === V1_PERSISTENCE_PIPE_ELEMENT_PROTOCOL_TYPE) {
          return deserialize(V1_persistencePipeModelSchema, json);
        }
        return undefined;
      },
    ];
  }

  override V1_getExtraElementTransformers(): V1_ElementTransformer[] {
    return [
      (
        metamodel: PackageableElement,
        context: V1_GraphTransformerContext,
      ): V1_PackageableElement | undefined => {
        if (metamodel instanceof PersistencePipe) {
          const protocol = new V1_PersistencePipe();

          return protocol;
        }
        return undefined;
      },
    ];
  }
}

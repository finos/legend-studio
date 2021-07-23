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

import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../../MetaModelConst';
import { hashArray } from '@finos/legend-studio-shared';

export abstract class V1_AuthenticationStrategy implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_AuthenticationStrategy';

  abstract get hashCode(): string;
}

export class V1_DelegatedKerberosAuthenticationStrategy
  extends V1_AuthenticationStrategy
  implements Hashable
{
  serverPrincipal?: string;
  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DELEGRATED_KEREBEROS_AUTHENTICATION_STRATEGY,
      this.serverPrincipal?.toString() ?? '',
    ]);
  }
}

export class V1_DefaultH2AuthenticationStrategy
  extends V1_AuthenticationStrategy
  implements Hashable
{
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.DEFAULT_H2_AUTHENTICATION_STRATEGY]);
  }
}

export class V1_TestDatabaseAuthenticationStrategy
  extends V1_DefaultH2AuthenticationStrategy
  implements Hashable
{
  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.TEST_DATABASE_AUTHENTICATION_STRATEGY,
    ]);
  }
}

export class V1_OAuthAuthenticationStrategy
  extends V1_AuthenticationStrategy
  implements Hashable
{
  oauthKey!: string;
  scopeName!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.OAUTH_AUTHENTICATION_STRATEGY,
      this.oauthKey,
      this.scopeName,
    ]);
  }
}

export class V1_SnowflakePublicAuthenticationStrategy
  extends V1_AuthenticationStrategy
  implements Hashable
{
  privateKeyVaultReference!: string;
  passPhraseVaultReference!: string;
  publicUserName!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SNOWFLAKE_PUBLIC_AUTHENTICATION_STRATEGY,
      this.privateKeyVaultReference,
      this.passPhraseVaultReference,
      this.publicUserName,
    ]);
  }
}

export class V1_UserPasswordAuthenticationStrategy
  extends V1_AuthenticationStrategy
  implements Hashable
{
  userName!: string;
  passwordVaultReference!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.USER_PASSWORD_AUTHENTICATION_STRATEGY,
      this.userName,
      this.passwordVaultReference,
    ]);
  }
}

export class V1_GCPApplicationDefaultCredentialsAuthenticationStrategy
  extends V1_AuthenticationStrategy
  implements Hashable
{
  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.GCP_APPLICATION_DEFAULT_CREDENTIALS_AUTHENTICATION_STRATEGY,
    ]);
  }
}

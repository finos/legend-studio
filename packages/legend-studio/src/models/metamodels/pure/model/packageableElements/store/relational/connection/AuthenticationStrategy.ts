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
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import { hashArray } from '@finos/legend-studio-shared';
import { observable, computed, makeObservable, action } from 'mobx';

export abstract class AuthenticationStrategy implements Hashable {
  private readonly _$nominalTypeBrand!: 'AuthenticationStrategy';

  abstract get hashCode(): string;
}

export class DelegatedKerberosAuthenticationStrategy
  extends AuthenticationStrategy
  implements Hashable
{
  serverPrincipal?: string;
  constructor() {
    super();

    makeObservable(this, {
      hashCode: computed,
      setServerPrincipal: action,
    });
  }

  setServerPrincipal(val?: string): void {
    this.serverPrincipal = val;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DELEGRATED_KEREBEROS_AUTHENTICATION_STRATEGY,
      this.serverPrincipal?.toString() ?? '',
    ]);
  }
}

export class DefaultH2AuthenticationStrategy
  extends AuthenticationStrategy
  implements Hashable
{
  constructor() {
    super();

    makeObservable(this, {
      hashCode: computed,
    });
  }

  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.DEFAULT_H2_AUTHENTICATION_STRATEGY]);
  }
}

export class TestDatabaseAuthenticationStrategy
  extends DefaultH2AuthenticationStrategy
  implements Hashable
{
  constructor() {
    super();

    makeObservable(this, {
      hashCode: computed,
    });
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.TEST_DATABASE_AUTHENTICATION_STRATEGY,
    ]);
  }
}

export class OAuthAuthenticationStrategy
  extends AuthenticationStrategy
  implements Hashable
{
  oauthKey: string;
  scopeName: string;

  constructor(oauthKey: string, scopeName: string) {
    super();

    makeObservable(this, {
      oauthKey: observable,
      scopeName: observable,
      hashCode: computed,
      setOauthKey: action,
      setScopeName: action,
    });
    this.oauthKey = oauthKey;
    this.scopeName = scopeName;
  }

  setOauthKey(val: string): void {
    this.oauthKey = val;
  }

  setScopeName(val: string): void {
    this.scopeName = val;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.OAUTH_AUTHENTICATION_STRATEGY,
      this.oauthKey,
      this.scopeName,
    ]);
  }
}

export class SnowflakePublicAuthenticationStrategy
  extends AuthenticationStrategy
  implements Hashable
{
  privateKeyVaultReference: string;
  passPhraseVaultReference: string;
  publicUserName: string;

  constructor(
    privateKeyVaultReference: string,
    passPhraseVaultReference: string,
    publicUserName: string,
  ) {
    super();

    makeObservable(this, {
      privateKeyVaultReference: observable,
      passPhraseVaultReference: observable,
      publicUserName: observable,
      setPrivateKeyVaultReference: action,
      setPassPhraseVaultReference: action,
      setPublicUserName: action,
      hashCode: computed,
    });

    this.privateKeyVaultReference = privateKeyVaultReference;
    this.passPhraseVaultReference = passPhraseVaultReference;
    this.publicUserName = publicUserName;
  }

  setPrivateKeyVaultReference(val: string): void {
    this.privateKeyVaultReference = val;
  }

  setPassPhraseVaultReference(val: string): void {
    this.passPhraseVaultReference = val;
  }

  setPublicUserName(val: string): void {
    this.publicUserName = val;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SNOWFLAKE_PUBLIC_AUTHENTICATION_STRATEGY,
      this.privateKeyVaultReference,
      this.passPhraseVaultReference,
      this.publicUserName,
    ]);
  }
}

export class UserPasswordAuthenticationStrategy
  extends AuthenticationStrategy
  implements Hashable
{
  userName: string;
  passwordVaultReference: string;

  constructor(userName: string, passwordVaultReference: string) {
    super();

    makeObservable(this, {
      userName: observable,
      passwordVaultReference: observable,
      setUserName: action,
      setPasswordVaultReference: action,
      hashCode: computed,
    });

    this.userName = userName;
    this.passwordVaultReference = passwordVaultReference;
  }

  setUserName(val: string): void {
    this.userName = val;
  }

  setPasswordVaultReference(val: string): void {
    this.passwordVaultReference = val;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.USER_PASSWORD_AUTHENTICATION_STRATEGY,
      this.userName,
      this.passwordVaultReference,
    ]);
  }
}

export class GCPApplicationDefaultCredentialsAuthenticationStrategy
  extends AuthenticationStrategy
  implements Hashable
{
  constructor() {
    super();

    makeObservable(this, {
      hashCode: computed,
    });
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.GCP_APPLICATION_DEFAULT_CREDENTIALS_AUTHENTICATION_STRATEGY,
    ]);
  }
}

export interface NameValue {
  name: string;
  value: string;
}

export interface Environment {
  client: string;
  environmentName: string;
  dateExported: string;
  version: string;
  variables: NameValue[];
}

export interface Folder {
  _id: string;
  name: string;
  containerId: string;
  created: string;
  sortNum: number;
}

export interface TBody {
  type: 'json';
  raw: string;
  // form
}

export interface TTest {
  type: 'set-env-var';
  custom: string;
  action: 'setto';
  value: string;
}

export interface TAuth {
  type: 'bearer';
  bearer: string;
}

export interface TSettings {
  auth: TAuth;
}

export interface TRequest {
  _id: string;
  colId: string;
  containerId: string;
  name: string;
  url: string;
  method: string;
  sortNum: number;
  created: string;
  modified: string;
  // headers
  // params
  body: TBody;
  tests: TTest[];
}

export interface Collection {
  client: string;
  collectionName: string;
  dateExported: string;
  version: string;
  folders: Folder[];
  requests: TRequest[];
  settings: TSettings;
}

export interface Expected {
  _id: string;
  name?: string;
  expectCode?: number;
}

export interface Definition {
  inputFile?: string;
  environmentFile?: string;
  environment?: Record<string, string>;
  requests?: Expected[];
}

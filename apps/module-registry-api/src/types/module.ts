export interface DefaultLayoutSize {
  width: number;
  height: number;
}

export type ModuleStatus = "active" | "disabled" | "draft";

export interface RegisterModuleInput {
  componentId: string;
  displayName: string;
  remoteEntryUrl: string;
  remoteScope: string;
  exposedModule: `./${string}`;
  defaultLayoutSize: DefaultLayoutSize;
  status: ModuleStatus;
  version: string;
  tenantId: string;
  env: string;
}

export interface ModuleRegistryItem {
  id: string;
  displayName: string;
  remoteEntryUrl: string;
  remoteScope: string;
  exposedModule: `./${string}`;
  defaultLayoutSize: DefaultLayoutSize;
  status: ModuleStatus;
  version: string;
  tenantId: string;
  env: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListModulesOptions {
  tenantId: string;
  env: string;
  status?: ModuleStatus;
}

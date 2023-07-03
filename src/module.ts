export interface ModuleInterface {
  id?: number;
  identifier?: string;
}

export interface ModuleOptions {
  auto_save_lifetime?: number | string;
}

export default class Module {
  id?: number;
  identifier?: string;
  options?: ModuleOptions;

  constructor(props: ModuleInterface) {
    Object.assign(this, props);
  }
}
import Module from "./module";

export interface EntityInterface {
  id?: number;
  module?: Module | null;
  saveId?: number;
}

export default class Entity {
  id?: number;
  module?: Module | null;
  saveId?: number;

  constructor(props: EntityInterface) {
    Object.assign(this, props);
  }
}
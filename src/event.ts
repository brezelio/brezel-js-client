import Client from "./brezel";
import {EntityInterface} from "./entity";

interface BrezelEventOptions {
  identifier: string;
  module?: string | null;
  brezel: Client;
}

export default class BrezelEvent {
  private readonly identifier: string;
  private readonly module: string | null | undefined;
  private brezel: Client;

  constructor(options: BrezelEventOptions) {
    this.identifier = options.identifier;
    this.module = options.module;
    this.brezel = options.brezel;
  }

  fire(entity: EntityInterface | null = null, data = {}, localArgs = {}) {
    const entityId = typeof entity === 'object' && entity !== null ? entity.id : entity;
    const body = data ? JSON.stringify(data) : null;

    const apiRequest: Array<unknown> = ['webhook', this.identifier];

    if (this.module) {
      apiRequest.push(this.module);
    }

    if (entityId !== undefined) {
      apiRequest.push(entityId);
    }

    return this.brezel.apiPost(apiRequest, {}, body, {'Content-Type': 'application/json'});
  }
}

import Client, {Path} from "./index.js";
import {EntityBase} from '@kibro/brezel-spa-types'

interface BrezelEventOptions {
    identifier: string;
    module?: string | null;
    brezel: Client<any, any, any>;
}

export default class BrezelEvent {
    private readonly identifier: string;
    private readonly module: string | null | undefined;
    private readonly brezel: Client<any, any>;

    constructor(options: BrezelEventOptions) {
        this.identifier = options.identifier;
        this.module = options.module;
        this.brezel = options.brezel;
    }

    fire(entity: EntityBase | undefined = undefined, data = {}, localArgs = {}) {
        const entityId = typeof entity === 'object' && entity !== null ? entity.id : entity;
        const body = data ? JSON.stringify(data) : null;

        const apiRequest: Path = ['webhook', this.identifier];

        if (this.module) {
            apiRequest.push(this.module);
        }

        if (entityId !== undefined) {
            apiRequest.push(entityId);
        }

        return this.brezel.apiPost(apiRequest, {}, body, {'Content-Type': 'application/json'});
    }
}

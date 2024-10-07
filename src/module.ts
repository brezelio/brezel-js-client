export interface ModuleInterface {
    id?: number;
    identifier?: string;
}

export interface ModuleOptions {
    auto_save_lifetime?: number | string;
}

export interface Field {
    id: number;
    identifier: string;
    type: string;
    options?: Record<string, unknown>;
}

export default class Module {
    id?: number;
    identifier?: string;
    options?: ModuleOptions;
    fields: Field[] = [];

    constructor(props: ModuleInterface) {
        Object.assign(this, props);
    }
}
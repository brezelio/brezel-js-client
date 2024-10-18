export interface ModuleInterface {
    id: number;
    identifier: string;
    fields?: Field[];
    options?: ModuleOptions;
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
    id: number;
    identifier: string;
    options?: ModuleOptions = {};
    fields: Field[] = [];

    constructor(props: ModuleInterface) {
        Object.assign(this, props);
        this.id = props.id;
        this.identifier = props.identifier
        this.options = props.options ?? {};
        this.fields = props.fields ?? [];
    }
}
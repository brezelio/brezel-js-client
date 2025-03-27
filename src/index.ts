import {apiLink} from './util.js';
import BrezelEvent from './event.js';
import {NotificationInterface} from "./notification.js";

export interface ModuleBase {
    id?: number;
    identifier: string;
    type: string;
}

export interface FieldBase {
    id: number;
    identifier: string;
    type: string;
    options?: Record<string, unknown>;
}

export interface Module extends ModuleBase {
    fields: FieldBase[];
    options?: {
        [key: string]: unknown;
    }
}

export interface EntityBase {
    id?: number;
    module?: {
        identifier: string;
    }

    [p: string]: any;
}

export interface Options {
    uri: string;
    system: string;
    key?: string;
    token?: string;
}

export type FilterClause<T = EntityBase> = {
    column: keyof T | string
    operator: '=' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'like' | 'is' | 'is not'
    value: string | number | (string | number)[]
}

export type FilterClauses<T = EntityBase> = FilterClause<T>[]

export type DNF<T = EntityBase> = FilterClauses<T>[]

export type DNFConvenience<T = EntityBase> = FilterClauses<T> | DNF<T>

export type EntitiesRequestOptions<T = EntityBase> = {
    filters?: DNFConvenience<T>;
    with?: (keyof T | string)[];
    page?: number;
    results?: number;
    perPage?: number;
    includeTrashed?: boolean | string;
    columns?: (keyof T | string)[];
}

export type Path = (string | number | undefined)[]

type Headers = Record<string, string>;

type ModuleMapping = Record<string, ModuleBase>

type EntityMapping = Record<string, EntityBase>

export type ModuleByIdentifier<M extends ModuleMapping, Identifier extends keyof M | string> = Identifier extends keyof M ? M[Identifier] : (ModuleBase | undefined);

export type EntityOfModule<M extends EntityMapping, Identifier extends keyof M | string> = Identifier extends keyof M ? M[Identifier] : EntityBase;

export type ValidationErrors = string[] | Record<string, string[]>

export interface EntityResponse<E extends EntityBase> {
    status: number
    success: boolean
    resource?: E
    errors?: ValidationErrors
}

export interface EntityUpdateResponse<E extends EntityBase> extends EntityResponse<E> {
}

export interface EntityCreateResponse<E extends EntityBase> extends EntityResponse<E> {
}

export interface TranslationMapping {
}

export class ApiError extends Error {
    status: number;
    url: string;
    responseBody: any;
    headers: HeadersInit;

    constructor(status: number, url: string, responseBody: any, headers: HeadersInit) {
        super(`HTTP ${status} Error for ${url}: ${JSON.stringify(responseBody)}`);
        this.status = status;
        this.url = url;
        this.responseBody = responseBody;
        this.headers = headers;
    }
}

export class Client<M extends ModuleMapping = {}, EM extends EntityMapping = {}, TM extends TranslationMapping = {}> {
    public uri: string;
    public system: string;
    public key?: string;
    public token?: string;

    constructor(options: Options) {
        this.uri = options.uri;
        this.system = options.system;
        this.key = options.key;
        this.token = options.token;
    }

    async apiCall(method: string, path: Path, params = {}, body: BodyInit | null | undefined = undefined, headers: Headers = {}) {
        const url = path instanceof URL ? path : apiLink(path, params, this.uri, this.system);
        const apiHeaders = {...headers};

        if (this.token) {
            apiHeaders['Authorization'] = 'Bearer ' + this.token;
        }
        if (this.key) {
            apiHeaders['X-Api-Key'] = this.key;
        }

        const response = await fetch(url.toString(), {
            headers: apiHeaders,
            credentials: 'include', // send and store cookies from API, e.g. to swap access tokens with sessions for redirect flows
            method,
            body,
        });

        if (response.status >= 400 && response.status <= 599) { // Handles all error statuses (400-599)
            const contentType = response.headers?.get('content-type');
            let responseBody;

            try {
                responseBody = contentType?.includes('application/json') ? await response.json() : await response.text();
            } catch (err) {
                responseBody = 'Failed to parse response';
            }

            throw new ApiError(response.status, url.toString(), responseBody, response.headers);
        }

        return response;
    }

    apiGet(path: Path, params: Object = {}, body: BodyInit | null | undefined = undefined, headers: Headers = {}) {
        return this.apiCall('GET', path, params, body, headers);
    }

    apiPut(path: Path, params: Object = {}, body: BodyInit | null | undefined = undefined, headers: Headers = {}) {
        return this.apiCall('PUT', path, params, body, headers);
    }

    apiPost(path: Path, params: Object = {}, body: BodyInit | null | undefined = undefined, headers: Headers = {}) {
        return this.apiCall('POST', path, params, body, headers);
    }

    apiPatch(path: Path, params: Object = {}, body: BodyInit | null | undefined = undefined, headers: Headers = {}) {
        return this.apiCall('PATCH', path, params, body, headers);
    }

    apiDelete(path: Path, params: Object = {}, body: BodyInit | null | undefined = undefined, headers: Headers = {}) {
        return this.apiCall('DELETE', path, params, body, headers);
    }

    /**
     * Fire an event by identifier for a given module (optional) and entity (optional).
     */
    fireEvent(identifier: string, module: string | null = null, entity: EntityBase | undefined = undefined, data = {}, localArgs = {}): Promise<Response> {
        // Do not look the event up. If it does not exist, event.fire() is rejected with a 404.
        const event = new BrezelEvent({identifier, module, brezel: this});
        return event.fire(entity, data, localArgs);
    }

    async fetchModules(layouts = false): Promise<(M[keyof M] & Module)[]> {
        const response = await this.apiGet(['modules'], {layouts});
        const data = await response.json();
        return data as (M[keyof M] & Module)[];
    }

    async fetchModule<T extends keyof M & string | string>(identifier: T): Promise<ModuleByIdentifier<M, T> & Module> {
        const response = await this.apiGet(['modules', identifier]);
        const data = await response.json();
        return data as ModuleByIdentifier<M, T> & Module;
    }

    /**
     * @param id
     * @param {string} module
     * @param {boolean} withHistory also fetch the entity's change history and unread status (before a "read" is registered)
     */
    async fetchEntity<T extends keyof M & string | string>(id: EntityBase['id'], module: T, withHistory: boolean = false): Promise<EntityOfModule<EM, T> | undefined> {
        const response = await this.apiGet(['modules', module, 'resources', id], {history: withHistory || undefined});
        return await response.json() as EntityOfModule<EM, T> | undefined;
    }

    async fetchEntities<T extends keyof M & string | string>(module: T, options: EntitiesRequestOptions<EntityOfModule<EM, T>> = {}): Promise<EntityOfModule<EM, T>[]> {
        const response = await this.apiGet(['modules', module, 'resources'], {
            ...options,
        });
        const json = await response.json();
        return json.data as EntityOfModule<EM, T>[];
    }

    async fetchTotalEntities(module: string, options: EntitiesRequestOptions = {}): Promise<number> {
        const response = await this.apiGet(['modules', module, 'resources', 'total'], {
            ...options,
        });
        const json = await response.json();
        return json.total;
    }

    async fetchView(view: string) {
        const response = await this.apiGet(['views', view]);
        return await response.text();
    }

    async fetchFile(id: EntityBase['id'], size?: 'mini' | 'default') {
        const response = await this.apiGet(['files', id], {size});
        return await response.blob();
    }

    async createEntity<T extends keyof M & string | string>(module: T, entity: Omit<EntityOfModule<EM, T>, 'module' | 'client'>, params = {}): Promise<EntityCreateResponse<EntityOfModule<EM, T>>> {
        const response = await this.apiPost(['modules', module, 'resources'], params,
            JSON.stringify({...entity, module: undefined}), {
                'Content-Type': 'application/json',
            });
        return await response.json() as EntityCreateResponse<EntityOfModule<EM, T>>;
    }

    async updateEntity<T extends keyof M & string | string>(module: T, id: number, entity: Partial<EntityOfModule<EM, T>>, params = {}): Promise<EntityUpdateResponse<EntityOfModule<EM, T>>> {
        const response = await this.apiPut(['modules', module, 'resources', id], params, JSON.stringify(entity), {
            'Content-Type': 'application/json',
        });
        return await response.json() as EntityUpdateResponse<EntityOfModule<EM, T>>;
    }

    saveEntity<T extends keyof M & string | string>(module: T, entity: EntityOfModule<EM, T>, params = {}): Promise<EntityResponse<EntityOfModule<EM, T>>> {
        if (entity.id) {
            return this.updateEntity(module, entity.id, entity, params);
        }
        return this.createEntity(module, entity, params);
    }

    deleteEntity<T extends keyof M & string | string>(module: T, entity: EntityOfModule<EM, T>) {
        return this.apiDelete(['modules', module, 'resources', entity.id]);
    }

    async entityHistory<T extends keyof M & string | string>(module: T, entity: EntityOfModule<EM, T>, page = 1, user = undefined, type = undefined) {
        const response = await this.apiGet(['modules', module, 'resources', entity.id, 'history'], {
            page,
            user,
            type
        });
        return await response.json();
    }

    async addEntityComment<T extends keyof M & string | string>(module: T, entity: EntityOfModule<EM, T>, comment: string) {
        const response = await this.apiPost(['modules', module, 'resources', entity.id, 'comment'], {},
            JSON.stringify({comment: comment.trim()}), {'Content-Type': 'application/json'});
        return await response.json();
    }

    async saveEntityComment<T extends keyof M & string | string>(module: T, entity: EntityOfModule<EM, T>, comment: string, commentId: number) {
        const response = await this.apiPut(['modules', module, 'resources', entity.id, 'comment', commentId], {},
            JSON.stringify({comment: comment.trim()}), {'Content-Type': 'application/json'});
        return await response.json();
    }

    async deleteEntityComment<T extends keyof M & string | string>(module: T, entity: EntityOfModule<EM, T>, comment: string) {
        const response = await this.apiDelete(['modules', module, 'resources', entity.id, 'comment', comment]);
        return await response.json();
    }

    async fetchKeys() {
        const response = await this.apiGet(['keys']);
        return await response.json();
    }

    async fetchSpec() {
        const response = await this.apiGet(['spec']);
        return await response.json();
    }

    async fetchLicensePlans() {
        const response = await this.apiGet(['plans']);
        return await response.json();
    }

    async fetchCurrentPlan() {
        const response = await this.apiGet(['plans', 'currentPlan']);
        return await response.json();
    }

    async fetchVAPIDPublicKey() {
        const response = await this.apiGet(['webPush/publicKey']);
        if (response.status >= 400 && response.status < 600) {
            throw new Error('Could not fetch VAPID public key.');
        }
        return response;
    }

    subscribeToWebPush(subscription: Object) {
        return this.apiPost(['webPush/subscribe'], {}, JSON.stringify({subscription}));
    }

    unsubscribeFromWebPush(subscription: Object) {
        return this.apiPost(['webPush/unsubscribe'], {}, JSON.stringify({subscription}));
    }

    async fetchNotifications(page = undefined) {
        const response = await this.apiGet(['notifications'], {page});
        return await response.json();
    }

    async readNotifications(notifications: Array<NotificationInterface | string>) {
        notifications = notifications.map(
            notification => typeof notification === 'object' ? notification.id : notification);
        const response = await this.apiPatch(['notifications', 'read'], {}, JSON.stringify({notifications}), {
            'Content-Type': 'application/json',
        });
        return await response.json();
    }

    async deleteAllNotifications() {
        const response = await this.apiPatch(['notifications', 'deleteAll'], {}, null, {
            'Content-Type': 'application/json',
        });
        return await response.json();
    }

    async deleteNotifications(notifications: Array<NotificationInterface | string>) {
        notifications = notifications.map(
            notification => typeof notification === 'object' ? notification.id : notification);
        const response = await this.apiDelete(['notifications', 'delete'], {}, JSON.stringify({notifications}), {
            'Content-Type': 'application/json',
        });
        return await response.json();
    }

    callNotificationAction(notification: NotificationInterface | string, action: string) {
        notification = typeof notification === 'object' ? notification.id : notification;
        return this.apiPost(['notification', notification, 'action', action], {}, null);
    }

    async readNotification(notification: NotificationInterface | string) {
        notification = typeof notification === 'object' ? notification.id : notification;
        const response = await this.apiPost(['notification', notification, 'read'], {}, null);
        return await response.json();
    }

    async unreadNotification(notification: NotificationInterface | string) {
        notification = typeof notification === 'object' ? notification.id : notification;
        const response = await this.apiPost(['notification', notification, 'unread'], {}, null);
        return await response.json();
    }

    async fetchTranslations(): Promise<TM> {
        const response = await this.apiGet(['translations']);
        return await response.json() as TM;
    }
}

export default Client;

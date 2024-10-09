import {apiLink} from './util.js';
import BrezelEvent from './event.js';
import Entity, {EntityInterface} from './entity.js';
import Module, {ModuleInterface} from './module.js';
import {NotificationInterface} from "./notification.js";

export interface Options {
    uri: string;
    system: string;
    key?: string;
    token?: string;
}

interface EntitiesRequestOptions {
    filters?: Array<Record<string, unknown>> | Array<Array<Record<string, unknown>>>;
    with?: Array<string>;
    page?: number;
    results?: number;
}

export type Path = Array<unknown>;

type Headers = Record<string, string>;

export default class Client {
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
        const apiHeaders = Object.assign({}, headers);
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
        if (response.status >= 400 && response.status < 600) {
            throw new Error(`Invalid response status ${response.status} for ${url.toString()}`);
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
     *
     * @param identifier
     * @param module
     * @param entity
     * @param data
     * @param localArgs
     * @return {*|Promise<*>}
     */
    fireEvent(identifier: string, module: string | null = null, entity: EntityInterface | null = null, data = {}, localArgs = {}) {
        // Do not look the event up. If it does not exist, event.fire() is rejected with a 404.
        const event = new BrezelEvent({identifier, module, brezel: this});
        return event.fire(entity, data, localArgs);
    }

    async fetchModules(layouts = false): Promise<Module[]> {
        const response = await this.apiGet(['modules'], {layouts});
        const data = await response.json();
        return data.map((module: ModuleInterface) => new Module(module));
    }

    async fetchModule(identifier: string) {
        const response = await this.apiGet(['modules', identifier]);
        const data = await response.json();
        return new Module(data);
    }

    /**
     * @param id
     * @param {string} module
     * @param {boolean} withHistory also fetch the entity's change history and unread status (before a "read" is registered)
     */
    fetchEntity(id: number, module: string, withHistory = false) {
        return this.apiGet(['modules', module, 'resources', id], {history: withHistory || undefined}).then(response => response.json()).then(data => new Entity(data));
    }

    async fetchEntities(module: string, options: EntitiesRequestOptions = {}) {
        try {
            const response = await this.apiGet(['modules', module, 'resources'], {
                ...options,
            });
            const json = await response.json();
            return json.data.map((entity: EntityInterface) => new Entity(entity));
        } catch (e: unknown) {
            throw Error(`Could not fetch entities: ${e instanceof Error ? e.message : e}`);
        }
    }

    async fetchTotalEntities(module: string, options: EntitiesRequestOptions = {}): Promise<number> {
        try {
            const response = await this.apiGet(['modules', module, 'resources', 'total'], {
                ...options,
            });
            const json = await response.json();
            return json.total;
        } catch (e: unknown) {
            throw Error(`Could not fetch entities: ${e instanceof Error ? e.message : e}`);
        }
    }

    fetchView(view: string) {
        return this.apiGet(['views', view]).then(response => response.text());
    }

    fetchFile(id: number) {
        return this.apiGet(['files', id]).then(response => response.blob());
    }

    createEntity(entity: EntityInterface, params = {}) {
        return this.apiPost(['modules', entity.module?.identifier, 'resources'], params,
            JSON.stringify({...entity, module: undefined}), {
                'Content-Type': 'application/json',
            }).then(response => response.json());
    }

    updateEntity(entity: EntityInterface, params = {}) {
        return this.apiPut(['modules', entity.module?.identifier, 'resources', entity.id], params, JSON.stringify(entity), {
            'Content-Type': 'application/json',
        }).then(response => response.json());
    }

    saveEntity(entity: EntityInterface, params = {}) {
        if (entity.id) {
            return this.updateEntity(entity, params);
        }
        return this.createEntity(entity, params);
    }

    deleteEntity(entity: EntityInterface) {
        return this.apiDelete(['modules', entity.module?.identifier, 'resources', entity.id]);
    }

    autoSaveEntity(entity: EntityInterface) {
        const discardDate = new Date();
        let lifetime: number | string = entity.module?.options?.auto_save_lifetime || 3;
        const autoSaveLifetime: number = (typeof lifetime === 'string' ? parseInt(lifetime) : lifetime) || 3;
        discardDate.setDate(discardDate.getDate() + autoSaveLifetime);

        return this.apiPost(['modules', entity.module?.identifier, 'resources', 'autoSave'], {},
            JSON.stringify({...entity, module: undefined, discard_at: discardDate}), {
                'Content-Type': 'application/json',
            }).then(response => response.json());
    }

    restoreEntity(entity: EntityInterface) {
        return this.apiGet(
            ['modules', entity.module?.identifier, 'resources', entity.id ?? 0, 'restore', entity.saveId ?? null]).then(response => response.json());
    }

    fetchAutosaveDiff(entity: EntityInterface) {
        return this.apiGet(['modules', entity.module?.identifier, 'resources', entity.id, 'autosaveDiff']).then(response => response.json());
    }

    fetchAutosaveOptions(module: string) {
        return this.apiGet(['modules', module, 'resources', 'autoSaveOptions']).then(response => response.json());
    }

    entityHistory(entity: EntityInterface, page = 1, user = undefined, type = undefined) {
        return this.apiGet(['modules', entity.module?.identifier, 'resources', entity.id, 'history'], {
            page,
            user,
            type
        }).then(response => response.json());
    }

    entityHistoryAuthors(entity: EntityInterface) {
        return this.apiGet(['modules', entity.module?.identifier, 'resources', entity.id, 'history', 'authors']).then(response => response.json());
    }

    addEntityComment(entity: EntityInterface, comment: string) {
        return this.apiPost(['modules', entity.module?.identifier, 'resources', entity.id, 'comment'], {},
            JSON.stringify({comment: comment.trim()}), {'Content-Type': 'application/json'}).then(response => response.json());
    }

    saveEntityComment(entity: EntityInterface, comment: string, commentId: number) {
        return this.apiPut(['modules', entity.module?.identifier, 'resources', entity.id, 'comment', commentId], {},
            JSON.stringify({comment: comment.trim()}), {'Content-Type': 'application/json'}).then(response => response.json());
    }

    deleteEntityComment(entity: EntityInterface, comment: string) {
        return this.apiDelete(['modules', entity.module?.identifier, 'resources', entity.id, 'comment', comment]).then(response => response.json());
    }

    fetchKeys() {
        return this.apiGet(['keys']).then(response => response.json());
    }

    fetchSpec() {
        return this.apiGet(['spec']).then(response => response.json());
    }

    fetchLicensePlans() {
        return this.apiGet(['plans']).then(response => response.json());
    }

    fetchCurrentPlan() {
        return this.apiGet(['plans', 'currentPlan']).then(response => response.json());
    }

    fetchVAPIDPublicKey() {
        return this.apiGet(['webPush/publicKey']).then(response => {
            if (response.status >= 400 && response.status < 600) {
                throw new Error('Could not fetch VAPID public key.');
            }
            return response;
        });
    }

    subscribeToWebPush(subscription: Object) {
        return this.apiPost(['webPush/subscribe'], {}, JSON.stringify({subscription}));
    }

    unsubscribeFromWebPush(subscription: Object) {
        return this.apiPost(['webPush/unsubscribe'], {}, JSON.stringify({subscription}));
    }

    fetchNotifications(page = undefined) {
        return this.apiGet(['notifications'], {page}).then(response => response.json());
    }

    readNotifications(notifications: Array<NotificationInterface | string>) {
        notifications = notifications.map(
            notification => typeof notification === 'object' ? notification.id : notification);
        return this.apiPatch(['notifications', 'read'], {}, JSON.stringify({notifications}), {
            'Content-Type': 'application/json',
        }).then(response => response.json());
    }

    deleteAllNotifications() {
        return this.apiPatch(['notifications', 'deleteAll'], {}, null, {
            'Content-Type': 'application/json',
        }).then(response => response.json());
    }

    deleteNotifications(notifications: Array<NotificationInterface | string>) {
        notifications = notifications.map(
            notification => typeof notification === 'object' ? notification.id : notification);
        return this.apiDelete(['notifications', 'delete'], {}, JSON.stringify({notifications}), {
            'Content-Type': 'application/json',
        }).then(response => response.json());
    }

    callNotificationAction(notification: NotificationInterface | string, action: string) {
        notification = typeof notification === 'object' ? notification.id : notification;
        return this.apiPost(['notification', notification, 'action', action], {}, null);
    }

    readNotification(notification: NotificationInterface | string) {
        notification = typeof notification === 'object' ? notification.id : notification;
        return this.apiPost(['notification', notification, 'read'], {}, null).then(response => response.json());
    }

    unreadNotification(notification: NotificationInterface | string) {
        notification = typeof notification === 'object' ? notification.id : notification;
        return this.apiPost(['notification', notification, 'unread'], {}, null).then(response => response.json());
    }
}


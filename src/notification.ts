export interface NotificationInterface {
    id: string;
}

export default class Notification {
    public id: string;

    constructor(options: NotificationInterface) {
        this.id = options.id;
    }
}
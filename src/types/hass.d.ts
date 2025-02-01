declare namespace HomeAssistant {
    interface Entity {
        entity_id: string;
        state: string;
        attributes: Record<string, any>;
        last_changed: string;
        last_updated: string;
        context: {
            id: string;
            parent_id?: string;
            user_id?: string;
        };
    }

    interface Service {
        domain: string;
        service: string;
        target?: {
            entity_id?: string | string[];
            device_id?: string | string[];
            area_id?: string | string[];
        };
        service_data?: Record<string, any>;
    }

    interface WebsocketMessage {
        type: string;
        id?: number;
        [key: string]: any;
    }

    interface AuthMessage extends WebsocketMessage {
        type: 'auth';
        access_token: string;
    }

    interface SubscribeEventsMessage extends WebsocketMessage {
        type: 'subscribe_events';
        event_type?: string;
    }

    interface StateChangedEvent {
        event_type: 'state_changed';
        data: {
            entity_id: string;
            new_state: Entity | null;
            old_state: Entity | null;
        };
        origin: string;
        time_fired: string;
        context: {
            id: string;
            parent_id?: string;
            user_id?: string;
        };
    }

    interface Config {
        latitude: number;
        longitude: number;
        elevation: number;
        unit_system: {
            length: string;
            mass: string;
            temperature: string;
            volume: string;
        };
        location_name: string;
        time_zone: string;
        components: string[];
        version: string;
    }

    interface ApiError {
        code: string;
        message: string;
        details?: Record<string, any>;
    }
}

export = HomeAssistant; 
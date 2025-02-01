export interface AuthMessage {
    type: 'auth';
    access_token: string;
}

export interface ResultMessage {
    id: number;
    type: 'result';
    success: boolean;
    result?: any;
}

export interface WebSocketError {
    code: string;
    message: string;
}

export interface Event {
    event_type: string;
    data: any;
    origin: string;
    time_fired: string;
    context: {
        id: string;
        parent_id: string | null;
        user_id: string | null;
    };
}

export interface Entity {
    entity_id: string;
    state: string;
    attributes: Record<string, any>;
    last_changed: string;
    last_updated: string;
    context: {
        id: string;
        parent_id: string | null;
        user_id: string | null;
    };
}

export interface StateChangedEvent extends Event {
    event_type: 'state_changed';
    data: {
        entity_id: string;
        new_state: Entity | null;
        old_state: Entity | null;
    };
}

export interface HassEntity {
    entity_id: string;
    state: string;
    attributes: Record<string, any>;
    last_changed?: string;
    last_updated?: string;
    context?: {
        id: string;
        parent_id?: string;
        user_id?: string;
    };
}

export interface HassState {
    entity_id: string;
    state: string;
    attributes: {
        friendly_name?: string;
        description?: string;
        [key: string]: any;
    };
}

export interface HassEvent {
    event_type: string;
    data: any;
    origin: string;
    time_fired: string;
    context: {
        id: string;
        parent_id?: string;
        user_id?: string;
    };
}


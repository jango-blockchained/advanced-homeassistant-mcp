import { EventEmitter } from 'events';

// Resource types
export enum ResourceType {
    DEVICE = 'device',
    AREA = 'area',
    USER = 'user',
    AUTOMATION = 'automation',
    SCENE = 'scene',
    SCRIPT = 'script',
    GROUP = 'group'
}

// Resource state interface
export interface ResourceState {
    id: string;
    type: ResourceType;
    state: any;
    attributes: Record<string, any>;
    lastUpdated: number;
    context?: Record<string, any>;
}

// Resource relationship types
export enum RelationType {
    CONTAINS = 'contains',
    CONTROLS = 'controls',
    TRIGGERS = 'triggers',
    DEPENDS_ON = 'depends_on',
    GROUPS = 'groups'
}

// Resource relationship interface
export interface ResourceRelationship {
    sourceId: string;
    targetId: string;
    type: RelationType;
    metadata?: Record<string, any>;
}

// Context manager class
export class ContextManager extends EventEmitter {
    private resources: Map<string, ResourceState> = new Map();
    private relationships: ResourceRelationship[] = [];
    private stateHistory: Map<string, ResourceState[]> = new Map();
    private historyLimit = 100;

    constructor() {
        super();
    }

    // Resource management
    public addResource(resource: ResourceState): void {
        this.resources.set(resource.id, resource);
        this.emit('resource_added', resource);
    }

    public updateResource(id: string, update: Partial<ResourceState>): void {
        const resource = this.resources.get(id);
        if (resource) {
            // Store current state in history
            this.addToHistory(resource);

            // Update resource
            const updatedResource = {
                ...resource,
                ...update,
                lastUpdated: Date.now()
            };
            this.resources.set(id, updatedResource);
            this.emit('resource_updated', updatedResource);
        }
    }

    public removeResource(id: string): void {
        const resource = this.resources.get(id);
        if (resource) {
            this.resources.delete(id);
            // Remove related relationships
            this.relationships = this.relationships.filter(
                rel => rel.sourceId !== id && rel.targetId !== id
            );
            this.emit('resource_removed', resource);
        }
    }

    // Relationship management
    public addRelationship(relationship: ResourceRelationship): void {
        this.relationships.push(relationship);
        this.emit('relationship_added', relationship);
    }

    public removeRelationship(sourceId: string, targetId: string, type: RelationType): void {
        const index = this.relationships.findIndex(
            rel => rel.sourceId === sourceId && rel.targetId === targetId && rel.type === type
        );
        if (index !== -1) {
            const removed = this.relationships.splice(index, 1)[0];
            this.emit('relationship_removed', removed);
        }
    }

    // History management
    private addToHistory(state: ResourceState): void {
        const history = this.stateHistory.get(state.id) || [];
        history.push({ ...state });
        if (history.length > this.historyLimit) {
            history.shift();
        }
        this.stateHistory.set(state.id, history);
    }

    public getHistory(id: string): ResourceState[] {
        return this.stateHistory.get(id) || [];
    }

    // Context queries
    public getResource(id: string): ResourceState | undefined {
        return this.resources.get(id);
    }

    public getResourcesByType(type: ResourceType): ResourceState[] {
        return Array.from(this.resources.values()).filter(
            resource => resource.type === type
        );
    }

    public getRelatedResources(
        id: string,
        type?: RelationType,
        depth: number = 1
    ): ResourceState[] {
        const related = new Set<ResourceState>();
        const visited = new Set<string>();

        const traverse = (currentId: string, currentDepth: number) => {
            if (currentDepth > depth || visited.has(currentId)) return;
            visited.add(currentId);

            this.relationships
                .filter(rel =>
                    (rel.sourceId === currentId || rel.targetId === currentId) &&
                    (!type || rel.type === type)
                )
                .forEach(rel => {
                    const relatedId = rel.sourceId === currentId ? rel.targetId : rel.sourceId;
                    const relatedResource = this.resources.get(relatedId);
                    if (relatedResource) {
                        related.add(relatedResource);
                        traverse(relatedId, currentDepth + 1);
                    }
                });
        };

        traverse(id, 0);
        return Array.from(related);
    }

    // Context analysis
    public analyzeResourceUsage(id: string): {
        dependencies: string[];
        dependents: string[];
        groups: string[];
        usage: {
            triggerCount: number;
            controlCount: number;
            groupCount: number;
        };
    } {
        const dependencies = this.relationships
            .filter(rel => rel.sourceId === id && rel.type === RelationType.DEPENDS_ON)
            .map(rel => rel.targetId);

        const dependents = this.relationships
            .filter(rel => rel.targetId === id && rel.type === RelationType.DEPENDS_ON)
            .map(rel => rel.sourceId);

        const groups = this.relationships
            .filter(rel => rel.targetId === id && rel.type === RelationType.GROUPS)
            .map(rel => rel.sourceId);

        const usage = {
            triggerCount: this.relationships.filter(
                rel => rel.sourceId === id && rel.type === RelationType.TRIGGERS
            ).length,
            controlCount: this.relationships.filter(
                rel => rel.sourceId === id && rel.type === RelationType.CONTROLS
            ).length,
            groupCount: groups.length
        };

        return { dependencies, dependents, groups, usage };
    }

    // Event subscriptions
    public subscribeToResource(
        id: string,
        callback: (state: ResourceState) => void
    ): () => void {
        const handler = (resource: ResourceState) => {
            if (resource.id === id) {
                callback(resource);
            }
        };

        this.on('resource_updated', handler);
        return () => this.off('resource_updated', handler);
    }

    public subscribeToType(
        type: ResourceType,
        callback: (state: ResourceState) => void
    ): () => void {
        const handler = (resource: ResourceState) => {
            if (resource.type === type) {
                callback(resource);
            }
        };

        this.on('resource_updated', handler);
        return () => this.off('resource_updated', handler);
    }
}

// Export context manager instance
export const contextManager = new ContextManager(); 
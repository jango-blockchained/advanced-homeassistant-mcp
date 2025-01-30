import { jest } from '@jest/globals';
import { ContextManager, ResourceType, RelationType, ResourceState, ResourceRelationship } from '../../src/context/index.js';

describe('Context Manager', () => {
    let contextManager: ContextManager;

    beforeEach(() => {
        contextManager = new ContextManager();
    });

    describe('Resource Management', () => {
        const testResource: ResourceState = {
            id: 'test1',
            type: ResourceType.DEVICE,
            state: 'on',
            attributes: { name: 'Test Device' },
            lastUpdated: Date.now()
        };

        it('should add resources', () => {
            const addHandler = jest.fn();
            contextManager.on('resource_added', addHandler);

            contextManager.addResource(testResource);

            const resource = contextManager.getResource('test1');
            expect(resource).toEqual(testResource);
            expect(addHandler).toHaveBeenCalledWith(testResource);
        });

        it('should update resources', () => {
            const updateHandler = jest.fn();
            contextManager.on('resource_updated', updateHandler);

            contextManager.addResource(testResource);
            contextManager.updateResource('test1', {
                state: 'off',
                attributes: { ...testResource.attributes, brightness: 50 }
            });

            const resource = contextManager.getResource('test1');
            expect(resource?.state).toBe('off');
            expect(resource?.attributes.brightness).toBe(50);
            expect(updateHandler).toHaveBeenCalled();
        });

        it('should remove resources', () => {
            const removeHandler = jest.fn();
            contextManager.on('resource_removed', removeHandler);

            contextManager.addResource(testResource);
            contextManager.removeResource('test1');

            expect(contextManager.getResource('test1')).toBeUndefined();
            expect(removeHandler).toHaveBeenCalledWith(testResource);
        });

        it('should get resources by type', () => {
            const resources = [
                testResource,
                {
                    id: 'test2',
                    type: ResourceType.DEVICE,
                    state: 'off',
                    attributes: {},
                    lastUpdated: Date.now()
                },
                {
                    id: 'area1',
                    type: ResourceType.AREA,
                    state: 'active',
                    attributes: {},
                    lastUpdated: Date.now()
                }
            ];

            resources.forEach(r => contextManager.addResource(r));

            const devices = contextManager.getResourcesByType(ResourceType.DEVICE);
            expect(devices).toHaveLength(2);
            expect(devices.every((d: ResourceState) => d.type === ResourceType.DEVICE)).toBe(true);
        });
    });

    describe('Relationship Management', () => {
        const testRelationship: ResourceRelationship = {
            sourceId: 'device1',
            targetId: 'area1',
            type: RelationType.CONTAINS
        };

        beforeEach(() => {
            // Add test resources
            contextManager.addResource({
                id: 'device1',
                type: ResourceType.DEVICE,
                state: 'on',
                attributes: {},
                lastUpdated: Date.now()
            });
            contextManager.addResource({
                id: 'area1',
                type: ResourceType.AREA,
                state: 'active',
                attributes: {},
                lastUpdated: Date.now()
            });
        });

        it('should add relationships', () => {
            const addHandler = jest.fn();
            contextManager.on('relationship_added', addHandler);

            contextManager.addRelationship(testRelationship);

            const related = contextManager.getRelatedResources('device1');
            expect(related).toHaveLength(2);
            expect(related.some(r => r.id === 'area1')).toBe(true);
            expect(addHandler).toHaveBeenCalledWith(testRelationship);
        });

        it('should remove relationships', () => {
            const removeHandler = jest.fn();
            contextManager.on('relationship_removed', removeHandler);

            contextManager.addRelationship(testRelationship);
            contextManager.removeRelationship(
                'device1',
                'area1',
                RelationType.CONTAINS
            );

            const related = contextManager.getRelatedResources('device1');
            expect(related).toHaveLength(0);
            expect(removeHandler).toHaveBeenCalled();
        });

        it('should get related resources with depth', () => {
            // Create a chain: device1 -> area1 -> area2
            contextManager.addResource({
                id: 'area2',
                type: ResourceType.AREA,
                state: 'active',
                attributes: {},
                lastUpdated: Date.now()
            });

            contextManager.addRelationship({
                sourceId: 'device1',
                targetId: 'area1',
                type: RelationType.CONTAINS
            });
            contextManager.addRelationship({
                sourceId: 'area1',
                targetId: 'area2',
                type: RelationType.CONTAINS
            });

            const relatedDepth1 = contextManager.getRelatedResources('device1', undefined, 1);
            expect(relatedDepth1).toHaveLength(3);

            const relatedDepth2 = contextManager.getRelatedResources('device1', undefined, 2);
            expect(relatedDepth2).toHaveLength(3);
        });
    });

    describe('Resource Analysis', () => {
        beforeEach(() => {
            // Setup test resources and relationships
            const resources = [
                {
                    id: 'device1',
                    type: ResourceType.DEVICE,
                    state: 'on',
                    attributes: {},
                    lastUpdated: Date.now()
                },
                {
                    id: 'automation1',
                    type: ResourceType.AUTOMATION,
                    state: 'on',
                    attributes: {},
                    lastUpdated: Date.now()
                },
                {
                    id: 'group1',
                    type: ResourceType.GROUP,
                    state: 'on',
                    attributes: {},
                    lastUpdated: Date.now()
                }
            ];

            resources.forEach(r => contextManager.addResource(r));

            const relationships = [
                {
                    sourceId: 'automation1',
                    targetId: 'device1',
                    type: RelationType.CONTROLS
                },
                {
                    sourceId: 'device1',
                    targetId: 'group1',
                    type: RelationType.DEPENDS_ON
                },
                {
                    sourceId: 'group1',
                    targetId: 'device1',
                    type: RelationType.GROUPS
                }
            ];

            relationships.forEach(r => contextManager.addRelationship(r));
        });

        it('should analyze resource usage', () => {
            const analysis = contextManager.analyzeResourceUsage('device1');

            expect(analysis.dependencies).toHaveLength(1);
            expect(analysis.dependencies[0]).toBe('group1');
            expect(analysis.dependents).toHaveLength(0);
            expect(analysis.groups).toHaveLength(1);
            expect(analysis.usage.controlCount).toBe(0);
            expect(analysis.usage.triggerCount).toBe(0);
            expect(analysis.usage.groupCount).toBe(1);
        });
    });

    describe('Event Subscriptions', () => {
        it('should handle resource subscriptions', () => {
            const callback = jest.fn();
            const unsubscribe = contextManager.subscribeToResource('test1', callback);

            contextManager.addResource({
                id: 'test1',
                type: ResourceType.DEVICE,
                state: 'on',
                attributes: {},
                lastUpdated: Date.now()
            });

            contextManager.updateResource('test1', { state: 'off' });
            expect(callback).toHaveBeenCalled();

            unsubscribe();
            contextManager.updateResource('test1', { state: 'on' });
            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('should handle type subscriptions', () => {
            const callback = jest.fn();
            const unsubscribe = contextManager.subscribeToType(ResourceType.DEVICE, callback);

            const resource = {
                id: 'test1',
                type: ResourceType.DEVICE,
                state: 'on',
                attributes: {},
                lastUpdated: Date.now()
            };

            contextManager.addResource(resource);
            contextManager.updateResource('test1', { state: 'off' });
            expect(callback).toHaveBeenCalled();

            unsubscribe();
            contextManager.updateResource('test1', { state: 'on' });
            expect(callback).toHaveBeenCalledTimes(1);
        });
    });
}); 
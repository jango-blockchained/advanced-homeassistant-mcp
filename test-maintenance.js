import { get_hass } from './dist/hass/index.js';

async function testMaintenance() {
    try {
        console.log('🔍 Testing Maintenance Tool...\n');
        
        // Test device health check
        const hass = await get_hass();
        const states = await hass.getStates();
        
        console.log(`📊 Total entities: ${states.length}`);
        
        const unavailable = states.filter(s => s.state === 'unavailable');
        console.log(`⚠️  Unavailable entities: ${unavailable.length}`);
        
        console.log('\n🔴 Unavailable lights:');
        const unavailableLights = unavailable.filter(s => s.entity_id.startsWith('light.'));
        unavailableLights.forEach(light => {
            console.log(`   - ${light.entity_id} (${light.attributes.friendly_name || 'No name'})`);
        });
        
        console.log('\n✅ Lights currently ON:');
        const lightsOn = states.filter(s => s.entity_id.startsWith('light.') && s.state === 'on');
        console.log(`   Total: ${lightsOn.length} lights`);
        lightsOn.slice(0, 5).forEach(light => {
            console.log(`   - ${light.attributes.friendly_name || light.entity_id}`);
        });
        
        console.log('\n✅ Test completed successfully!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
    process.exit(0);
}

testMaintenance();

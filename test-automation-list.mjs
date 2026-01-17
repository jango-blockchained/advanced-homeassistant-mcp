#!/usr/bin/env node

import WebSocket from 'ws';
import fs from 'fs';

// Load HA_TOKEN from ~/.mcp-env
const envContent = fs.readFileSync(`${process.env.HOME}/.mcp-env`, 'utf-8');
const tokenMatch = envContent.match(/HA_TOKEN=(.+)/);
const HA_TOKEN = tokenMatch ? tokenMatch[1].trim() : null;

if (!HA_TOKEN) {
  console.error('HA_TOKEN not found in ~/.mcp-env');
  process.exit(1);
}

const ws = new WebSocket('ws://192.168.40.195:8123/api/websocket');
let msgId = 1;

ws.on('open', () => {
  console.log('WebSocket connected');
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  
  if (msg.type === 'auth_required') {
    ws.send(JSON.stringify({
      type: 'auth',
      access_token: HA_TOKEN
    }));
  } else if (msg.type === 'auth_ok') {
    console.log('Authenticated successfully');
    ws.send(JSON.stringify({
      id: msgId++,
      type: 'config/automation/config'
    }));
  } else if (msg.type === 'result' && msg.success) {
    const automations = msg.result || [];
    console.log(`\nFound ${automations.length} automations\n`);

    const frontDoorAuto = automations.find(a =>
      a.alias?.includes('Front Door') &&
      a.alias?.includes('Person Notification') &&
      a.alias?.includes('Shield')
    );

    if (frontDoorAuto) {
      console.log('=== TARGET AUTOMATION FOUND ===');
      console.log('Alias:', frontDoorAuto.alias);
      console.log('ID:', frontDoorAuto.id);
      console.log('Entity ID:', frontDoorAuto.entity_id);
      console.log('Has "id" field:', 'id' in frontDoorAuto);
      console.log('\nFull automation structure:');
      console.log(JSON.stringify(frontDoorAuto, null, 2));
    } else {
      console.log('Front Door Shield automation not found');
      console.log('\nSearching for any Front Door automations...');
      const frontDoorAutomations = automations.filter(a => a.alias?.includes('Front Door'));
      console.log(`Found ${frontDoorAutomations.length} Front Door automations:`);
      frontDoorAutomations.forEach(a => {
        console.log(`  - ${a.alias} (id: ${a.id})`);
      });
    }

    ws.close();
  } else if (msg.type === 'result' && !msg.success) {
    console.error('Request failed:', msg);
    ws.close();
  }
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err);
});

ws.on('close', () => {
  process.exit(0);
});

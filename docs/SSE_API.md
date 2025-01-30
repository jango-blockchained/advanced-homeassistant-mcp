# Home Assistant MCP Server-Sent Events (SSE) API Documentation

## Overview

The SSE API provides real-time updates from Home Assistant through a persistent connection. This allows clients to receive instant notifications about state changes, events, and other activities without polling.

## Quick Reference

### Available Endpoints

| Endpoint | Method | Description | Authentication |
|----------|---------|-------------|----------------|
| `/subscribe_events` | POST | Subscribe to real-time events and state changes | Required |
| `/get_sse_stats` | POST | Get statistics about current SSE connections | Required |

### Event Types Available

| Event Type | Description | Example Subscription |
|------------|-------------|---------------------|
| `state_changed` | Entity state changes | `events=state_changed` |
| `service_called` | Service call events | `events=service_called` |
| `automation_triggered` | Automation trigger events | `events=automation_triggered` |
| `script_executed` | Script execution events | `events=script_executed` |
| `ping` | Connection keepalive (system) | Automatic |
| `error` | Error notifications (system) | Automatic |

### Subscription Options

| Option | Description | Example |
|--------|-------------|---------|
| `entity_id` | Subscribe to specific entity | `entity_id=light.living_room` |
| `domain` | Subscribe to entire domain | `domain=light` |
| `events` | Subscribe to event types | `events=state_changed,automation_triggered` |

## Authentication

All SSE connections require authentication using your Home Assistant token.

```javascript
const token = 'YOUR_HASS_TOKEN';
```

## Endpoints

### Subscribe to Events

`POST /subscribe_events`

Subscribe to Home Assistant events and state changes.

#### Parameters

| Parameter  | Type     | Required | Description |
|------------|----------|----------|-------------|
| token      | string   | Yes      | Your Home Assistant authentication token |
| events     | string[] | No       | Array of event types to subscribe to |
| entity_id  | string   | No       | Specific entity ID to monitor |
| domain     | string   | No       | Domain to monitor (e.g., "light", "switch") |

#### Example Request

```javascript
const eventSource = new EventSource(`http://localhost:3000/subscribe_events?token=${token}&entity_id=light.living_room&domain=switch&events=state_changed,automation_triggered`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

eventSource.onerror = (error) => {
  console.error('SSE Error:', error);
  eventSource.close();
};
```

### Get SSE Statistics

`POST /get_sse_stats`

Get current statistics about SSE connections and subscriptions.

#### Parameters

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| token     | string | Yes      | Your Home Assistant authentication token |

#### Example Request

```bash
curl -X POST http://localhost:3000/get_sse_stats \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_HASS_TOKEN"}'
```

## Event Types

### Standard Events

1. **connection**
   - Sent when a client connects successfully
   ```json
   {
     "type": "connection",
     "status": "connected",
     "id": "client_uuid",
     "authenticated": true,
     "timestamp": "2024-02-10T12:00:00.000Z"
   }
   ```

2. **state_changed**
   - Sent when an entity's state changes
   ```json
   {
     "type": "state_changed",
     "data": {
       "entity_id": "light.living_room",
       "state": "on",
       "attributes": {
         "brightness": 255,
         "color_temp": 370
       },
       "last_changed": "2024-02-10T12:00:00.000Z",
       "last_updated": "2024-02-10T12:00:00.000Z"
     },
     "timestamp": "2024-02-10T12:00:00.000Z"
   }
   ```

3. **service_called**
   - Sent when a Home Assistant service is called
   ```json
   {
     "type": "service_called",
     "data": {
       "domain": "light",
       "service": "turn_on",
       "service_data": {
         "entity_id": "light.living_room",
         "brightness": 255
       }
     },
     "timestamp": "2024-02-10T12:00:00.000Z"
   }
   ```

4. **automation_triggered**
   - Sent when an automation is triggered
   ```json
   {
     "type": "automation_triggered",
     "data": {
       "automation_id": "automation.morning_routine",
       "trigger": {
         "platform": "time",
         "at": "07:00:00"
       }
     },
     "timestamp": "2024-02-10T12:00:00.000Z"
   }
   ```
5. **script_executed**
   - Sent when a script is executed
   ```json
   {
     "type": "script_executed",
     "data": {
       "script_id": "script.welcome_home",
       "execution_data": {
         "status": "completed"
       }
     },
     "timestamp": "2024-02-10T12:00:00.000Z"
   }
   ```

### System Events

1. **ping**
   - Sent every 30 seconds to keep the connection alive
   ```json
   {
     "type": "ping",
     "timestamp": "2024-02-10T12:00:00.000Z"
   }
   ```

2. **error**
   - Sent when an error occurs
   ```json
   {
     "type": "error",
     "error": "rate_limit_exceeded",
     "message": "Too many requests, please try again later",
     "timestamp": "2024-02-10T12:00:00.000Z"
   }
   ```

## Rate Limiting

- Maximum 1000 requests per minute per client
- Rate limits are reset every minute
- Exceeding the rate limit will result in an error event

## Connection Management

- Maximum 100 concurrent clients
- Connections timeout after 5 minutes of inactivity
- Ping messages are sent every 30 seconds
- Clients should handle reconnection on connection loss

## Example Implementation

```javascript
class HomeAssistantSSE {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.eventSource = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connect(options = {}) {
    const params = new URLSearchParams({
      token: this.token,
      ...(options.events && { events: options.events.join(',') }),
      ...(options.entity_id && { entity_id: options.entity_id }),
      ...(options.domain && { domain: options.domain })
    });

    this.eventSource = new EventSource(`${this.baseUrl}/subscribe_events?${params}`);

    this.eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleEvent(data);
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      this.handleError(error);
    };
  }

  handleEvent(data) {
    switch (data.type) {
      case 'connection':
        this.reconnectAttempts = 0;
        console.log('Connected:', data);
        break;
      case 'ping':
        // Connection is alive
        break;
      case 'error':
        console.error('Server Error:', data);
        break;
      default:
        // Handle other event types
        console.log('Event:', data);
    }
  }

  handleError(error) {
    this.eventSource?.close();
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connect(), delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  disconnect() {
    this.eventSource?.close();
    this.eventSource = null;
  }
}

// Usage example
const client = new HomeAssistantSSE('http://localhost:3000', 'YOUR_HASS_TOKEN');
client.connect({
  events: ['state_changed', 'automation_triggered'],
  domain: 'light'
});
```

## Best Practices

1. **Error Handling**
   - Implement exponential backoff for reconnection attempts
   - Handle connection timeouts gracefully
   - Monitor for rate limit errors

2. **Resource Management**
   - Close EventSource when no longer needed
   - Limit subscriptions to necessary events/entities
   - Handle cleanup on page unload

3. **Security**
   - Never expose the authentication token in client-side code
   - Use HTTPS in production
   - Validate all incoming data

4. **Performance**
   - Subscribe only to needed events
   - Implement client-side event filtering
   - Monitor memory usage for long-running connections

## Troubleshooting

### Common Issues

1. **Connection Failures**
   - Verify your authentication token is valid
   - Check server URL is accessible
   - Ensure proper network connectivity
   - Verify SSL/TLS configuration if using HTTPS

2. **Missing Events**
   - Confirm subscription parameters are correct
   - Check rate limiting status
   - Verify entity/domain exists
   - Monitor client-side event handlers

3. **Performance Issues**
   - Reduce number of subscriptions
   - Implement client-side filtering
   - Monitor memory usage
   - Check network latency

### Debugging Tips

1. Enable console logging:
```javascript
const client = new HomeAssistantSSE('http://localhost:3000', 'YOUR_HASS_TOKEN');
client.debug = true; // Enables detailed logging
```

2. Monitor network traffic:
```javascript
// Add event listeners for connection states
eventSource.addEventListener('open', () => {
  console.log('Connection opened');
});

eventSource.addEventListener('error', (e) => {
  console.log('Connection error:', e);
});
```

3. Track subscription status:
```javascript
// Get current subscriptions
const stats = await fetch('/get_sse_stats', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

console.log('Current subscriptions:', stats);
``` 

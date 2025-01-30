# Home Assistant MCP API Documentation

## Overview

The Home Assistant Model Context Protocol (MCP) Server provides a comprehensive API for managing and controlling your Home Assistant instance. This document outlines all available endpoints, their parameters, and includes practical examples.

## Authentication

All API requests require authentication using a Bearer token.

```http
Authorization: Bearer your_home_assistant_token
```

## Rate Limiting

The API implements rate limiting with the following defaults:
- 100 requests per 15-minute window per IP
- Model-specific limits:
  - Claude: 100 requests/minute, 1000/hour
  - GPT-4: 50 requests/minute, 500/hour
  - Custom: 200 requests/minute, 2000/hour

## Endpoints

### 1. Natural Language Processing

#### POST /interpret

Interprets natural language commands for Home Assistant control.

**Request Body:**
```json
{
  "input": "Turn on the living room lights",
  "context": {
    "user_id": "user123",
    "session_id": "sess456",
    "timestamp": "2024-03-20T10:30:00Z",
    "location": "home",
    "previous_actions": [],
    "environment_state": {}
  },
  "model": "claude"  // Optional: defaults to "claude"
}
```

**Response:**
```json
{
  "natural_language": "I'll turn on the living room lights",
  "structured_data": {
    "success": true,
    "action_taken": "turn_on",
    "entities_affected": ["light.living_room"],
    "state_changes": {
      "state": "on"
    }
  },
  "next_suggestions": [
    "Would you like to adjust the brightness?",
    "Should I turn on other lights?",
    "Would you like to save this as a scene?"
  ],
  "confidence": 0.95,
  "context": {
    "user_id": "user123",
    "session_id": "sess456",
    "timestamp": "2024-03-20T10:30:00Z"
  }
}
```

### 2. Device Control

#### POST /control

Controls Home Assistant devices and services.

**Request Body:**
```json
{
  "command": "turn_on",
  "entity_id": "light.living_room",
  "brightness": 255,
  "color_temp": 4000,
  "rgb_color": [255, 0, 0]
}
```

**Example Commands by Device Type:**

**1. Lights:**
```json
{
  "command": "turn_on",
  "entity_id": "light.bedroom",
  "brightness": 128,
  "color_temp": 3500
}
```

**2. Climate:**
```json
{
  "command": "set_temperature",
  "entity_id": "climate.living_room",
  "temperature": 72,
  "hvac_mode": "heat"
}
```

**3. Covers:**
```json
{
  "command": "set_position",
  "entity_id": "cover.garage",
  "position": 50
}
```

### 3. History

#### GET /history

Retrieves state history for entities.

**Query Parameters:**
- `entity_id` (required): Entity ID to get history for
- `start_time` (optional): Start time in ISO format
- `end_time` (optional): End time in ISO format
- `minimal_response` (optional): Boolean to reduce response size
- `significant_changes_only` (optional): Boolean to filter minor changes

**Example Request:**
```http
GET /history?entity_id=light.living_room&start_time=2024-03-19T00:00:00Z&minimal_response=true
```

### 4. Scenes

#### GET /scenes

Lists all available scenes.

**Response:**
```json
{
  "success": true,
  "scenes": [
    {
      "entity_id": "scene.movie_time",
      "name": "Movie Time",
      "description": "Dim lights and lower blinds"
    }
  ]
}
```

#### POST /scenes/activate

Activates a scene.

**Request Body:**
```json
{
  "scene_id": "scene.movie_time"
}
```

### 5. Automations

#### GET /automations

Lists all automations.

**Response:**
```json
{
  "success": true,
  "automations": [
    {
      "entity_id": "automation.morning_routine",
      "name": "Morning Routine",
      "state": "on",
      "last_triggered": "2024-03-20T06:00:00Z"
    }
  ]
}
```

#### POST /automations

Creates or modifies automations.

**Request Body (Create):**
```json
{
  "action": "create",
  "config": {
    "alias": "Morning Routine",
    "description": "Turn on lights at sunrise",
    "trigger": {
      "platform": "sun",
      "event": "sunrise"
    },
    "action": {
      "service": "light.turn_on",
      "target": {
        "entity_id": "light.living_room"
      }
    }
  }
}
```

### 6. Add-ons

#### GET /addons

Lists available add-ons.

**Response:**
```json
{
  "success": true,
  "addons": [
    {
      "name": "File Editor",
      "slug": "core_configurator",
      "description": "Simple browser-based file editor",
      "version": "5.6.0",
      "installed": true,
      "available": true,
      "state": "started"
    }
  ]
}
```

#### POST /addons

Manages add-ons.

**Request Body (Install):**
```json
{
  "action": "install",
  "slug": "core_configurator",
  "version": "5.6.0"
}
```

### 7. Package Management (HACS)

#### GET /packages

Lists available HACS packages.

**Query Parameters:**
- `category`: One of ["integration", "plugin", "theme", "python_script", "appdaemon", "netdaemon"]

**Response:**
```json
{
  "success": true,
  "packages": [
    {
      "name": "Custom Component",
      "repository": "owner/repo",
      "category": "integration",
      "installed_version": "1.0.0",
      "available_version": "1.1.0"
    }
  ]
}
```

#### POST /packages

Manages HACS packages.

**Request Body (Install):**
```json
{
  "action": "install",
  "category": "integration",
  "repository": "owner/repo",
  "version": "1.1.0"
}
```

## Error Handling

All endpoints return errors in a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "suggestion": "Suggestion to fix the error",
    "recovery_options": [
      "Option 1",
      "Option 2"
    ]
  }
}
```

Common HTTP status codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Too Many Requests
- 500: Internal Server Error

## WebSocket Events

The server supports WebSocket connections for real-time updates.

### Connection

```javascript
const ws = new WebSocket('ws://your-server/api/websocket');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

### Event Subscription

```javascript
// Subscribe to all events
ws.send(JSON.stringify({
  type: 'subscribe_events'
}));

// Subscribe to specific event type
ws.send(JSON.stringify({
  type: 'subscribe_events',
  event_type: 'state_changed'
}));
```

## Security Best Practices

1. Always use HTTPS in production
2. Store tokens securely
3. Implement proper token rotation
4. Monitor and log API usage
5. Regular security audits

## Rate Limiting Headers

The API includes rate limit information in response headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1621436800
``` 
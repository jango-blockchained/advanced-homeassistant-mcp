# Microphone Permission Setup

This document explains at which points microphone permissions are granted in the homeassistant-mcp Docker Compose stack.

## Permission Grant Points

### 1. **Dockerfile - User Setup (Build Time)**
**File:** `Dockerfile` (Lines 68-69)

```dockerfile
# Create a non-root user and add to audio group
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --gid 1001 bunjs && \
    adduser bunjs audio
```

**What happens:**
- Creates a non-root user `bunjs` (UID: 1001)
- Creates a group `nodejs` (GID: 1001)
- **Adds `bunjs` user to the `audio` group** ← **FIRST PERMISSION GRANT**
- This grants the user basic audio device access via group membership

**Why:** Running as a non-root user is a security best practice. The `audio` group membership allows access to `/dev/snd/*` devices.

---

### 2. **docker-compose.speech.yml - wake-word Service (Runtime)**
**File:** `docker-compose.speech.yml` (Lines 59-60)

```yaml
group_add:
  - "${AUDIO_GID:-29}"
```

**What happens:**
- Adds additional group ID (default: 29, which is typically the `audio` group on the host)
- This allows the container to inherit host audio group permissions
- **SECOND PERMISSION GRANT** ← Bridges container audio group with host audio group

**Why:** The host's audio system uses group ID 29 for audio device access. By adding this group to the container, the container process can access the host's audio devices.

---

### 3. **docker-compose.speech.yml - wake-word Device Access (Runtime)**
**File:** `docker-compose.speech.yml` (Lines 48-49)

```yaml
devices:
  - /dev/snd:/dev/snd
```

**What happens:**
- Mounts the entire `/dev/snd/` directory from the host into the container
- **THIRD PERMISSION GRANT** ← Direct device node access
- This makes sound device nodes available inside the container

**Why:** `/dev/snd/` contains all the sound card device nodes. Without this mount, the container cannot see or access the host's audio hardware.

---

### 4. **docker-compose.speech.yml - wake-word Volume Mounts (Runtime)**
**File:** `docker-compose.speech.yml` (Lines 51-52)

```yaml
volumes:
  - /run/user/1000/pulse/native:/run/user/1000/pulse/native
```

**What happens:**
- Mounts the PulseAudio Unix socket from the host into the container
- **FOURTH PERMISSION GRANT** ← PulseAudio IPC access
- This allows the container to communicate with the host's audio server

**Why:** PulseAudio uses Unix sockets for inter-process communication. Mounting this socket allows the container to use the host's audio server.

---

### 5. **docker-compose.speech.yml - wake-word Privileged Mode & Network (Runtime)**
**File:** `docker-compose.speech.yml` (Lines 63-64)

```yaml
privileged: true
network_mode: host
```

**What happens:**
- `privileged: true` ← **FIFTH PERMISSION GRANT** - Grants elevated permissions to the container
- `network_mode: host` - Uses the host's network namespace directly
- Combined, these allow unrestricted access to host resources including audio

**Why:** Privileged mode bypasses most security restrictions. Host network mode allows the service to bind to host ports and access host hardware directly.

---

### 6. **Dockerfile - Audio Setup Script (Runtime)**
**File:** `Dockerfile` (Lines 87-89)

```dockerfile
# Ensure audio setup script is executable
RUN chmod +x /app/docker/speech/setup-audio.sh
```

**What happens:**
- Makes the setup script executable
- When the app starts, it runs: `/app/docker/speech/setup-audio.sh`

**File:** `docker/speech/setup-audio.sh`

**What the script does:**
- Waits for PulseAudio socket: `/run/user/1000/pulse/native`
- Verifies PulseAudio connection: `pactl info`
- Lists audio sources: `pactl list sources`
- Sets microphone sensitivity: `pactl set-source-volume`
- Sets speaker volume: `pactl set-sink-volume`

**Why:** This runtime setup ensures the audio environment is properly configured before the application starts using audio.

---

### 7. **Dockerfile - Non-root User Execution (Runtime)**
**File:** `Dockerfile` (Line 80)

```dockerfile
USER bunjs
```

**What happens:**
- **SIXTH PERMISSION GRANT** - Switches execution context to the `bunjs` user
- All subsequent commands run as `bunjs` (with audio group membership from step 1)
- The user inherits the `audio` group permissions granted during user creation

**Why:** Maintains security by running the application as a non-root user, while preserving audio access through group membership.

---

## Permission Chain Summary

```
Build Time:
    ↓
    [1] Dockerfile: Create bunjs user + add to audio group
    ↓
    [2] Dockerfile: chmod +x setup-audio.sh
    ↓
    [3] Dockerfile: USER bunjs (switch to non-root)
    ↓
Runtime (Docker Compose):
    ↓
    [4] docker-compose: Add audio GID 29 (group_add)
    ↓
    [5] docker-compose: Mount /dev/snd (devices)
    ↓
    [6] docker-compose: Mount PulseAudio socket (volumes)
    ↓
    [7] docker-compose: privileged: true + network_mode: host
    ↓
    [8] Runtime: Audio setup script runs (setup-audio.sh)
    ↓
    [9] Application: bunjs user now has full audio access
```

## Access Levels by Component

### homeassistant-mcp (Main Application)
- ✅ Audio group membership (from Dockerfile)
- ✅ Access to PulseAudio socket (from docker-compose.yml)
- ⚠️ Limited audio access (not privileged, not host network)

### wake-word Service
- ✅ Audio group membership (from docker-compose.speech.yml: group_add)
- ✅ Access to /dev/snd (from docker-compose.speech.yml: devices)
- ✅ Access to PulseAudio socket (from docker-compose.speech.yml: volumes)
- ✅ Privileged mode (from docker-compose.speech.yml: privileged)
- ✅ Host network (from docker-compose.speech.yml: network_mode)
- **Result: FULL AUDIO ACCESS** ← Can capture microphone input

### fast-whisper Service
- ✅ Access to audio data volume
- ⚠️ No direct microphone access (receives audio from other services)

## Key Points

1. **Multi-Layer Permissions**: Microphone access is granted through multiple complementary mechanisms:
   - User group membership
   - Device node mounting
   - Socket mounting
   - Privileged mode
   - Host network mode

2. **Security Consideration**: The wake-word service runs with `privileged: true` and `network_mode: host`, which grants broad system access. This is necessary for real-time audio input but should be monitored.

3. **Non-Root User**: The main application runs as `bunjs` (non-root) for security, while still having audio access through group membership.

4. **PulseAudio Integration**: The setup uses PulseAudio as the audio server, which allows:
   - Multiple applications to share audio hardware
   - Remote audio access (via socket)
   - Audio routing and mixing

## Troubleshooting Microphone Access

If microphone access is not working:

1. **Check User Group**: Verify `bunjs` is in the `audio` group
   ```bash
   docker exec homeassistant-mcp id
   # Should show: groups=...,audio(X),...
   ```

2. **Check Device Mounting**: Verify `/dev/snd/` is accessible
   ```bash
   docker exec wake-word_1 ls -la /dev/snd/
   ```

3. **Check PulseAudio Socket**: Verify socket is mounted
   ```bash
   docker exec wake-word_1 ls -la /run/user/1000/pulse/
   ```

4. **Check Permissions**: Verify file permissions are correct
   ```bash
   docker exec wake-word_1 pactl info
   ```

## Environment Variables

Key audio-related environment variables:

```bash
ENABLE_SPEECH_FEATURES=true          # Enable audio features
ENABLE_WAKE_WORD=true                # Enable wake word detection
PULSE_SERVER=unix:/run/user/1000/pulse/native  # PulseAudio socket location
PULSE_COOKIE=/run/user/1000/pulse/cookie       # PulseAudio auth cookie
AUDIO_GID=29                         # Host audio group ID
```

These variables can be set in `.env` or `.env.development` files.

import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';

const execAsync = promisify(exec);

interface MacOSNotification {
    title: string;
    message: string;
    subtitle?: string;
    sound?: boolean;
}

interface MacOSPermissions {
    notifications: boolean;
    automation: boolean;
    accessibility: boolean;
}

class MacOSIntegration extends EventEmitter {
    private permissions: MacOSPermissions;

    constructor() {
        super();
        this.permissions = {
            notifications: false,
            automation: false,
            accessibility: false
        };
    }

    async initialize(): Promise<void> {
        await this.checkPermissions();
        await this.registerSystemEvents();
    }

    async checkPermissions(): Promise<MacOSPermissions> {
        try {
            // Check notification permissions
            const { stdout: notifPerms } = await execAsync(
                'osascript -e \'tell application "System Events" to get properties\''
            );
            this.permissions.notifications = notifPerms.includes('notifications enabled:true');

            // Check automation permissions
            const { stdout: autoPerms } = await execAsync(
                'osascript -e \'tell application "System Events" to get UI elements enabled\''
            );
            this.permissions.automation = autoPerms.includes('true');

            // Check accessibility permissions
            const { stdout: accessPerms } = await execAsync(
                'osascript -e \'tell application "System Events" to get processes\''
            );
            this.permissions.accessibility = !accessPerms.includes('error');

            return this.permissions;
        } catch (error) {
            console.error('Error checking permissions:', error);
            return this.permissions;
        }
    }

    async sendNotification(notification: MacOSNotification): Promise<void> {
        if (!this.permissions.notifications) {
            throw new Error('Notification permission not granted');
        }

        const script = `
      display notification "${notification.message}"${notification.subtitle ? ` with subtitle "${notification.subtitle}"` : ''
            } with title "${notification.title}"${notification.sound ? ' sound name "default"' : ''
            }
    `;

        try {
            await execAsync(`osascript -e '${script}'`);
        } catch (error) {
            console.error('Error sending notification:', error);
            throw error;
        }
    }

    async registerSystemEvents(): Promise<void> {
        if (!this.permissions.automation) {
            throw new Error('Automation permission not granted');
        }

        // Monitor system events
        const script = `
      tell application "System Events"
        set eventList to {}
        
        -- Monitor display sleep/wake
        tell application "System Events"
          set displayState to get sleeping
          if displayState then
            set end of eventList to "display_sleep"
          else
            set end of eventList to "display_wake"
          end if
        end tell
        
        -- Monitor power source changes
        tell application "System Events"
          set powerSource to get power source
          set end of eventList to "power_" & powerSource
        end tell
        
        return eventList
      end tell
    `;

        try {
            const { stdout } = await execAsync(`osascript -e '${script}'`);
            const events = stdout.split(',').map(e => e.trim());
            events.forEach(event => this.emit('system_event', event));
        } catch (error) {
            console.error('Error monitoring system events:', error);
        }
    }

    async executeAutomation(script: string): Promise<string> {
        if (!this.permissions.automation) {
            throw new Error('Automation permission not granted');
        }

        try {
            const { stdout } = await execAsync(`osascript -e '${script}'`);
            return stdout;
        } catch (error) {
            console.error('Error executing automation:', error);
            throw error;
        }
    }

    async getSystemInfo(): Promise<Record<string, any>> {
        const info: Record<string, any> = {};

        try {
            // Get macOS version
            const { stdout: version } = await execAsync('sw_vers -productVersion');
            info.os_version = version.trim();

            // Get hardware info
            const { stdout: hardware } = await execAsync('system_profiler SPHardwareDataType');
            info.hardware = this.parseSystemProfile(hardware);

            // Get power info
            const { stdout: power } = await execAsync('pmset -g batt');
            info.power = this.parsePowerInfo(power);

            // Get network info
            const { stdout: network } = await execAsync('networksetup -listallhardwareports');
            info.network = this.parseNetworkInfo(network);

            return info;
        } catch (error) {
            console.error('Error getting system info:', error);
            throw error;
        }
    }

    private parseSystemProfile(output: string): Record<string, any> {
        const info: Record<string, any> = {};
        const lines = output.split('\n');

        for (const line of lines) {
            const [key, value] = line.split(':').map(s => s.trim());
            if (key && value) {
                info[key.toLowerCase().replace(/\s+/g, '_')] = value;
            }
        }

        return info;
    }

    private parsePowerInfo(output: string): Record<string, any> {
        const info: Record<string, any> = {};
        const lines = output.split('\n');

        for (const line of lines) {
            if (line.includes('Now drawing from')) {
                info.power_source = line.includes('Battery') ? 'battery' : 'ac_power';
            } else if (line.includes('%')) {
                const matches = line.match(/(\d+)%/);
                if (matches) {
                    info.battery_percentage = parseInt(matches[1]);
                }
            }
        }

        return info;
    }

    private parseNetworkInfo(output: string): Record<string, any> {
        const info: Record<string, any> = {};
        const lines = output.split('\n');
        let currentInterface: string | null = null;

        for (const line of lines) {
            if (line.includes('Hardware Port:')) {
                currentInterface = line.split(':')[1].trim();
                info[currentInterface] = {};
            } else if (currentInterface && line.includes('Device:')) {
                info[currentInterface].device = line.split(':')[1].trim();
            } else if (currentInterface && line.includes('Ethernet Address:')) {
                info[currentInterface].mac = line.split(':')[1].trim();
            }
        }

        return info;
    }
}

export default MacOSIntegration; 
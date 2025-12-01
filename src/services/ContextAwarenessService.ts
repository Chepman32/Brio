/**
 * Context Awareness Service
 *
 * Aggregates data from multiple sensors to build a rich context vector
 * for the "Magic" algorithm.
 *
 * Context Dimensions:
 * 1. Battery: Level, Charging State
 * 2. Network: Type (Wifi/Cell), Strength
 * 3. Location: Coordinates, Speed, Heading
 * 4. Calendar: Current/Next Event
 * 5. Device: Low Power Mode
 */

import NetInfo from '@react-native-community/netinfo';
import Geolocation from 'react-native-geolocation-service';
import RNCalendarEvents from 'react-native-calendar-events';
import { Platform, PermissionsAndroid } from 'react-native';

// react-native-device-info throws if the native module isn't installed (e.g. in tests/simulator setup).
// Load it defensively and fall back to safe defaults so the rest of the service can still work.
let DeviceInfo: {
  getBatteryLevel: () => Promise<number>;
  isBatteryCharging: () => Promise<boolean>;
  isLowPowerMode: () => Promise<boolean>;
};

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const deviceInfoModule = require('react-native-device-info');
  DeviceInfo = deviceInfoModule.default || deviceInfoModule;
} catch (error) {
  console.warn(
    'react-native-device-info unavailable, using fallback values:',
    error,
  );
  DeviceInfo = {
    getBatteryLevel: async () => 1,
    isBatteryCharging: async () => false,
    isLowPowerMode: async () => false,
  };
}

export interface ContextVector {
  // Battery
  batteryLevel: number; // 0.0 - 1.0
  isCharging: boolean;
  isLowPowerMode: boolean;

  // Network
  networkType: 'wifi' | 'cellular' | 'none' | 'unknown';
  isConnected: boolean;
  isWifi: boolean;

  // Location
  latitude?: number;
  longitude?: number;
  speed?: number; // m/s
  locationAccuracy?: number;

  // Calendar
  isMeetingNow: boolean;
  minutesToNextMeeting: number;
  currentEventTitle?: string;

  // Time
  hour: number;
  dayOfWeek: number;
  isWeekend: boolean;
  
  // Derived
  isCommuting: boolean; // Based on speed > 5 m/s
  isDeepWorkPossible: boolean; // Based on battery, wifi, and no meetings
}

class ContextAwarenessServiceClass {
  private lastContext: ContextVector | null = null;
  private lastUpdate: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize permissions and listeners
   */
  async initialize(): Promise<void> {
    if (Platform.OS === 'android') {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.READ_CALENDAR,
      ]);
    } else {
      await Geolocation.requestAuthorization('whenInUse');
      await RNCalendarEvents.requestPermissions();
    }
  }

  /**
   * Get the current rich context vector
   */
  async getCurrentContext(forceRefresh = false): Promise<ContextVector> {
    const now = Date.now();
    if (!forceRefresh && this.lastContext && now - this.lastUpdate < this.CACHE_TTL) {
      return this.lastContext;
    }

    const [battery, network, location, calendar] = await Promise.all([
      this.getBatteryContext(),
      this.getNetworkContext(),
      this.getLocationContext(),
      this.getCalendarContext(),
    ]);

    const date = new Date();
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Derived contexts
    const isCommuting = (location?.coords.speed || 0) > 5; // > 18 km/h
    
    // Deep work possible if:
    // - Battery > 20% or charging
    // - On Wifi
    // - Not in a meeting
    // - Not commuting
    const isDeepWorkPossible = 
      (battery.level > 0.2 || battery.charging) &&
      network.isWifi &&
      !calendar.isMeetingNow &&
      !isCommuting;

    const context: ContextVector = {
      batteryLevel: battery.level,
      isCharging: battery.charging,
      isLowPowerMode: battery.lowPower,
      
      networkType: network.type,
      isConnected: network.isConnected,
      isWifi: network.isWifi,

      latitude: location?.coords.latitude,
      longitude: location?.coords.longitude,
      speed: location?.coords.speed || 0,
      locationAccuracy: location?.coords.accuracy,

      isMeetingNow: calendar.isMeetingNow,
      minutesToNextMeeting: calendar.minutesToNextMeeting,
      currentEventTitle: calendar.currentEventTitle,

      hour,
      dayOfWeek,
      isWeekend,

      isCommuting,
      isDeepWorkPossible,
    };

    this.lastContext = context;
    this.lastUpdate = now;
    return context;
  }

  // --- Private Collectors ---

  private async getBatteryContext() {
    const [level, charging, lowPower] = await Promise.all([
      DeviceInfo.getBatteryLevel(),
      DeviceInfo.isBatteryCharging(),
      (DeviceInfo as any).isLowPowerMode(),
    ]);
    return { level, charging, lowPower };
  }

  private async getNetworkContext() {
    const state = await NetInfo.fetch();
    return {
      type: state.type as 'wifi' | 'cellular' | 'none' | 'unknown',
      isConnected: state.isConnected ?? false,
      isWifi: state.type === 'wifi',
    };
  }

  private async getLocationContext() {
    return new Promise<Geolocation.GeoPosition | null>((resolve) => {
      Geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => {
          console.warn('Location error:', error);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  }

  private async getCalendarContext() {
    try {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59);

      const events = await RNCalendarEvents.fetchAllEvents(
        now.toISOString(),
        endOfDay.toISOString()
      );

      const currentEvent = events.find(e => {
        if (!e.startDate || !e.endDate) return false;
        const start = new Date(e.startDate).getTime();
        const end = new Date(e.endDate).getTime();
        return now.getTime() >= start && now.getTime() <= end;
      });

      const nextEvent = events
        .filter(e => e.startDate && new Date(e.startDate).getTime() > now.getTime())
        .sort((a, b) => {
             const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
             const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
             return dateA - dateB;
        })[0];

      let minutesToNextMeeting = 999;
      if (nextEvent && nextEvent.startDate) {
        minutesToNextMeeting = Math.round(
          (new Date(nextEvent.startDate).getTime() - now.getTime()) / (60 * 1000)
        );
      }

      return {
        isMeetingNow: !!currentEvent,
        currentEventTitle: currentEvent?.title,
        minutesToNextMeeting,
      };
    } catch (error) {
      console.warn('Calendar error:', error);
      return {
        isMeetingNow: false,
        minutesToNextMeeting: 999,
      };
    }
  }
}

export const ContextAwarenessService = new ContextAwarenessServiceClass();

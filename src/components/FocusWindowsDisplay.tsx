/**
 * Focus Windows Display Component
 *
 * Shows optimal notification time windows based on RT learning
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { NotificationRTService } from '../services/NotificationRTService';
import { FocusWindow } from '../types/notification-rt.types';

interface FocusWindowsDisplayProps {
  category: string;
  onSelectWindow?: (window: FocusWindow) => void;
}

export const FocusWindowsDisplay: React.FC<FocusWindowsDisplayProps> = ({
  category,
  onSelectWindow,
}) => {
  const [windows, setWindows] = useState<FocusWindow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFocusWindows = React.useCallback(async () => {
    try {
      setLoading(true);
      const focusWindows = await NotificationRTService.getFocusWindows(
        category,
      );
      setWindows(focusWindows);
    } catch (error) {
      console.error('Error loading focus windows:', error);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    loadFocusWindows();
  }, [loadFocusWindows]);

  const formatTime = (bin: number): string => {
    const minutes = bin * 30;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`;
  };

  const getDayName = (dow: number): string => {
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    return days[dow];
  };

  const getEngagementLevel = (
    pOpen5m: number,
  ): { label: string; color: string } => {
    if (pOpen5m >= 0.7) return { label: 'Excellent', color: '#4CAF50' };
    if (pOpen5m >= 0.5) return { label: 'Good', color: '#8BC34A' };
    if (pOpen5m >= 0.3) return { label: 'Fair', color: '#FFC107' };
    return { label: 'Low', color: '#FF9800' };
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Analyzing your patterns...</Text>
      </View>
    );
  }

  if (windows.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>
          Not enough data yet. Keep using the app to discover your optimal focus
          times!
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Your Best Times for {category}</Text>
      <Text style={styles.subtitle}>
        Based on when you typically respond to notifications
      </Text>

      {windows.map(window => {
        const engagement = getEngagementLevel(window.pOpen5m);
        const responseTime = Math.round(window.medianRtMs / (60 * 1000));

        return (
          <TouchableOpacity
            key={`${window.dow}-${window.startBin}`}
            style={styles.windowCard}
            onPress={() => onSelectWindow?.(window)}
            activeOpacity={0.7}
          >
            <View style={styles.windowHeader}>
              <Text style={styles.windowDay}>{getDayName(window.dow)}</Text>
              <View
                style={[styles.badge, { backgroundColor: engagement.color }]}
              >
                <Text style={styles.badgeText}>{engagement.label}</Text>
              </View>
            </View>

            <Text style={styles.windowTime}>{formatTime(window.startBin)}</Text>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Quick Response</Text>
                <Text style={styles.statValue}>
                  {Math.round(window.pOpen5m * 100)}%
                </Text>
              </View>

              <View style={styles.stat}>
                <Text style={styles.statLabel}>Avg Response</Text>
                <Text style={styles.statValue}>{responseTime} min</Text>
              </View>

              <View style={styles.stat}>
                <Text style={styles.statLabel}>Confidence</Text>
                <Text style={styles.statValue}>
                  {Math.round(window.confidence * 100)}%
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 24,
  },
  windowCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  windowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  windowDay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  windowTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});

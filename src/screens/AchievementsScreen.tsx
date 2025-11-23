import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AchievementService } from '../services/AchievementService';
import { getStats } from '../database/operations';
import { AchievementType } from '../types';
import { useResponsive } from '../hooks/useResponsive';
import { getContentContainerStyle, ResponsiveSizes } from '../utils/responsiveDimensions';

export const AchievementsScreen: React.FC = () => {
  const [achievements, setAchievements] = useState<AchievementType[]>([]);
  const [stats, setStats] = useState({
    currentStreak: 0,
    longestStreak: 0,
    totalTasksCompleted: 0,
  });
  const [selectedType, setSelectedType] = useState<
    'all' | 'streak' | 'milestone' | 'special'
  >('all');
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();
  const { width: screenWidth } = useWindowDimensions();
  const contentContainerStyle = getContentContainerStyle();
  const gridColumns = ResponsiveSizes.gridColumns;

  const loadData = React.useCallback(() => {
    try {
      const allAchievements = AchievementService.getAchievementsByType('streak')
        .concat(AchievementService.getAchievementsByType('milestone'))
        .concat(AchievementService.getAchievementsByType('special'));

      setAchievements(allAchievements);

      const userStats = getStats();
      setStats({
        currentStreak: userStats.currentStreak,
        longestStreak: userStats.longestStreak,
        totalTasksCompleted: userStats.totalTasksCompleted,
      });
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredAchievements =
    selectedType === 'all'
      ? achievements
      : achievements.filter(a => a.type === selectedType);

  const achievementStats = AchievementService.getAchievementStats();

  const getIconForAchievement = (achievement: AchievementType) => {
    // Map icon names to emojis
    const iconMap: { [key: string]: string } = {
      fire: '🔥',
      'check-circle': '✅',
      trophy: '🏆',
      star: '⭐',
      award: '🎖️',
    };
    return iconMap[achievement.iconName] || '🎯';
  };

  // Calculate card width based on grid columns
  const cardGap = 12;
  const contentPadding = isTablet ? 24 : 16;
  const availableWidth = Math.min(screenWidth, 700) - contentPadding * 2;
  const cardWidth = (availableWidth - (gridColumns - 1) * cardGap) / gridColumns;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 20,
            paddingHorizontal: isTablet ? 32 : 20,
          },
        ]}
      >
        <View style={contentContainerStyle}>
          <Text style={[styles.title, { fontSize: isTablet ? 34 : 28 }]}>
            Achievements
          </Text>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { fontSize: isTablet ? 28 : 24 }]}>
                {stats.currentStreak}
              </Text>
              <Text style={[styles.statLabel, { fontSize: isTablet ? 14 : 12 }]}>
                Current Streak
              </Text>
              <Text style={styles.statIcon}>🔥</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { fontSize: isTablet ? 28 : 24 }]}>
                {stats.longestStreak}
              </Text>
              <Text style={[styles.statLabel, { fontSize: isTablet ? 14 : 12 }]}>
                Longest Streak
              </Text>
              <Text style={styles.statIcon}>⚡</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { fontSize: isTablet ? 28 : 24 }]}>
                {stats.totalTasksCompleted}
              </Text>
              <Text style={[styles.statLabel, { fontSize: isTablet ? 14 : 12 }]}>
                Tasks Done
              </Text>
              <Text style={styles.statIcon}>✅</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${achievementStats.percentComplete}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {achievementStats.unlocked} / {achievementStats.total} Unlocked
            </Text>
          </View>

          {/* Filter Buttons */}
          <View style={styles.filterContainer}>
            {(['all', 'streak', 'milestone', 'special'] as const).map(type => (
              <Pressable
                key={type}
                style={[
                  styles.filterButton,
                  selectedType === type && styles.filterButtonActive,
                  { paddingHorizontal: isTablet ? 16 : 12 },
                ]}
                onPress={() => setSelectedType(type)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    selectedType === type && styles.filterButtonTextActive,
                    { fontSize: isTablet ? 14 : 12 },
                  ]}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Achievements Grid */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[contentContainerStyle, { padding: contentPadding }]}
      >
        <View style={styles.achievementsGrid}>
          {filteredAchievements.map(achievement => (
            <View
              key={achievement._id}
              style={[
                styles.achievementCard,
                !achievement.unlocked && styles.achievementCardLocked,
                { width: cardWidth },
              ]}
            >
              <Text style={styles.achievementIcon}>
                {getIconForAchievement(achievement)}
              </Text>
              <Text
                style={[
                  styles.achievementName,
                  !achievement.unlocked && styles.achievementNameLocked,
                ]}
              >
                {achievement.name}
              </Text>
              <Text
                style={[
                  styles.achievementDescription,
                  !achievement.unlocked && styles.achievementDescriptionLocked,
                ]}
              >
                {achievement.description}
              </Text>

              {/* Progress Bar for Locked Achievements */}
              {!achievement.unlocked && (
                <View style={styles.achievementProgressContainer}>
                  <View style={styles.achievementProgressBar}>
                    <View
                      style={[
                        styles.achievementProgressFill,
                        {
                          width: `${
                            (achievement.progress / achievement.target) * 100
                          }%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.achievementProgressText}>
                    {achievement.progress} / {achievement.target}
                  </Text>
                </View>
              )}

              {/* Unlocked Badge */}
              {achievement.unlocked && (
                <View style={styles.unlockedBadge}>
                  <Text style={styles.unlockedBadgeText}>Unlocked!</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontWeight: 'bold',
    color: '#6366F1',
  },
  statLabel: {
    color: '#666',
    marginTop: 4,
  },
  statIcon: {
    fontSize: 20,
    marginTop: 4,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  filterButtonActive: {
    backgroundColor: '#6366F1',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  achievementCardLocked: {
    backgroundColor: '#F5F5F5',
    opacity: 0.6,
  },
  achievementIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  achievementName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 4,
  },
  achievementNameLocked: {
    color: '#000',
  },
  achievementDescription: {
    fontSize: 12,
    color: '#000',
    textAlign: 'center',
  },
  achievementDescriptionLocked: {
    color: '#000',
  },
  achievementProgressContainer: {
    width: '100%',
    marginTop: 8,
  },
  achievementProgressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  achievementProgressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
  },
  achievementProgressText: {
    fontSize: 10,
    color: '#000',
    marginTop: 4,
    textAlign: 'center',
  },
  unlockedBadge: {
    marginTop: 8,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  unlockedBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

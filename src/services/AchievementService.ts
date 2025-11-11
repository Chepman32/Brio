import {
  getAchievements,
  updateAchievementProgress,
  unlockAchievement as unlockAchievementDB,
  getStats,
} from '../database/operations';
import { AchievementType } from '../types';

class AchievementServiceClass {
  /**
   * Check all achievements and unlock any that meet criteria
   */
  checkAchievements(): AchievementType[] {
    try {
      const achievements = getAchievements();
      const stats = getStats();
      const newlyUnlocked: AchievementType[] = [];

      achievements.forEach(achievement => {
        if (achievement.unlocked) return;

        let shouldUnlock = false;
        let progress = 0;

        switch (achievement.type) {
          case 'streak':
            progress = stats.currentStreak;
            shouldUnlock = stats.currentStreak >= achievement.target;
            break;

          case 'milestone':
            progress = stats.totalTasksCompleted;
            shouldUnlock = stats.totalTasksCompleted >= achievement.target;
            break;

          case 'special':
            // Handle special achievements
            if (achievement.name === 'First Task') {
              progress = stats.totalTasksCompleted > 0 ? 1 : 0;
              shouldUnlock = stats.totalTasksCompleted > 0;
            } else if (achievement.name === 'Perfect Week') {
              // Check if user completed tasks every day for a week
              progress = stats.currentStreak >= 7 ? 1 : 0;
              shouldUnlock = stats.currentStreak >= 7;
            }
            break;
        }

        // Update progress
        if (progress !== achievement.progress) {
          updateAchievementProgress(achievement._id, progress);
        }

        // Unlock if criteria met
        if (shouldUnlock && !achievement.unlocked) {
          unlockAchievementDB(achievement._id);
          newlyUnlocked.push(achievement);
        }
      });

      return newlyUnlocked;
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }

  /**
   * Update streak and check for streak achievements
   */
  updateStreak(): void {
    try {
      // Streak is updated in statsOperations
      // Check for newly unlocked achievements
      this.checkAchievements();
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  }

  /**
   * Manually unlock an achievement
   */
  unlockAchievement(achievementId: string): void {
    try {
      unlockAchievementDB(achievementId);
    } catch (error) {
      console.error('Error unlocking achievement:', error);
    }
  }

  /**
   * Get progress for a specific achievement
   */
  getProgress(achievementId: string): number {
    try {
      const achievements = getAchievements();
      const achievement = achievements.find(a => a._id === achievementId);

      if (!achievement) {
        return 0;
      }

      return achievement.target > 0
        ? (achievement.progress / achievement.target) * 100
        : 0;
    } catch (error) {
      console.error('Error getting achievement progress:', error);
      return 0;
    }
  }

  /**
   * Get all unlocked achievements
   */
  getUnlockedAchievements(): AchievementType[] {
    try {
      const achievements = getAchievements();
      return Array.from(achievements).filter(a => a.unlocked);
    } catch (error) {
      console.error('Error getting unlocked achievements:', error);
      return [];
    }
  }

  /**
   * Get all locked achievements
   */
  getLockedAchievements(): AchievementType[] {
    try {
      const achievements = getAchievements();
      return Array.from(achievements).filter(a => !a.unlocked);
    } catch (error) {
      console.error('Error getting locked achievements:', error);
      return [];
    }
  }

  /**
   * Get achievements by type
   */
  getAchievementsByType(
    type: 'streak' | 'milestone' | 'special',
  ): AchievementType[] {
    try {
      const achievements = getAchievements();
      return Array.from(achievements).filter(a => a.type === type);
    } catch (error) {
      console.error('Error getting achievements by type:', error);
      return [];
    }
  }

  /**
   * Get achievement statistics
   */
  getAchievementStats(): {
    total: number;
    unlocked: number;
    locked: number;
    percentComplete: number;
  } {
    try {
      const achievements = getAchievements();
      const total = achievements.length;
      const unlocked = Array.from(achievements).filter(a => a.unlocked).length;
      const locked = total - unlocked;
      const percentComplete = total > 0 ? (unlocked / total) * 100 : 0;

      return {
        total,
        unlocked,
        locked,
        percentComplete,
      };
    } catch (error) {
      console.error('Error getting achievement stats:', error);
      return {
        total: 0,
        unlocked: 0,
        locked: 0,
        percentComplete: 0,
      };
    }
  }
}

// Export singleton instance
export const AchievementService = new AchievementServiceClass();

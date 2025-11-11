import React from 'react';
import { FlatList, StyleSheet, View, Text } from 'react-native';
import { TaskCard } from './TaskCard';
import { TaskListViewProps } from '../types';

export const TaskListView: React.FC<TaskListViewProps> = ({
  tasks,
  onTaskComplete,
  onTaskSnooze,
  onTaskPress,
  onReorder,
}) => {
  const renderItem = ({ item }: { item: any }) => (
    <TaskCard
      task={item}
      onComplete={onTaskComplete}
      onSnooze={onTaskSnooze}
      onPress={onTaskPress}
      onLongPress={() => {
        // TODO: Implement drag-and-drop reordering
        console.log('Long press on task:', item._id);
      }}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No tasks yet</Text>
      <Text style={styles.emptySubtext}>
        Tap the + button to create your first task
      </Text>
    </View>
  );

  return (
    <FlatList
      data={tasks}
      renderItem={renderItem}
      keyExtractor={item => item._id}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={renderEmpty}
      showsVerticalScrollIndicator={false}
      windowSize={10}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      removeClippedSubviews={true}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BBB',
    textAlign: 'center',
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RNPickerSelect from 'react-native-picker-select';
import { supabase } from '../lib/supabase';
import { SitePhotoWithProject } from '../types/database';

export default function SiteDiaryListScreen({ navigation }: any) {
  const [photos, setPhotos] = useState<SitePhotoWithProject[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchPhotos();
    }
  }, [selectedProject]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (selectedProject) {
        fetchPhotos();
      }
    });
    return unsubscribe;
  }, [navigation, selectedProject]);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, project_name, client_name')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('프로젝트 로드 실패:', error);
    } else {
      setProjects(data || []);
      if (data && data.length > 0) {
        setSelectedProject(data[0].id);
      }
    }
  };

  const fetchPhotos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('site_photos')
      .select('*, projects(project_name, client_name)')
      .eq('project_id', selectedProject)
      .order('photo_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('현장사진 로드 실패:', error);
    } else {
      setPhotos(data || []);
    }
    setLoading(false);
  };

  const groupByDate = () => {
    const grouped: { [key: string]: SitePhotoWithProject[] } = {};
    photos.forEach((photo) => {
      const date = photo.photo_date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(photo);
    });
    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));
  };

  const renderDateGroup = ({ item }: { item: [string, SitePhotoWithProject[]] }) => {
    const [date, photosForDate] = item;
    
    const randomPhoto = photosForDate[Math.floor(Math.random() * photosForDate.length)];
    
    return (
      <View style={styles.dateSection}>
        <View style={styles.dateHeaderRow}>
          <Text style={styles.dateHeader}>{date}</Text>
          <Text style={styles.photoCountBadge}>{photosForDate.length}장</Text>
        </View>
        
        <TouchableOpacity
          style={styles.dateCard}
          onPress={() =>
            navigation.navigate('SiteDiaryDetail', {
              photoDate: date,
              projectId: selectedProject,
            })
          }
        >
          <Image
            source={{ uri: randomPhoto.photo_url }}
            style={styles.singlePhoto}
            resizeMode="cover"
          />
          
          <View style={styles.cardInfo}>
            <Text style={styles.commentText} numberOfLines={2}>
              {randomPhoto.comment || '메모 없음'}
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.visibilityBadge}>
                {randomPhoto.visibility === 'client' ? '📤 클라이언트' : '🔒 내부용'}
              </Text>
              {photosForDate.length > 1 && (
                <Text style={styles.morePhotosText}>+{photosForDate.length - 1}장 더보기</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>현장일지</Text>
          <TouchableOpacity
            style={[styles.addButton, !selectedProject && styles.addButtonDisabled]}
            onPress={() =>
              navigation.navigate('SiteDiaryForm', { projectId: selectedProject })
            }
            disabled={!selectedProject}
          >
            <Text style={styles.addButtonText}>+ 등록</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterContainer}>
          <Text style={styles.label}>프로젝트</Text>
          <View style={styles.pickerWrapper}>
            <RNPickerSelect
              value={selectedProject}
              onValueChange={(value) => setSelectedProject(value)}
              items={projects.map((p) => ({
                label: `${p.project_name} (${p.client_name})`,
                value: p.id,
              }))}
              placeholder={{ label: '프로젝트 선택', value: '' }}
              style={pickerSelectStyles}
            />
          </View>
        </View>

        <View style={styles.headerActions}>
          <Text style={styles.totalCount}>총 {photos.length}장</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={groupByDate()}
            renderItem={renderDateGroup}
            keyExtractor={(item) => item[0]}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>등록된 사진이 없습니다.</Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  filterContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    backgroundColor: '#FFF',
  },
  headerActions: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  totalCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonDisabled: {
    backgroundColor: '#CCC',
  },
  addButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  listContent: {
    padding: 16,
  },
  dateSection: {
    marginBottom: 24,
  },
  dateHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  photoCountBadge: {
    backgroundColor: '#007AFF',
    color: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  dateCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  singlePhoto: {
    width: '100%',
    height: 200,
    backgroundColor: '#EEE',
  },
  cardInfo: {
    padding: 12,
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  visibilityBadge: {
    fontSize: 12,
    color: '#666',
  },
  morePhotosText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#999',
    marginTop: 50,
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    color: '#333',
  },
  inputAndroid: {
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    color: '#333',
  },
  inputWeb: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    color: '#333',
  },
});
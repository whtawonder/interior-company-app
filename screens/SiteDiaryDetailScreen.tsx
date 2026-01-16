import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  TextInput,
  ScrollView,
  Modal,
} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { supabase } from '../lib/supabase';
import { SitePhotoWithProject } from '../types/database';

const { width, height } = Dimensions.get('window');

export default function SiteDiaryDetailScreen({ route, navigation }: any) {
  const { photoDate, projectId } = route.params;
  const [photos, setPhotos] = useState<SitePhotoWithProject[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editComment, setEditComment] = useState('');
  const [editVisibility, setEditVisibility] = useState<'internal' | 'client'>('internal');
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const fullScreenFlatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchPhotosForDate();
  }, []);

  useEffect(() => {
    if (photos.length > 0) {
      const currentPhoto = photos[currentIndex];
      setEditComment(currentPhoto.comment || '');
      setEditVisibility(currentPhoto.visibility);
    }
  }, [currentIndex, photos]);

  const fetchPhotosForDate = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('site_photos')
      .select('*, projects(project_name, client_name)')
      .eq('project_id', projectId)
      .eq('photo_date', photoDate)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('사진 로드 실패:', error);
      Alert.alert('오류', '데이터를 불러올 수 없습니다.');
    } else {
      setPhotos(data || []);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    const currentPhoto = photos[currentIndex];
    const { error } = await supabase
      .from('site_photos')
      .update({ comment: editComment, visibility: editVisibility })
      .eq('id', currentPhoto.id);

    if (error) {
      Alert.alert('오류', '수정에 실패했습니다.');
    } else {
      const updatedPhotos = [...photos];
      updatedPhotos[currentIndex] = { ...updatedPhotos[currentIndex], comment: editComment, visibility: editVisibility };
      setPhotos(updatedPhotos);
      setEditMode(false);
      Alert.alert('성공', '수정되었습니다.');
    }
  };

  const handleDelete = (photo: SitePhotoWithProject) => {
    Alert.alert('삭제 확인', '이 사진을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('site_photos').delete().eq('id', photo.id);
          if (!error) {
            const newPhotos = photos.filter(p => p.id !== photo.id);
            if (newPhotos.length === 0) {
              navigation.goBack();
            } else {
              setPhotos(newPhotos);
              if (currentIndex >= newPhotos.length) setCurrentIndex(newPhotos.length - 1);
            }
          }
        },
      },
    ]);
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
      setEditMode(false);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color="#007AFF" /></View>;
  if (photos.length === 0) return <View style={s.loading}><Text style={s.errorText}>사진이 없습니다.</Text></View>;

  const currentPhoto = photos[currentIndex];

  return (
    <View style={s.container}>
      <View style={s.imageSection}>
        <FlatList
          ref={flatListRef}
          data={photos}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.photoContainer} onPress={() => setFullScreenVisible(true)}>
              <Image source={{ uri: item.photo_url }} style={s.mainImage} resizeMode="contain" />
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />
        {photos.length > 1 && (
          <View style={s.indicator}>
            <Text style={s.indicatorText}>{currentIndex + 1} / {photos.length}</Text>
          </View>
        )}
        <View style={s.expandHint}><Text style={s.expandHintText}>🔍 탭하여 확대</Text></View>
      </View>

      <ScrollView style={s.infoSection}>
        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>📅 날짜</Text>
            <Text style={s.infoValue}>{currentPhoto.photo_date}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>🏗️ 프로젝트</Text>
            <Text style={s.infoValue}>{currentPhoto.projects?.project_name}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>👤 클라이언트</Text>
            <Text style={s.infoValue}>{currentPhoto.projects?.client_name}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>🔒 공개</Text>
            {editMode ? (
              <View style={s.pickerWrapper}>
                <RNPickerSelect
                  value={editVisibility}
                  onValueChange={setEditVisibility}
                  items={[{ label: '내부용', value: 'internal' }, { label: '클라이언트', value: 'client' }]}
                  style={{ inputIOS: s.pickerInput, inputAndroid: s.pickerInput, inputWeb: s.pickerInput }}
                />
              </View>
            ) : (
              <Text style={s.infoValue}>{currentPhoto.visibility === 'client' ? '📤 클라이언트' : '🔒 내부용'}</Text>
            )}
          </View>
          <View style={s.commentSection}>
            <Text style={s.commentLabel}>💬 메모</Text>
            {editMode ? (
              <TextInput
                style={s.commentInput}
                value={editComment}
                onChangeText={setEditComment}
                placeholder="작업 내용, 특이사항 등"
                multiline
                textAlignVertical="top"
              />
            ) : (
              <Text style={s.commentText}>{currentPhoto.comment || '메모 없음'}</Text>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={s.actionBar}>
        {editMode ? (
          <>
            <TouchableOpacity style={s.cancelButton} onPress={() => { setEditMode(false); setEditComment(currentPhoto.comment || ''); }}>
              <Text style={s.buttonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.saveButton} onPress={handleSave}>
              <Text style={s.buttonText}>저장</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={s.editButton} onPress={() => setEditMode(true)}>
              <Text style={s.buttonText}>✏️ 수정</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.deleteButton} onPress={() => handleDelete(currentPhoto)}>
              <Text style={s.buttonText}>🗑️ 삭제</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <Modal visible={fullScreenVisible} transparent animationType="fade" onRequestClose={() => setFullScreenVisible(false)}>
        <View style={s.fullScreenContainer}>
          <FlatList
            ref={fullScreenFlatListRef}
            data={photos}
            renderItem={({ item }) => (
              <View style={s.fullScreenPhotoContainer}>
                <Image source={{ uri: item.photo_url }} style={s.fullScreenImage} resizeMode="contain" />
              </View>
            )}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={currentIndex}
            getItemLayout={(data, index) => ({ length: width, offset: width * index, index })}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
          />
          {photos.length > 1 && (
            <View style={s.fullScreenIndicator}>
              <Text style={s.indicatorText}>{currentIndex + 1} / {photos.length}</Text>
            </View>
          )}
          <TouchableOpacity style={s.closeButton} onPress={() => setFullScreenVisible(false)}>
            <Text style={s.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  errorText: {
    fontSize: 16,
    color: '#999',
  },
  imageSection: {
    height: height * 0.3,
    backgroundColor: '#000',
  },
  photoContainer: {
    width: width,
    height: height * 0.3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainImage: {
    width: width,
    height: height * 0.3,
  },
  indicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  indicatorText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  expandHint: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  expandHintText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  infoSection: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  infoCard: {
    backgroundColor: '#FFF',
    padding: 20,
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  pickerWrapper: {
    flex: 2,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    backgroundColor: '#F9F9F9',
  },
  pickerInput: {
    fontSize: 14,
    paddingVertical: 8,
    paddingHorizontal: 8,
    color: '#333',
  },
  commentSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  commentText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  commentInput: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#8E8E93',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenPhotoContainer: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: width,
    height: height,
  },
  fullScreenIndicator: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '300',
  },
});

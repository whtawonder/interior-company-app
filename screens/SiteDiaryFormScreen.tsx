import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNPickerSelect from 'react-native-picker-select';
import { supabase } from '../lib/supabase';

const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseStringToDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
};

// 🔧 TypeScript 타입 확장 (cleanupCacheAsync)
declare module 'expo-image-picker' {
  namespace ImagePicker {
    function cleanupCacheAsync(uri: string): Promise<void>;
  }
}

export default function SiteDiaryFormScreen({ route, navigation }: any) {
  const { projectId } = route.params || {};
  
  // 상태
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<{ uri: string; name: string }[]>([]);
  const [photoDate, setPhotoDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [comment, setComment] = useState('');
  const [visibility, setVisibility] = useState<'internal' | 'client'>('internal');
  const [uploadProgress, setUploadProgress] = useState('');

  // 🔧 안전한 캐시 정리 (TypeScript 에러 해결)
  const safeCleanupCache = async (uri: string) => {
    try {
      if ('cleanupCacheAsync' in ImagePicker) {
        await (ImagePicker as any).cleanupCacheAsync(uri);
      }
    } catch (e) {
      console.log('Cache cleanup skipped:', uri);
    }
  };

  // 초기화 + 권한
  useEffect(() => {
    requestPermissions();
    return () => {
      selectedImages.forEach(async ({ uri }) => safeCleanupCache(uri));
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '사진 접근 권한이 필요합니다.');
      }
    }
  };

  // 🔧 1장씩 안전한 이미지 선택 (크래시 방지)
  const pickImages = useCallback(async () => {
    if (selectedImages.length >= 5) {
      Alert.alert('제한', '최대 5장까지 선택 가능합니다.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.7,
        allowsMultipleSelection: false,  // 🔧 핵심: 다중 선택 OFF
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const newImage = {
          uri: asset.uri,
          name: asset.fileName || `photo_${Date.now()}.jpg`,
        };
        setSelectedImages(prev => [...prev, newImage].slice(0, 5));
      }
    } catch (error) {
      Alert.alert('오류', '이미지 선택 실패');
    }
  }, [selectedImages.length]);

  // 이미지 삭제 + 캐시 정리
  const removeImage = useCallback((index: number) => {
    const image = selectedImages[index];
    if (image) safeCleanupCache(image.uri);
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  }, [selectedImages]);

  // 🔧 순차 업로드 (Base64 → fetch/blob)
  const uploadImage = async (image: { uri: string; name: string }, index: number, total: number): Promise<string | null> => {
    try {
      setUploadProgress(`[${index + 1}/${total}] 준비...`);

      // 1. fetch → blob (메모리 90%↓)
      const response = await fetch(image.uri);
      const blob = await response.blob();

      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const fileName = `${projectId}/${formatDateToString(photoDate)}/${timestamp}_${randomStr}_${image.name}`;

      setUploadProgress(`[${index + 1}/${total}] 업로드...`);

      // 2. Supabase 업로드
      const { data, error } = await supabase.storage
        .from('site-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) return null;

      // 3. 공개 URL
      const { data: urlData } = supabase.storage.from('site-photos').getPublicUrl(fileName);
      
      setUploadProgress(`[${index + 1}/${total}] 완료`);

      // 🔧 메모리 정리
      (blob as any).close?.();
      await safeCleanupCache(image.uri);

      return urlData.publicUrl;
    } catch (error) {
      console.error('업로드 실패:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!projectId || selectedImages.length === 0) {
      Alert.alert('오류', '프로젝트와 사진 선택 필수');
      return;
    }

    setLoading(true);
    setUploadProgress('시작...');

    try {
      const photoDateString = formatDateToString(photoDate);
      let successCount = 0;

      // 🔧 1장씩 순차 업로드
      for (let i = 0; i < selectedImages.length; i++) {
        const image = selectedImages[i];
        const photoUrl = await uploadImage(image, i, selectedImages.length);
        
        if (!photoUrl) continue;

        const { error } = await supabase.from('site_photos').insert({
          project_id: projectId,
          photo_date: photoDateString,
          photo_url: photoUrl,
          comment,
          visibility,
        });

        if (!error) successCount++;

        await new Promise(r => setTimeout(r, 1000)); // 서버 부하 방지
      }

      setLoading(false);
      Alert.alert('완료', `${successCount}/${selectedImages.length}장 성공`, [
        {
          text: '확인',
          onPress: () => {
            navigation.goBack();
            setSelectedImages([]);
          }
        }
      ]);
    } catch (error) {
      setLoading(false);
      Alert.alert('오류', '업로드 실패');
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setPhotoDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 12, 0, 0));
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView style={s.scrollView} contentContainerStyle={s.scrollViewContent} keyboardShouldPersistTaps="handled">
        <View style={s.content}>
          {/* 날짜 */}
          <View style={s.formGroup}>
            <Text style={s.label}>날짜 *</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={formatDateToString(photoDate)}
                onChange={(e: any) => setPhotoDate(parseStringToDate(e.target.value))}
                style={s.webDateInput}
              />
            ) : (
              <>
                <TouchableOpacity style={s.dateButton} onPress={() => setShowDatePicker(true)}>
                  <Text style={s.dateButtonText}>{formatDateToString(photoDate)}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker value={photoDate} mode="date" display="default" onChange={onDateChange} />
                )}
              </>
            )}
          </View>

          {/* 사진 */}
          <View style={s.formGroup}>
            <Text style={s.label}>사진 * ({selectedImages.length}/5장)</Text>
            <ScrollView horizontal style={s.imageScrollView}>
              {selectedImages.map(({ uri }, index) => (
                <View key={index} style={s.imageWrapper}>
                  <Image source={{ uri }} style={s.thumbnail} />
                  <TouchableOpacity style={s.removeButton} onPress={() => removeImage(index)}>
                    <Text style={s.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {selectedImages.length < 5 && (
                <TouchableOpacity style={s.addImageButton} onPress={pickImages}>
                  <Text style={s.addImageText}>📷</Text>
                  <Text style={s.addImageSubtext}>추가</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* 메모 */}
          <View style={s.formGroup}>
            <Text style={s.label}>메모</Text>
            <TextInput
              style={[s.input, s.textArea]}
              value={comment}
              onChangeText={setComment}
              placeholder="작업 내용, 특이사항 등"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* 공개 범위 */}
          <View style={s.formGroup}>
            <Text style={s.label}>공개 범위</Text>
            <View style={s.pickerWrapper}>
              <RNPickerSelect
                value={visibility}
                onValueChange={(value: any) => setVisibility(value)}
                items={[
                  { label: '🔒 내부용 (팀만 보기)', value: 'internal' },
                  { label: '📤 클라이언트 공개', value: 'client' },
                ]}
                style={pickerSelectStyles}
              />
            </View>
          </View>

          {/* 제출 */}
          <TouchableOpacity
            style={[s.submitButton, loading && s.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <View style={s.loadingContainer}>
                <ActivityIndicator color="#FFF" />
                <Text style={s.loadingText}>{uploadProgress}</Text>
              </View>
            ) : (
              <Text style={s.submitButtonText}>{selectedImages.length}장 등록</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// 🔧 스타일 (기존 그대로)
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollView: { flex: 1 },
  scrollViewContent: { flexGrow: 1 },
  content: { padding: 16, paddingBottom: 40 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  webDateInput: {
    fontSize: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    backgroundColor: '#FFF',
  },
  dateButton: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12 },
  dateButtonText: { fontSize: 16, color: '#333' },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, fontSize: 16, color: '#333' },
  textArea: { height: 100, textAlignVertical: 'top' },
  pickerWrapper: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, backgroundColor: '#FFF' },
  imageScrollView: { flexDirection: 'row' },
  imageWrapper: { position: 'relative', marginRight: 12 },
  thumbnail: { width: 120, height: 120, borderRadius: 8 },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF3B30',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  removeButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  addImageButton: {
    width: 120,
    height: 120,
    borderWidth: 2,
    borderColor: '#DDD',
    borderRadius: 8,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  addImageText: { fontSize: 32, marginBottom: 4 },
  addImageSubtext: { fontSize: 14, color: '#999' },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  submitButtonDisabled: { backgroundColor: '#CCC' },
  submitButtonText: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: { fontSize: 16, paddingVertical: 12, paddingHorizontal: 10, color: '#333' },
  inputAndroid: { fontSize: 16, paddingVertical: 8, paddingHorizontal: 10, color: '#333' },
  inputWeb: { fontSize: 16, paddingVertical: 12, paddingHorizontal: 10, color: '#333' },
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNPickerSelect from 'react-native-picker-select';
import { supabase } from '../lib/supabase';
import { decode } from 'base64-arraybuffer';

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

export default function SiteDiaryFormScreen({ route, navigation }: any) {
  const { projectId } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [photoDate, setPhotoDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [comment, setComment] = useState('');
  const [visibility, setVisibility] = useState<'internal' | 'client'>('internal');
  const [uploadProgress, setUploadProgress] = useState('');

  useEffect(() => { 
    requestPermissions(); 
    return () => {
      // 메모리 정리
      setSelectedImages([]);
      setComment('');
      setUploadProgress('');
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') Alert.alert('권한 필요', '사진 접근 권한이 필요합니다.');
    }
  };

  const pickImages = async () => {
    try {
      const remainingSlots = 3 - selectedImages.length;
      if (remainingSlots <= 0) {
        Alert.alert('제한', '최대 3장까지만 선택할 수 있습니다.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({ 
        mediaTypes: ['images'], 
        allowsMultipleSelection: true, 
        quality: 0.5,
        selectionLimit: remainingSlots 
      });

      if (!result.canceled && result.assets) {
        const uris = result.assets.slice(0, remainingSlots).map(asset => asset.uri);
        setSelectedImages([...selectedImages, ...uris]);
      }
    } catch (error) { 
      console.error('Image pick error:', error);
      Alert.alert('오류', '이미지를 선택할 수 없습니다.'); 
    }
  };

  const removeImage = (index: number) => { 
    const newImages = [...selectedImages]; 
    newImages.splice(index, 1); 
    setSelectedImages(newImages); 
  };

  const compressImage = async (uri: string): Promise<string> => {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri, 
        [{ resize: { width: 800 } }],
        { 
          compress: 0.6,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true
        }
      );
      return manipResult.base64 || '';
    } catch (error) { 
      console.error('Image compression error:', error);
      throw new Error('이미지 압축 실패');
    }
  };

  const uploadImage = async (uri: string, index: number, total: number): Promise<string | null> => {
    try {
      setUploadProgress(`[${index + 1}/${total}] 압축 중...`);
      
      const base64 = await compressImage(uri);
      
      if (!base64) {
        throw new Error('이미지 변환 실패');
      }

      setUploadProgress(`[${index + 1}/${total}] 업로드 중...`);
      
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const fileName = `${projectId}_${formatDateToString(photoDate)}_${timestamp}_${randomStr}.jpg`;
      const filePath = `${projectId}/${fileName}`;

      const arrayBuffer = decode(base64);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('site-photos')
        .upload(filePath, arrayBuffer, { 
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) { 
        console.error('Upload error:', uploadError);
        throw new Error(uploadError.message);
      }

      const { data: urlData } = supabase.storage
        .from('site-photos')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) { 
      console.error('Upload process error:', error);
      return null;
    }
  };

  const saveToDatabase = async (photoUrl: string, photoDateString: string, index: number, total: number): Promise<boolean> => {
    try {
      setUploadProgress(`[${index + 1}/${total}] DB 저장 중...`);
      
      const { error } = await supabase
        .from('site_photos')
        .insert({ 
          project_id: projectId, 
          photo_date: photoDateString, 
          photo_url: photoUrl, 
          comment: comment || null, 
          visibility: visibility 
        })
        .select();

      if (error) { 
        console.error('DB save error:', error);
        return false;
      }
      return true;
    } catch (error) { 
      console.error('DB save process error:', error);
      return false;
    }
  };

  const navigateBack = () => {
    try {
      // 메모리 정리
      setSelectedImages([]);
      setComment('');
      setUploadProgress('');
      setLoading(false);
      
      // 안전한 네비게이션
      if (navigation && navigation.goBack) {
        navigation.goBack();
      } else if (navigation && navigation.navigate) {
        navigation.navigate('SiteDiary');
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleSubmit = async () => {
    if (!projectId) { 
      Alert.alert('오류', '프로젝트를 선택해주세요.'); 
      return; 
    }
    if (selectedImages.length === 0) { 
      Alert.alert('오류', '사진을 선택해주세요.'); 
      return; 
    }
    if (selectedImages.length > 3) { 
      Alert.alert('제한', '한 번에 최대 3장까지 업로드할 수 있습니다.'); 
      return; 
    }

    setLoading(true);
    setUploadProgress('준비 중...');

    try {
      const photoDateString = formatDateToString(photoDate);
      let successCount = 0;
      const failedIndices: number[] = [];
      const totalImages = selectedImages.length;

      for (let i = 0; i < totalImages; i++) {
        const uri = selectedImages[i];
        
        try {
          const photoUrl = await uploadImage(uri, i, totalImages);
          
          if (!photoUrl) { 
            failedIndices.push(i + 1);
            continue; 
          }

          const dbSuccess = await saveToDatabase(photoUrl, photoDateString, i, totalImages);
          
          if (dbSuccess) { 
            successCount++; 
          } else {
            failedIndices.push(i + 1);
          }

          if (i < totalImages - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (error) {
          console.error(`Failed to process image ${i + 1}:`, error);
          failedIndices.push(i + 1);
        }
      }

      setLoading(false);
      setUploadProgress('');

      if (successCount > 0) { 
        const message = failedIndices.length > 0 
          ? `${successCount}장 성공, ${failedIndices.length}장 실패\n실패한 사진: ${failedIndices.join(', ')}번`
          : `${successCount}장의 사진이 등록되었습니다.`;
        
        // 플랫폼별 알림 처리
        if (Platform.OS === 'web') {
          // 웹에서는 confirm 사용
          if (window.confirm(message + '\n\n목록으로 돌아가시겠습니까?')) {
            navigateBack();
          }
        } else {
          // 모바일에서는 Alert 사용
          Alert.alert(
            failedIndices.length > 0 ? '일부 성공' : '성공', 
            message, 
            [{ 
              text: '확인', 
              onPress: () => {
                // 약간의 지연 후 네비게이션 (크래시 방지)
                setTimeout(() => {
                  navigateBack();
                }, 100);
              }
            }],
            { cancelable: false }
          );
        }
      } else { 
        Alert.alert('오류', '모든 사진 등록에 실패했습니다.\n네트워크 연결을 확인해주세요.'); 
        setLoading(false);
      }
    } catch (error) { 
      console.error('Submit error:', error);
      setLoading(false);
      setUploadProgress('');
      Alert.alert('오류', '저장 중 오류가 발생했습니다.'); 
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => { 
    setShowDatePicker(Platform.OS === 'ios'); 
    if (selectedDate) { 
      const adjustedDate = new Date(
        selectedDate.getFullYear(), 
        selectedDate.getMonth(), 
        selectedDate.getDate(), 
        12, 0, 0
      ); 
      setPhotoDate(adjustedDate); 
    } 
  };

  return (
    <KeyboardAvoidingView 
      style={s.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView 
        style={s.scrollView} 
        contentContainerStyle={s.scrollViewContent} 
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.content}>
          <View style={s.formGroup}>
            <Text style={s.label}>날짜 *</Text>
            {Platform.OS === 'web' ? (
              <input 
                type="date" 
                value={formatDateToString(photoDate)} 
                onChange={(e: any) => setPhotoDate(parseStringToDate(e.target.value))} 
                style={{ 
                  fontSize: 16, 
                  padding: 12, 
                  borderWidth: 1, 
                  borderColor: '#DDD', 
                  borderRadius: 8, 
                  backgroundColor: '#FFF' 
                }} 
              />
            ) : (
              <>
                <TouchableOpacity 
                  style={s.dateButton} 
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={s.dateButtonText}>
                    {formatDateToString(photoDate)}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker 
                    value={photoDate} 
                    mode="date" 
                    display="default" 
                    onChange={onDateChange} 
                  />
                )}
              </>
            )}
          </View>

          <View style={s.formGroup}>
            <Text style={s.label}>사진 * ({selectedImages.length}/3장)</Text>
            <ScrollView horizontal style={s.imageScrollView}>
              {selectedImages.map((uri, index) => (
                <View key={`${uri}-${index}`} style={s.imageWrapper}>
                  <Image 
                    source={{ uri }} 
                    style={s.thumbnail} 
                    resizeMode="cover"
                  />
                  <TouchableOpacity 
                    style={s.removeButton} 
                    onPress={() => removeImage(index)}
                  >
                    <Text style={s.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {selectedImages.length < 3 && (
                <TouchableOpacity 
                  style={s.addImageButton} 
                  onPress={pickImages}
                  disabled={loading}
                >
                  <Text style={s.addImageText}>📷</Text>
                  <Text style={s.addImageSubtext}>추가</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          <View style={s.formGroup}>
            <Text style={s.label}>메모 (공통)</Text>
            <TextInput 
              style={[s.input, s.textArea]} 
              value={comment} 
              onChangeText={setComment} 
              placeholder="작업 내용, 특이사항 등" 
              multiline 
              numberOfLines={4} 
              textAlignVertical="top"
              editable={!loading}
            />
          </View>

          <View style={s.formGroup}>
            <Text style={s.label}>공개 범위</Text>
            <View style={s.pickerWrapper}>
              <RNPickerSelect 
                value={visibility} 
                onValueChange={(value) => setVisibility(value)} 
                items={[
                  { label: '🔒 내부용', value: 'internal' }, 
                  { label: '📤 클라이언트', value: 'client' }
                ]} 
                style={ps}
                disabled={loading}
              />
            </View>
          </View>

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
              <Text style={s.submitButtonText}>
                {selectedImages.length}장 등록
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({ 
  container: { flex: 1, backgroundColor: '#F5F5F5' }, 
  scrollView: { flex: 1 }, 
  scrollViewContent: { flexGrow: 1 }, 
  content: { padding: 16, paddingBottom: 40 }, 
  formGroup: { marginBottom: 20 }, 
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 }, 
  dateButton: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12 }, 
  dateButtonText: { fontSize: 16, color: '#333' }, 
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, fontSize: 16, color: '#333' }, 
  textArea: { height: 100, textAlignVertical: 'top' }, 
  pickerWrapper: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, backgroundColor: '#FFF' }, 
  imageScrollView: { flexDirection: 'row' }, 
  imageWrapper: { position: 'relative', marginRight: 12 }, 
  thumbnail: { width: 120, height: 120, borderRadius: 8 }, 
  removeButton: { position: 'absolute', top: -8, right: -8, backgroundColor: '#FF3B30', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', elevation: 5 }, 
  removeButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }, 
  addImageButton: { width: 120, height: 120, borderWidth: 2, borderColor: '#DDD', borderRadius: 8, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9F9F9' }, 
  addImageText: { fontSize: 32, marginBottom: 4 }, 
  addImageSubtext: { fontSize: 14, color: '#999' }, 
  submitButton: { backgroundColor: '#007AFF', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10, marginBottom: 20 }, 
  submitButtonDisabled: { backgroundColor: '#CCC' }, 
  submitButtonText: { color: '#FFF', fontSize: 18, fontWeight: '600' }, 
  loadingContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 }, 
  loadingText: { color: '#FFF', fontSize: 16, fontWeight: '600' } 
});

const ps = StyleSheet.create({ 
  inputIOS: { fontSize: 16, paddingVertical: 12, paddingHorizontal: 10, color: '#333' }, 
  inputAndroid: { fontSize: 16, paddingVertical: 8, paddingHorizontal: 10, color: '#333' }, 
  inputWeb: { fontSize: 16, paddingVertical: 12, paddingHorizontal: 10, color: '#333' } 
});

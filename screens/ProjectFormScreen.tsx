import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import RNPickerSelect from 'react-native-picker-select'
import { supabase } from '../lib/supabase'

export default function ProjectFormScreen({ route, navigation }: any) {
  const editMode = route?.params?.editMode || false
  const projectData = route?.params?.projectData || null
  const [projectName, setProjectName] = useState('')
  const [clientName, setClientName] = useState('')
  const [workType, setWorkType] = useState('design_and_construction')
  const [area, setArea] = useState('')
  const [location, setLocation] = useState('')
  const [businessMajor, setBusinessMajor] = useState('')
  const [businessMinor, setBusinessMinor] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [estimatedBudget, setEstimatedBudget] = useState('')
  const [status, setStatus] = useState('estimate')
  const [notes, setNotes] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [googleDriveUrl, setGoogleDriveUrl] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (editMode && projectData) {
      setProjectName(projectData.project_name)
      setClientName(projectData.client_name)
      setWorkType(projectData.work_type)
      setArea(projectData.area?.toString() || '')
      setLocation(projectData.location || '')
      setBusinessMajor(projectData.business_category_major || '')
      setBusinessMinor(projectData.business_category_minor || '')
      setStartDate(projectData.start_date)
      setEndDate(projectData.end_date || '')
      setEstimatedBudget(projectData.estimated_budget.toString())
      setStatus(projectData.status)
      setNotes(projectData.notes || '')
      setBankAccount(projectData.bank_account || '')
      setGoogleDriveUrl(projectData.google_drive_url || '')
    }
  }, [editMode, projectData])

  const handleSubmit = async () => {
    if (!projectName || !clientName || !estimatedBudget) { alert('프로젝트명, 클라이언트명, 예산은 필수입니다'); return }
    setLoading(true)
    const submitData = { 
      project_name: projectName, 
      client_name: clientName, 
      work_type: workType, 
      area: area ? parseFloat(area) : null, 
      location: location || null, 
      business_category_major: businessMajor || null, 
      business_category_minor: businessMinor || null, 
      start_date: startDate, 
      end_date: endDate || null, 
      estimated_budget: parseFloat(estimatedBudget), 
      status: status, 
      notes: notes || null,
      bank_account: bankAccount || null,
      google_drive_url: googleDriveUrl || null
    }
    try {
      if (editMode && projectData?.id) {
        const { error } = await supabase.from('projects').update(submitData).eq('id', projectData.id)
        if (error) { alert('수정 실패'); setLoading(false); return }
        alert('수정되었습니다!')
        navigation.navigate('프로젝트 관리', { updatedId: projectData.id })
      } else {
        const { error } = await supabase.from('projects').insert([submitData])
        if (error) { alert('등록 실패'); setLoading(false); return }
        alert('프로젝트가 등록되었습니다!')
        navigation.goBack()
      }
    } catch (err) { alert('저장 중 오류가 발생했습니다') } finally { setLoading(false) }
  }

  const handleCancel = () => { navigation.goBack() }

  return (
    <SafeAreaView style={s.sa} edges={['top']}>
      <ScrollView style={s.c}>
        <Text style={s.ti}>{editMode ? '프로젝트 수정' : '프로젝트 등록'}</Text>
        <Text style={s.l}>프로젝트명 *</Text>
        <TextInput style={s.i} value={projectName} onChangeText={setProjectName} placeholder="강남역 카페 인테리어" placeholderTextColor="#999" />
        <Text style={s.l}>클라이언트명 *</Text>
        <TextInput style={s.i} value={clientName} onChangeText={setClientName} placeholder="홍길동" placeholderTextColor="#999" />
        <Text style={s.l}>작업 구분 *</Text>
        <View style={s.pc}><RNPickerSelect value={workType} onValueChange={(v) => setWorkType(v)} items={[{ label: '설계+시공', value: 'design_and_construction' }, { label: '설계만', value: 'design_only' }, { label: '시공만', value: 'construction_only' }]} style={ps} useNativeAndroidPickerStyle={false} /></View>
        <Text style={s.l}>면적 (평)</Text>
        <TextInput style={s.i} value={area} onChangeText={setArea} placeholder="45.5" placeholderTextColor="#999" keyboardType="numeric" />
        <Text style={s.l}>위치</Text>
        <TextInput style={s.i} value={location} onChangeText={setLocation} placeholder="서울시 강남구 강남대로 123" placeholderTextColor="#999" />
        <Text style={s.l}>업종 대분류</Text>
        <TextInput style={s.i} value={businessMajor} onChangeText={setBusinessMajor} placeholder="상업, 주거, 공공 등" placeholderTextColor="#999" />
        <Text style={s.l}>업종 소분류</Text>
        <TextInput style={s.i} value={businessMinor} onChangeText={setBusinessMinor} placeholder="카페, 아파트, 사무실 등" placeholderTextColor="#999" />
        <Text style={s.l}>시작일 *</Text>
        {Platform.OS === 'web' ? (<View style={s.i}><input type="date" value={startDate} onChange={(e: any) => setStartDate(e.target.value)} style={{ width: '100%', border: 'none', fontSize: 16, fontFamily: 'inherit' }} /></View>) : (<TextInput style={s.i} value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" placeholderTextColor="#999" />)}
        <Text style={s.l}>종료일</Text>
        {Platform.OS === 'web' ? (<View style={s.i}><input type="date" value={endDate} onChange={(e: any) => setEndDate(e.target.value)} style={{ width: '100%', border: 'none', fontSize: 16, fontFamily: 'inherit' }} /></View>) : (<TextInput style={s.i} value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD (미정이면 비워두세요)" placeholderTextColor="#999" />)}
        <Text style={s.l}>예산 (원) *</Text>
        <TextInput style={s.i} value={estimatedBudget} onChangeText={setEstimatedBudget} placeholder="50000000" placeholderTextColor="#999" keyboardType="numeric" />
        
        {/* 사용통장 번호 필드 추가 */}
        <Text style={s.l}>사용통장 번호</Text>
        <TextInput style={s.i} value={bankAccount} onChangeText={setBankAccount} placeholder="110-123-456789" placeholderTextColor="#999" keyboardType="default" />
        
        {/* 구글드라이브 경로 필드 추가 */}
        <Text style={s.l}>구글드라이브 경로</Text>
        <TextInput style={s.i} value={googleDriveUrl} onChangeText={setGoogleDriveUrl} placeholder="https://drive.google.com/drive/folders/..." placeholderTextColor="#999" keyboardType="url" autoCapitalize="none" />
        
        <Text style={s.l}>상태 *</Text>
        <View style={s.pc}><RNPickerSelect value={status} onValueChange={(v) => setStatus(v)} items={[{ label: '견적', value: 'estimate' }, { label: '진행중', value: 'in_progress' }, { label: '완료', value: 'completed' }, { label: '취소', value: 'cancelled' }]} style={ps} useNativeAndroidPickerStyle={false} /></View>
        <Text style={s.l}>비고</Text>
        <TextInput style={[s.i, s.ta]} value={notes} onChangeText={setNotes} placeholder="추가 메모" placeholderTextColor="#999" multiline numberOfLines={3} />
        {editMode && (<TouchableOpacity style={s.cb} onPress={handleCancel}><Text style={s.cbt}>취소</Text></TouchableOpacity>)}
        <TouchableOpacity style={[s.sb, loading && s.sbd]} onPress={handleSubmit} disabled={loading}><Text style={s.sbt}>{loading ? (editMode ? '수정 중...' : '등록 중...') : (editMode ? '수정' : '등록')}</Text></TouchableOpacity>
        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({ sa: { flex: 1, backgroundColor: '#f5f5f5' }, c: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' }, ti: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, marginTop: 40, color: '#333' }, l: { fontSize: 16, fontWeight: '600', marginTop: 15, marginBottom: 8, color: '#333' }, i: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, fontSize: 16 }, ta: { height: 80, textAlignVertical: 'top' }, pc: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, overflow: 'hidden' }, cb: { backgroundColor: '#999', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 20 }, cbt: { color: '#fff', fontSize: 18, fontWeight: 'bold' }, sb: { backgroundColor: '#007AFF', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 }, sbd: { backgroundColor: '#999' }, sbt: { color: '#fff', fontSize: 18, fontWeight: 'bold' } })

const ps = StyleSheet.create({ inputIOS: { fontSize: 16, paddingVertical: 12, paddingHorizontal: 12, color: '#333', backgroundColor: 'transparent' }, inputAndroid: { fontSize: 16, paddingHorizontal: 12, paddingVertical: 8, color: '#333', backgroundColor: 'transparent' }, inputWeb: { fontSize: 16, paddingVertical: 12, paddingHorizontal: 12, color: '#333', backgroundColor: 'transparent' }, placeholder: { color: '#999', fontSize: 16 } })

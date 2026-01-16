import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import DateTimePicker from '@react-native-community/datetimepicker'
import RNPickerSelect from 'react-native-picker-select'
import { supabase } from '../lib/supabase'
import type { Project, WorkCategory } from '../types/database'

export default function WorkLogScreen({ route, navigation }: any) {
  const editMode = route?.params?.editMode || false
  const logData = route?.params?.logData || null
  const [projects, setProjects] = useState<Project[]>([])
  const [categories, setCategories] = useState<WorkCategory[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0])
  const [workContent, setWorkContent] = useState('')
  const [cost, setCost] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [workerName, setWorkerName] = useState('')
  const [notes, setNotes] = useState('기본')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  
  useEffect(() => { loadData() }, [])

  useEffect(() => {
    const focusListener = navigation?.addListener('focus', () => {
      if (!editMode) { resetForm(); setSelectedDate(new Date()); setWorkDate(new Date().toISOString().split('T')[0]) }
    })
    const tabPressListener = navigation?.addListener('tabPress', (e: any) => {
      if (editMode) { e.preventDefault(); navigation.setParams({ editMode: false, logData: null }); resetForm(); setSelectedDate(new Date()); setWorkDate(new Date().toISOString().split('T')[0]) }
    })
    return () => { focusListener?.(); tabPressListener?.() }
  }, [navigation, editMode])

  useEffect(() => {
    if (editMode && logData) {
      setSelectedProject(logData.project_id); setWorkDate(logData.work_date); setWorkContent(logData.work_content); setCost(logData.cost.toString()); setSelectedCategory(logData.work_cate1); setWorkerName(logData.worker_name); setNotes(logData.notes || '기본'); setSelectedDate(new Date(logData.work_date))
    }
  }, [editMode, logData])

  const loadData = async () => { setLoadingData(true); await Promise.all([fetchProjects(), fetchCategories()]); setLoadingData(false) }
  const fetchProjects = async () => { const { data, error } = await supabase.from('projects').select('id, project_name, client_name, status').in('status', ['estimate', 'in_progress']).order('created_at', { ascending: false }); if (error) { console.error(error); alert('프로젝트를 불러올 수 없습니다') } else { setProjects(data || []) } }
  const fetchCategories = async () => { const { data, error } = await supabase.from('work_categories').select('id, category_name, description').eq('is_active', true).order('sort_order'); if (error) { console.error(error) } else { setCategories(data || []) } }

  const handleSubmit = async () => {
    if (!selectedProject || !workContent || !cost || !selectedCategory || !workerName) { alert('비고를 제외한 모든 항목을 입력해주세요'); return }
    setLoading(true)
    const submitData = { project_id: selectedProject, work_date: workDate, work_content: workContent, cost: parseFloat(cost), work_cate1: selectedCategory, worker_name: workerName, notes: notes }
    try {
      if (editMode && logData?.id) {
        const { error } = await supabase.from('work_logs').update(submitData).eq('id', logData.id)
        if (error) { console.error('수정 실패:', error); alert('수정 실패'); setLoading(false); return }
        alert('수정되었습니다!')
        if (navigation) { navigation.navigate('작업일지 목록', { updatedId: logData.id }) }
      } else {
        const { error } = await supabase.from('work_logs').insert([submitData])
        if (error) { console.error('저장 실패:', error); alert('저장 실패'); setLoading(false); return }
        alert('작업일지가 저장되었습니다!')
        resetForm()
      }
    } catch (err) { console.error('예외 발생:', err); alert('저장 중 오류가 발생했습니다') } finally { setLoading(false) }
  }

  const resetForm = () => { setSelectedProject(''); setWorkDate(new Date().toISOString().split('T')[0]); setWorkContent(''); setCost(''); setSelectedCategory(''); setWorkerName(''); setNotes('기본'); setSelectedDate(new Date()) }
  const handleCancel = () => { resetForm(); if (navigation) { navigation.navigate('작업일지 목록') } }
  const onDateChange = (event: any, date?: Date) => { setShowDatePicker(false); if (date) { setSelectedDate(date); setWorkDate(date.toISOString().split('T')[0]) } }

  if (loadingData) { return (<View style={s.cc}><ActivityIndicator size="large" color="#007AFF" /><Text style={s.lt}>데이터 로딩 중...</Text></View>) }

  return (
    <SafeAreaView style={s.sa} edges={['top']}>
      <ScrollView style={s.c}>
        <Text style={s.ti}>{editMode ? '작업일지 수정' : '작업일지 입력'}</Text>
        <Text style={s.l}>날짜 *</Text>
        {Platform.OS === 'web' ? (<View style={s.i}><input type="date" value={workDate} onChange={(e: any) => setWorkDate(e.target.value)} max={new Date().toISOString().split('T')[0]} style={{ width: '100%', border: 'none', fontSize: 16, fontFamily: 'inherit' }} /></View>) : (<><TouchableOpacity style={s.db} onPress={() => setShowDatePicker(true)}><Text style={s.dbt}>📅 {workDate}</Text></TouchableOpacity>{showDatePicker && (<DateTimePicker value={selectedDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onDateChange} maximumDate={new Date()} />)}</>)}
        <Text style={s.l}>프로젝트 선택 *</Text>
        <View style={s.pc}><RNPickerSelect value={selectedProject} onValueChange={(v) => setSelectedProject(v)} items={(projects || []).map(p => ({ label: `${p.project_name} (${p.client_name})`, value: p.id }))} placeholder={{ label: '프로젝트를 선택하세요', value: '' }} style={ps} useNativeAndroidPickerStyle={false} /></View>
        <Text style={s.l}>공정 *</Text>
        <View style={s.pc}><RNPickerSelect value={selectedCategory} onValueChange={(v) => setSelectedCategory(v)} items={(categories || []).map(c => ({ label: c.category_name, value: c.category_name }))} placeholder={{ label: '공정을 선택하세요', value: '' }} style={ps} useNativeAndroidPickerStyle={false} /></View>
        <Text style={s.l}>작업 내용 *</Text>
        <TextInput style={[s.i, s.ta]} value={workContent} onChangeText={setWorkContent} placeholder="작업 내용을 입력하세요" placeholderTextColor="#999" multiline numberOfLines={4} />
        <Text style={s.l}>비용 (원) *</Text>
        <TextInput style={s.i} value={cost} onChangeText={setCost} placeholder="금액을 입력하세요" placeholderTextColor="#999" keyboardType="numeric" />
        <Text style={s.l}>담당자 *</Text>
        <TextInput style={s.i} value={workerName} onChangeText={setWorkerName} placeholder="담당자 이름을 입력하세요" placeholderTextColor="#999" />
        <Text style={s.l}>비고</Text>
        <View style={s.pc}><RNPickerSelect value={notes} onValueChange={(v) => setNotes(v)} items={[{ label: '기본', value: '기본' }, { label: '타현장', value: '타현장' }, { label: '연장 0.5', value: '연장 0.5' }, { label: '연장 1', value: '연장 1' }, { label: '연장 1.5', value: '연장 1.5' }, { label: '연장 2', value: '연장 2' }, { label: '연장반', value: '연장반' }]} style={ps} useNativeAndroidPickerStyle={false} /></View>
        {editMode && (<TouchableOpacity style={s.cb} onPress={handleCancel}><Text style={s.cbt}>취소</Text></TouchableOpacity>)}
        <TouchableOpacity style={[s.sb, loading && s.sbd]} onPress={handleSubmit} disabled={loading}><Text style={s.sbt}>{loading ? (editMode ? '수정 중...' : '저장 중...') : (editMode ? '수정' : '저장')}</Text></TouchableOpacity>
        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({ sa: { flex: 1, backgroundColor: '#f5f5f5' }, c: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' }, cc: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }, lt: { marginTop: 10, fontSize: 16, color: '#666' }, ti: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, marginTop: 40, color: '#333' }, l: { fontSize: 16, fontWeight: '600', marginTop: 15, marginBottom: 8, color: '#333' }, i: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, fontSize: 16 }, db: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }, dbt: { fontSize: 16, color: '#333' }, ta: { height: 100, textAlignVertical: 'top' }, pc: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, overflow: 'hidden' }, cb: { backgroundColor: '#999', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 20 }, cbt: { color: '#fff', fontSize: 18, fontWeight: 'bold' }, sb: { backgroundColor: '#007AFF', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 }, sbd: { backgroundColor: '#999' }, sbt: { color: '#fff', fontSize: 18, fontWeight: 'bold' } })

const ps = StyleSheet.create({ inputIOS: { fontSize: 16, paddingVertical: 12, paddingHorizontal: 12, color: '#333', backgroundColor: 'transparent' }, inputAndroid: { fontSize: 16, paddingHorizontal: 12, paddingVertical: 8, color: '#333', backgroundColor: 'transparent' }, inputWeb: { fontSize: 16, paddingVertical: 12, paddingHorizontal: 12, color: '#333', backgroundColor: 'transparent' }, placeholder: { color: '#999', fontSize: 16 } })

import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import RNPickerSelect from 'react-native-picker-select'
import { supabase } from '../lib/supabase'

type ProjectItem = { id: string; project_name: string; client_name: string; status: string; work_type: string; area: number | null; location: string | null; estimated_budget: number; actual_cost: number; start_date: string; end_date: string | null; bank_account: string | null; google_drive_url: string | null }

export default function ProjectManagementScreen({ navigation }: any) {
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [years, setYears] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { const u = navigation.addListener('focus', () => { loadData() }); return u }, [navigation])
  useEffect(() => { if (!loading) { fetchProjects() } }, [selectedYear])

  const loadData = async () => { setLoading(true); await Promise.all([fetchYears(), fetchProjects()]); setLoading(false) }

  const fetchYears = async () => {
    const { data } = await supabase.from('projects').select('start_date')
    if (data) {
      const uniqueYears = Array.from(new Set(data.map(p => new Date(p.start_date).getFullYear().toString()))).sort((a, b) => parseInt(b) - parseInt(a))
      setYears(uniqueYears.length > 0 ? uniqueYears : [new Date().getFullYear().toString()])
    }
  }

  const fetchProjects = async () => {
    const startOfYear = `${selectedYear}-01-01`
    const endOfYear = `${selectedYear}-12-31`
    const { data, error } = await supabase.from('projects').select('*').gte('start_date', startOfYear).lte('start_date', endOfYear).order('start_date', { ascending: false })
    if (error) { console.error(error); alert('프로젝트를 불러올 수 없습니다') } else { setProjects(data || []) }
  }

  const getStatusText = (status: string) => { const m: any = { 'estimate': '견적', 'in_progress': '진행중', 'completed': '완료', 'cancelled': '취소' }; return m[status] || status }
  const getStatusColor = (status: string) => { const m: any = { 'estimate': '#FF9500', 'in_progress': '#007AFF', 'completed': '#34C759', 'cancelled': '#999' }; return m[status] || '#999' }
  const getWorkTypeText = (workType: string) => { const m: any = { 'design_and_construction': '설계+시공', 'design_only': '설계만', 'construction_only': '시공만' }; return m[workType] || workType }
  const formatCurrency = (amount: number) => '₩' + amount.toLocaleString('ko-KR')
  
  const calculateRemaining = (budget: number, actual: number) => {
    if (budget === 0) return 0
    const remaining = ((budget - actual) / budget) * 100
    return Math.round(remaining)
  }
  
  const getRemainingColor = (percent: number) => {
    if (percent >= 40) { return 'rgb(200, 0, 0)' }
    else if (percent >= 20) {
      const ratio = (percent - 20) / 20
      const red = Math.round(200 + (1 - ratio) * 55)
      const green = Math.round(ratio * 100)
      return `rgb(${red}, ${green}, 0)`
    } else if (percent >= 0) {
      const ratio = percent / 20
      const red = Math.round(ratio * 200)
      const green = Math.round(100 + ratio * 50)
      const blue = Math.round(200 - ratio * 100)
      return `rgb(${red}, ${green}, ${blue})`
    } else { return 'rgb(0, 80, 200)' }
  }

  const handleOpenGoogleDrive = async (url: string) => {
    if (!url) return
    const supported = await Linking.canOpenURL(url)
    if (supported) {
      await Linking.openURL(url)
    } else {
      alert('링크를 열 수 없습니다')
    }
  }
  
  const handleAddProject = () => { navigation.navigate('프로젝트 입력', { editMode: false }) }
  const handleEditProject = (project: ProjectItem) => { navigation.navigate('프로젝트 입력', { editMode: true, projectData: project }) }

  if (loading) { return (<View style={s.cc}><ActivityIndicator size="large" color="#007AFF" /><Text style={s.lt}>데이터 로딩 중...</Text></View>) }

  return (
    <SafeAreaView style={s.sa} edges={['top']}>
      <View style={s.co}>
        <View style={s.h}>
          <Text style={s.ti}>프로젝트 관리</Text>
          <TouchableOpacity style={s.ab} onPress={handleAddProject}><Text style={s.abt}>+ 등록</Text></TouchableOpacity>
        </View>
        <View style={s.fc}>
          <Text style={s.fl}>연도:</Text>
          <View style={s.fp}><RNPickerSelect value={selectedYear} onValueChange={(v) => setSelectedYear(v)} items={years.map(y => ({ label: y + '년', value: y }))} style={fps} useNativeAndroidPickerStyle={false} /></View>
          <Text style={s.cnt}>{projects.length}개</Text>
        </View>
        <ScrollView style={s.lc} contentContainerStyle={{ paddingBottom: 80 }}>
          {projects.length === 0 ? (<View style={s.ec}><Text style={s.et}>{selectedYear}년 프로젝트가 없습니다</Text></View>) : (
            projects.map((p) => {
              const remainingPercent = calculateRemaining(p.estimated_budget, p.actual_cost)
              return (
                <TouchableOpacity key={p.id} style={s.card} onPress={() => handleEditProject(p)}>
                  <View style={s.ch}>
                    <View style={s.cl}>
                      <Text style={s.pn}>{p.project_name}</Text>
                      <View style={s.cnr}>
                        <Text style={s.cn}>{p.client_name}</Text>
                        <View style={s.wtb}><Text style={s.wtt}>{getWorkTypeText(p.work_type)}</Text></View>
                        {/* 통장번호 */}
                        {p.bank_account && (
                          <View style={s.bankBox}>
                            <Text style={s.bankText}>{p.bank_account}</Text>
                          </View>
                        )}
                        {/* 구글드라이브 링크 - 통장번호 오른쪽 */}
                        {p.google_drive_url && (
                          <TouchableOpacity 
                            style={s.driveIcon} 
                            onPress={(e) => {
                              e.stopPropagation()
                              handleOpenGoogleDrive(p.google_drive_url!)
                            }}
                          >
                            <Text style={s.driveEmoji}>📁</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    <View style={[s.stb, { backgroundColor: getStatusColor(p.status) }]}><Text style={s.st}>{getStatusText(p.status)}</Text></View>
                  </View>
                  <View style={s.pi}>
                    <Text style={s.pit}>📅 {p.start_date}{p.end_date ? ` ~ ${p.end_date}` : ''}</Text>
                    <View style={s.row}>
                      {p.location ? (<Text style={[s.pit, { flex: 1 }]}>📍 {p.location}</Text>) : (<View style={{ flex: 1 }} />)}
                      <View style={[s.rpb, { backgroundColor: getRemainingColor(remainingPercent) }]}>
                        <Text style={s.rpt}>{remainingPercent}%</Text>
                      </View>
                    </View>
                    {p.area && (<Text style={s.pit}>📐 {p.area}평</Text>)}
                  </View>
                  <View style={s.pbb}>
                    <View style={s.bc}><Text style={s.bl}>예산</Text><Text style={s.bv}>{formatCurrency(p.estimated_budget)}</Text></View>
                    <View style={s.bc}><Text style={s.bl}>실제</Text><Text style={s.bv}>{formatCurrency(p.actual_cost)}</Text></View>
                    <View style={s.bc}><Text style={s.bl}>차액</Text><Text style={[s.bv, { color: (p.estimated_budget - p.actual_cost) >= 0 ? '#34C759' : '#FF3B30' }]}>{formatCurrency(p.estimated_budget - p.actual_cost)}</Text></View>
                  </View>
                </TouchableOpacity>
              )
            })
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({ 
  sa: { flex: 1, backgroundColor: '#f5f5f5' }, 
  co: { flex: 1, backgroundColor: '#f5f5f5' }, 
  cc: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }, 
  lt: { marginTop: 10, fontSize: 16, color: '#666' }, 
  h: { backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, 
  ti: { fontSize: 28, fontWeight: 'bold', color: '#333' }, 
  ab: { backgroundColor: '#007AFF', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 }, 
  abt: { color: '#fff', fontSize: 16, fontWeight: 'bold' }, 
  fc: { backgroundColor: '#fff', padding: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', alignItems: 'center' }, 
  fl: { fontSize: 16, fontWeight: '600', color: '#333', marginRight: 10 }, 
  fp: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 8, overflow: 'hidden' }, 
  cnt: { fontSize: 14, color: '#666', marginLeft: 15 }, 
  lc: { flex: 1, padding: 20 }, 
  ec: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }, 
  et: { fontSize: 16, color: '#999' }, 
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 }, 
  ch: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }, 
  cl: { flex: 1 }, 
  pn: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 }, 
  cnr: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }, 
  cn: { fontSize: 14, color: '#666', marginRight: 8 }, 
  stb: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 }, 
  st: { fontSize: 12, color: '#fff', fontWeight: 'bold' }, 
  pi: { marginBottom: 12 }, 
  pit: { fontSize: 13, color: '#666', marginBottom: 4 }, 
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }, 
  rpb: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginTop: -4, marginBottom: -4 }, 
  rpt: { fontSize: 18, color: '#fff', fontWeight: 'bold' }, 
  wtb: { backgroundColor: '#666', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 12, marginRight: 8 }, 
  wtt: { fontSize: 11, color: '#fff', fontWeight: '600' }, 
  // 통장번호 스타일
  bankBox: { 
    borderWidth: 1.5, 
    borderColor: '#007AFF', 
    paddingVertical: 3, 
    paddingHorizontal: 8, 
    borderRadius: 6,
    backgroundColor: '#F0F8FF',
    marginRight: 6
  },
  bankText: { 
    fontSize: 11, 
    color: '#007AFF', 
    fontWeight: '600',
    fontFamily: 'monospace'
  },
  // 구글드라이브 아이콘 (통장번호 오른쪽)
  driveIcon: {
    padding: 2
  },
  driveEmoji: {
    fontSize: 18
  },
  pbb: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee' }, 
  bc: { flex: 1, alignItems: 'center' }, 
  bl: { fontSize: 11, color: '#999', marginBottom: 4 }, 
  bv: { fontSize: 14, fontWeight: 'bold', color: '#333' } 
})

const fps = StyleSheet.create({ inputIOS: { fontSize: 15, paddingVertical: 10, paddingHorizontal: 12, color: '#333', backgroundColor: 'transparent' }, inputAndroid: { fontSize: 15, paddingVertical: 8, paddingHorizontal: 12, color: '#333', backgroundColor: 'transparent' }, inputWeb: { fontSize: 15, paddingVertical: 10, paddingHorizontal: 12, color: '#333', backgroundColor: 'transparent' }, placeholder: { color: '#999' } })

import React, { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import RNPickerSelect from 'react-native-picker-select'
import { supabase } from '../lib/supabase'
import type { Project } from '../types/database'

type WorkLogWithProject = { 
  id: string
  project_id: string
  work_date: string
  work_content: string
  cost: number
  work_cate1: string
  worker_name: string
  notes: string | null
  payment_completed: boolean
  project: { project_name: string; client_name: string } 
}
type WorkCategory = { id: string; category_name: string }

export default function WorkLogListScreen({ route, navigation }: any) {
  const scrollViewRef = useRef<ScrollView>(null)
  const [workLogs, setWorkLogs] = useState<WorkLogWithProject[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [categories, setCategories] = useState<WorkCategory[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [totalCost, setTotalCost] = useState(0)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [itemLayouts, setItemLayouts] = useState<{ [key: string]: number }>({})

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const updatedId = route?.params?.updatedId
      if (updatedId) {
        navigation.setParams({ updatedId: null })
        setHighlightedId(updatedId)
        setTimeout(() => {
          const layout = itemLayouts[updatedId]
          if (layout !== undefined && scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ y: layout - 100, animated: true })
          }
        }, 300)
        setTimeout(() => setHighlightedId(null), 3000)
      }
      loadData()
    })
    return unsubscribe
  }, [navigation, route, itemLayouts])

  useEffect(() => { 
    if (!loading) { 
      setSelectedCategory('all')
      fetchWorkLogs() 
    } 
  }, [selectedProject])
  
  useEffect(() => { 
    if (!loading) { 
      fetchWorkLogs() 
    } 
  }, [selectedCategory])

  const loadData = async () => { 
    setLoading(true)
    await Promise.all([fetchProjects(), fetchWorkLogs()])
    setLoading(false) 
  }
  
  const fetchProjects = async () => { 
    const { data, error } = await supabase
      .from('projects')
      .select('id, project_name, client_name, status')
      .in('status', ['estimate', 'in_progress'])
      .order('created_at', { ascending: false })
    
    if (!error) { 
      setProjects(data || []) 
    } 
  }

  const fetchWorkLogs = async () => {
    let query = supabase
      .from('work_logs')
      .select('id, project_id, work_date, work_content, cost, work_cate1, worker_name, notes, payment_completed, projects:project_id (project_name, client_name)')
      .order('work_date', { ascending: false })
    
    if (selectedProject !== 'all') { 
      query = query.eq('project_id', selectedProject) 
    }
    if (selectedCategory !== 'all') { 
      query = query.eq('work_cate1', selectedCategory) 
    }
    
    const { data, error } = await query
    
    if (error) { 
      alert('작업일지를 불러올 수 없습니다') 
    } else {
      const formattedData = (data || []).map((log: any) => ({ 
        ...log, 
        project: log.projects,
        payment_completed: log.payment_completed || false
      }))
      setWorkLogs(formattedData)
      setTotalCost(formattedData.reduce((sum, log) => sum + log.cost, 0))
      
      let catQuery = supabase.from('work_logs').select('work_cate1')
      if (selectedProject !== 'all') { 
        catQuery = catQuery.eq('project_id', selectedProject) 
      }
      const catData = await catQuery
      if (catData.data) {
        const uniqueCats = Array.from(new Set(catData.data.map(log => log.work_cate1)))
          .map(catName => ({ id: catName, category_name: catName }))
        setCategories(uniqueCats)
      }
    }
  }

  const handleAdd = () => { 
    navigation.navigate('작업일지 입력', { editMode: false }) 
  }
  
  const handleEdit = (log: WorkLogWithProject) => { 
    navigation.navigate('작업일지 입력', { 
      editMode: true, 
      logData: { 
        id: log.id, 
        project_id: log.project_id, 
        work_date: log.work_date, 
        work_content: log.work_content, 
        cost: log.cost, 
        work_cate1: log.work_cate1, 
        worker_name: log.worker_name, 
        notes: log.notes || '기본',
        payment_completed: log.payment_completed
      } 
    }) 
  }
  
  const handlePaymentToggle = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('work_logs')
      .update({ payment_completed: !currentStatus })
      .eq('id', id)
    
    if (error) {
      Alert.alert('오류', '결제 상태 변경에 실패했습니다')
    } else {
      fetchWorkLogs()
    }
  }
  
  const handleDelete = (id: string) => { 
    Alert.alert(
      '삭제 확인', 
      '이 작업일지를 삭제하시겠습니까?', 
      [
        { text: '취소', style: 'cancel' }, 
        { 
          text: '삭제', 
          style: 'destructive', 
          onPress: async () => { 
            const { error } = await supabase
              .from('work_logs')
              .delete()
              .eq('id', id)
            
            if (error) { 
              alert('삭제 실패') 
            } else { 
              alert('삭제되었습니다')
              fetchWorkLogs() 
            } 
          } 
        }
      ]
    ) 
  }
  
  const formatCurrency = (amount: number) => '₩' + amount.toLocaleString('ko-KR')
  const handleLayout = (id: string, y: number) => { 
    setItemLayouts(prev => ({ ...prev, [id]: y })) 
  }

  if (loading) { 
    return (
      <View style={s.cc}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={s.lt}>데이터 로딩 중...</Text>
      </View>
    ) 
  }

  return (
    <SafeAreaView style={s.sa} edges={['top']}>
      <View style={s.co}>
        <View style={s.h}>
          <View style={s.hLeft}>
            <Text style={s.ti}>작업일지</Text>
            <View style={s.sr}>
              <Text style={s.tt}>총 {workLogs.length}건 · {formatCurrency(totalCost)}</Text>
              {selectedCategory !== 'all' && totalCost > 0 && (
                <Text style={s.ct}>{selectedCategory} 합계: {formatCurrency(totalCost)}</Text>
              )}
            </View>
          </View>
          <TouchableOpacity style={s.ab} onPress={handleAdd}>
            <Text style={s.abt}>+ 등록</Text>
          </TouchableOpacity>
        </View>
        
        <View style={s.fc}>
          <Text style={s.fl}>프로젝트:</Text>
          <View style={s.fp}>
            <RNPickerSelect 
              value={selectedProject} 
              onValueChange={(v) => setSelectedProject(v)} 
              items={[
                { label: '전체', value: 'all' }, 
                ...(projects || []).map(p => ({ label: p.project_name, value: p.id }))
              ]} 
              style={fps} 
              useNativeAndroidPickerStyle={false} 
            />
          </View>
        </View>
        
        <View style={s.fc}>
          <Text style={s.fl}>공정:</Text>
          <View style={s.fp}>
            <RNPickerSelect 
              value={selectedCategory} 
              onValueChange={(v) => setSelectedCategory(v)} 
              items={[
                { label: '전체', value: 'all' }, 
                ...(categories || []).map(c => ({ label: c.category_name, value: c.category_name }))
              ]} 
              style={fps} 
              useNativeAndroidPickerStyle={false} 
            />
          </View>
        </View>
        
        <ScrollView ref={scrollViewRef} style={s.lc}>
          {workLogs.length === 0 ? (
            <View style={s.ec}>
              <Text style={s.et}>작업일지가 없습니다</Text>
            </View>
          ) : (
            workLogs.map((log) => (
              <TouchableOpacity 
                key={log.id} 
                style={[s.card, highlightedId === log.id && s.cardHighlight]} 
                onLayout={(e) => handleLayout(log.id, e.nativeEvent.layout.y)}
                onPress={() => handleEdit(log)}
                activeOpacity={0.7}
              >
                <View style={s.lh}>
                  <View style={s.dc}>
                    <Text style={s.dt}>{log.work_date}</Text>
                    <View style={s.cb}>
                      <Text style={s.cbt}>{log.work_cate1}</Text>
                    </View>
                    <TouchableOpacity 
                      onPress={(e) => { 
                        e.stopPropagation()
                        handlePaymentToggle(log.id, log.payment_completed) 
                      }}
                      style={[s.psb, log.payment_completed ? s.psbPaid : s.psbPending]}
                    >
                      <Text style={s.psbt}>{log.payment_completed ? '완료' : '대기'}</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity 
                    onPress={(e) => { 
                      e.stopPropagation()
                      handleDelete(log.id) 
                    }} 
                    style={s.db}
                  >
                    <Text style={s.dbt}>삭제</Text>
                  </TouchableOpacity>
                </View>
                
                {selectedProject === 'all' && log.project && (
                  <Text style={s.pn}>{log.project.project_name} ({log.project.client_name})</Text>
                )}
                
                <Text style={s.wc} numberOfLines={2}>{log.work_content}</Text>
                
                <View style={s.lf}>
                  <Text style={s.cot}>{formatCurrency(log.cost)}</Text>
                  <Text style={s.wt}>담당: {log.worker_name}</Text>
                  {log.notes && log.notes !== '기본' && (
                    <View style={s.nb}>
                      <Text style={s.nt}>{log.notes}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
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
  h: { backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  hLeft: { flex: 1 },
  ti: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  ab: { backgroundColor: '#007AFF', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  abt: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  sr: { flexDirection: 'column' },
  tt: { fontSize: 16, color: '#666', marginBottom: 4 },
  ct: { fontSize: 16, color: '#34C759', fontWeight: 'bold' },
  fc: { backgroundColor: '#fff', padding: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', alignItems: 'center' },
  fl: { fontSize: 16, fontWeight: '600', color: '#333', marginRight: 10, width: 70 },
  fp: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 8, overflow: 'hidden' },
  lc: { flex: 1, padding: 20 },
  ec: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  et: { fontSize: 16, color: '#999' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, borderWidth: 2, borderColor: 'transparent' },
  cardHighlight: { borderColor: '#34C759', backgroundColor: '#f0fff4', borderWidth: 3 },
  lh: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dc: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dt: { fontSize: 14, color: '#666', fontWeight: '600', marginRight: 8 },
  cb: { backgroundColor: '#34C759', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, marginRight: 6 },
  cbt: { fontSize: 12, color: '#fff', fontWeight: '600' },
  psb: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  psbPending: { backgroundColor: '#FF9500' },
  psbPaid: { backgroundColor: '#007AFF' },
  psbt: { fontSize: 11, color: '#fff', fontWeight: 'bold' },
  db: { paddingVertical: 4, paddingHorizontal: 12 },
  dbt: { fontSize: 14, color: '#FF3B30', fontWeight: '500' },
  pn: { fontSize: 14, color: '#007AFF', marginBottom: 6, fontWeight: '500' },
  wc: { fontSize: 15, color: '#333', marginBottom: 12, lineHeight: 20 },
  lf: { flexDirection: 'row', alignItems: 'center' },
  cot: { fontSize: 16, color: '#333', fontWeight: 'bold', marginRight: 12 },
  wt: { fontSize: 13, color: '#666', marginRight: 12 },
  nb: { backgroundColor: '#FF9500', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10 },
  nt: { fontSize: 11, color: '#fff', fontWeight: '600' }
})

const fps = StyleSheet.create({
  inputIOS: { fontSize: 15, paddingVertical: 10, paddingHorizontal: 12, color: '#333', backgroundColor: 'transparent' },
  inputAndroid: { fontSize: 15, paddingVertical: 8, paddingHorizontal: 12, color: '#333', backgroundColor: 'transparent' },
  inputWeb: { fontSize: 15, paddingVertical: 10, paddingHorizontal: 12, color: '#333', backgroundColor: 'transparent' },
  placeholder: { color: '#999' }
})
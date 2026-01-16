import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'

type Worker = {
  id: string
  name: string
  default_cost: number
  is_active: boolean
}

export default function WorkerManagementScreen({ navigation }: any) {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [newWorkerName, setNewWorkerName] = useState('')
  const [newWorkerCost, setNewWorkerCost] = useState('')
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null)
  const [editName, setEditName] = useState('')
  const [editCost, setEditCost] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWorkers()
  }, [])

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchWorkers()
    })
    return unsubscribe
  }, [navigation])

  const fetchWorkers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .order('name')
    
    if (error) {
      console.error('작업자 로드 실패:', error)
      Alert.alert('오류', '작업자 목록을 불러올 수 없습니다')
    } else {
      setWorkers(data || [])
    }
    setLoading(false)
  }

  const handleAddWorker = async () => {
    if (!newWorkerName.trim() || !newWorkerCost.trim()) {
      Alert.alert('알림', '작업자 이름과 금액을 모두 입력해주세요')
      return
    }

    const cost = parseFloat(newWorkerCost)
    if (isNaN(cost) || cost < 0) {
      Alert.alert('알림', '올바른 금액을 입력해주세요')
      return
    }

    const { error } = await supabase
      .from('workers')
      .insert([{ 
        name: newWorkerName.trim(), 
        default_cost: cost,
        is_active: true 
      }])

    if (error) {
      console.error('작업자 추가 실패:', error)
      Alert.alert('오류', '작업자 추가에 실패했습니다')
    } else {
      Alert.alert('성공', '작업자가 추가되었습니다')
      setNewWorkerName('')
      setNewWorkerCost('')
      fetchWorkers()
    }
  }

  const handleEditWorker = (worker: Worker) => {
    setEditingWorker(worker)
    setEditName(worker.name)
    setEditCost(worker.default_cost.toString())
  }

  const handleSaveEdit = async () => {
    if (!editingWorker || !editName.trim() || !editCost.trim()) {
      Alert.alert('알림', '작업자 이름과 금액을 모두 입력해주세요')
      return
    }

    const cost = parseFloat(editCost)
    if (isNaN(cost) || cost < 0) {
      Alert.alert('알림', '올바른 금액을 입력해주세요')
      return
    }

    const { error } = await supabase
      .from('workers')
      .update({ 
        name: editName.trim(), 
        default_cost: cost 
      })
      .eq('id', editingWorker.id)

    if (error) {
      console.error('작업자 수정 실패:', error)
      Alert.alert('오류', '작업자 수정에 실패했습니다')
    } else {
      Alert.alert('성공', '작업자 정보가 수정되었습니다')
      setEditingWorker(null)
      setEditName('')
      setEditCost('')
      fetchWorkers()
    }
  }

  const handleCancelEdit = () => {
    setEditingWorker(null)
    setEditName('')
    setEditCost('')
  }

  const handleToggleActive = async (worker: Worker) => {
    const { error } = await supabase
      .from('workers')
      .update({ is_active: !worker.is_active })
      .eq('id', worker.id)

    if (error) {
      console.error('상태 변경 실패:', error)
      Alert.alert('오류', '상태 변경에 실패했습니다')
    } else {
      fetchWorkers()
    }
  }

  const handleDeleteWorker = (worker: Worker) => {
    Alert.alert(
      '삭제 확인',
      `${worker.name} 작업자를 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('workers')
              .delete()
              .eq('id', worker.id)

            if (error) {
              console.error('작업자 삭제 실패:', error)
              Alert.alert('오류', '작업자 삭제에 실패했습니다')
            } else {
              Alert.alert('성공', '작업자가 삭제되었습니다')
              fetchWorkers()
            }
          }
        }
      ]
    )
  }

  const formatCurrency = (amount: number) => '₩' + amount.toLocaleString('ko-KR')

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={s.loadingText}>로딩 중...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton}>
          <Text style={s.backButtonText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={s.title}>작업자 관리</Text>
      </View>

      <ScrollView style={s.content}>
        {/* 새 작업자 추가 */}
        <View style={s.addSection}>
          <Text style={s.sectionTitle}>새 작업자 추가</Text>
          <TextInput
            style={s.input}
            value={newWorkerName}
            onChangeText={setNewWorkerName}
            placeholder="작업자 이름"
            placeholderTextColor="#999"
          />
          <TextInput
            style={s.input}
            value={newWorkerCost}
            onChangeText={setNewWorkerCost}
            placeholder="기본 금액 (원)"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
          <TouchableOpacity style={s.addButton} onPress={handleAddWorker}>
            <Text style={s.addButtonText}>+ 추가</Text>
          </TouchableOpacity>
        </View>

        {/* 작업자 목록 */}
        <View style={s.listSection}>
          <Text style={s.sectionTitle}>작업자 목록 ({workers.length}명)</Text>
          {workers.length === 0 ? (
            <Text style={s.emptyText}>등록된 작업자가 없습니다</Text>
          ) : (
            workers.map((worker) => (
              <View key={worker.id} style={s.workerCard}>
                {editingWorker?.id === worker.id ? (
                  // 수정 모드
                  <View style={s.editMode}>
                    <TextInput
                      style={s.editInput}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="작업자 이름"
                      placeholderTextColor="#999"
                    />
                    <TextInput
                      style={s.editInput}
                      value={editCost}
                      onChangeText={setEditCost}
                      placeholder="금액"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                    />
                    <View style={s.editButtons}>
                      <TouchableOpacity style={s.saveButton} onPress={handleSaveEdit}>
                        <Text style={s.saveButtonText}>저장</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.cancelButton} onPress={handleCancelEdit}>
                        <Text style={s.cancelButtonText}>취소</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  // 일반 모드
                  <>
                    <View style={s.workerInfo}>
                      <View style={s.workerNameRow}>
                        <Text style={s.workerName}>{worker.name}</Text>
                        <TouchableOpacity
                          onPress={() => handleToggleActive(worker)}
                          style={[s.statusBadge, worker.is_active ? s.statusActive : s.statusInactive]}
                        >
                          <Text style={s.statusText}>{worker.is_active ? '활성' : '비활성'}</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={s.workerCost}>{formatCurrency(worker.default_cost)}</Text>
                    </View>
                    <View style={s.workerActions}>
                      <TouchableOpacity
                        style={s.editButtonSmall}
                        onPress={() => handleEditWorker(worker)}
                      >
                        <Text style={s.editButtonTextSmall}>수정</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.deleteButton}
                        onPress={() => handleDeleteWorker(worker)}
                      >
                        <Text style={s.deleteButtonText}>삭제</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: { backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  backButton: { marginBottom: 10 },
  backButtonText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  content: { flex: 1, padding: 20 },
  addSection: { backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 20, elevation: 2 },
  listSection: { backgroundColor: '#fff', padding: 20, borderRadius: 12, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  input: { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, fontSize: 16, marginBottom: 10 },
  addButton: { backgroundColor: '#007AFF', padding: 14, borderRadius: 8, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', fontSize: 16, color: '#999', paddingVertical: 30 },
  workerCard: { backgroundColor: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  workerInfo: { flex: 1 },
  workerNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  workerName: { fontSize: 18, fontWeight: 'bold', color: '#333', marginRight: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusActive: { backgroundColor: '#34C759' },
  statusInactive: { backgroundColor: '#999' },
  statusText: { fontSize: 11, color: '#fff', fontWeight: 'bold' },
  workerCost: { fontSize: 16, color: '#666', fontWeight: '600' },
  workerActions: { flexDirection: 'row' },
  editButtonSmall: { paddingHorizontal: 12, paddingVertical: 6, marginRight: 6 },
  editButtonTextSmall: { fontSize: 14, color: '#007AFF', fontWeight: '600' },
  deleteButton: { paddingHorizontal: 12, paddingVertical: 6 },
  deleteButtonText: { fontSize: 14, color: '#FF3B30', fontWeight: '600' },
  editMode: { flex: 1 },
  editInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, fontSize: 16, marginBottom: 8 },
  editButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
  saveButton: { backgroundColor: '#34C759', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginRight: 8 },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  cancelButton: { backgroundColor: '#999', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  cancelButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' }
})
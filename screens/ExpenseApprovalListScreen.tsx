import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import RNPickerSelect from 'react-native-picker-select'
import { supabase } from '../lib/supabase'

type Project = { id: string; project_name: string; bank_account: string | null }
type ExpenseItem = { id: string; classification: string; work_category: string | null; work_subcategory: string | null; amount: number; vat_included: boolean; account_number: string | null; status: string; created_at: string }

export default function ExpenseApprovalListScreen({ navigation }: any) {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [selectedProjectData, setSelectedProjectData] = useState<Project | null>(null)
  const [expenses, setExpenses] = useState<ExpenseItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { 
    const unsubscribe = navigation.addListener('focus', () => { 
      loadProjects() 
    })
    return unsubscribe 
  }, [navigation])

  useEffect(() => { 
    if (selectedProject) { 
      loadExpenses() 
      const project = projects.find(p => p.id === selectedProject)
      setSelectedProjectData(project || null)
    } 
  }, [selectedProject])

  const loadProjects = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select('id, project_name, bank_account')
      .order('created_at', { ascending: false })
    
    if (error) {
      Alert.alert('오류', '프로젝트를 불러올 수 없습니다')
      setLoading(false)
      return
    }

    setProjects(data || [])
    if (data && data.length > 0 && !selectedProject) {
      setSelectedProject(data[0].id)
    }
    setLoading(false)
  }

  const loadExpenses = async () => {
    if (!selectedProject) return

    const { data, error } = await supabase
      .from('expense_approvals')
      .select('*')
      .eq('project_id', selectedProject)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      Alert.alert('오류', '지출결의서를 불러올 수 없습니다')
      return
    }

    setExpenses(data || [])
  }

  const handleAddExpense = () => {
    if (!selectedProject) {
      Alert.alert('안내', '프로젝트를 먼저 선택해주세요')
      return
    }
    navigation.navigate('지출결의서 입력', { projectId: selectedProject })
  }

  const handleEditExpense = (expense: ExpenseItem) => {
    navigation.navigate('지출결의서 입력', { 
      projectId: selectedProject, 
      expenseData: expense,
      editMode: true 
    })
  }

  const getStatusText = (status: string) => {
    const map: any = { pending: '대기', approved: '승인', paid: '완료' }
    return map[status] || status
  }

  const getStatusColor = (status: string) => {
    const map: any = { pending: '#FF9500', approved: '#007AFF', paid: '#34C759' }
    return map[status] || '#999'
  }

  const formatCurrency = (amount: number) => '₩' + amount.toLocaleString('ko-KR')

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={s.loadingText}>데이터 로딩 중...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>지출결의서</Text>
        <TouchableOpacity style={s.addButton} onPress={handleAddExpense}>
          <Text style={s.addButtonText}>+ 등록</Text>
        </TouchableOpacity>
      </View>

      <View style={s.filterContainer}>
        <Text style={s.filterLabel}>프로젝트:</Text>
        <View style={s.pickerWrapper}>
          <RNPickerSelect
            value={selectedProject}
            onValueChange={(value) => setSelectedProject(value)}
            items={projects.map(p => ({ 
              label: p.project_name, 
              value: p.id 
            }))}
            style={pickerStyles}
            useNativeAndroidPickerStyle={false}
            placeholder={{ label: '프로젝트 선택', value: '' }}
          />
        </View>
      </View>

      {selectedProjectData?.bank_account && (
        <View style={s.bankAccountContainer}>
          <Text style={s.bankAccountLabel}>통장번호:</Text>
          <Text style={s.bankAccountText}>{selectedProjectData.bank_account}</Text>
        </View>
      )}

      <ScrollView style={s.listContainer} contentContainerStyle={{ paddingBottom: 80 }}>
        {expenses.length === 0 ? (
          <View style={s.emptyContainer}>
            <Text style={s.emptyText}>등록된 지출결의서가 없습니다</Text>
          </View>
        ) : (
          expenses.map((expense) => (
            <TouchableOpacity 
              key={expense.id} 
              style={s.card}
              onPress={() => handleEditExpense(expense)}
            >
              <View style={s.cardHeader}>
                <View style={s.categoryRow}>
                  {/* 1차 분류 */}
                  <View style={s.classificationBadge}>
                    <Text style={s.classificationText}>{expense.classification}</Text>
                  </View>
                  
                  {/* 2차 분류 */}
                  {expense.work_category && (
                    <View style={s.categoryBadge}>
                      <Text style={s.categoryText}>{expense.work_category}</Text>
                    </View>
                  )}
                  
                  {/* 3차 분류 */}
                  {expense.work_subcategory && (
                    <View style={s.subcategoryBadge}>
                      <Text style={s.subcategoryText}>{expense.work_subcategory}</Text>
                    </View>
                  )}
                </View>

                <View style={[s.statusBadge, { backgroundColor: getStatusColor(expense.status) }]}>
                  <Text style={s.statusText}>{getStatusText(expense.status)}</Text>
                </View>
              </View>

              <View style={s.amountContainer}>
                <Text style={s.amountValue}>{formatCurrency(expense.amount)}</Text>
                {expense.vat_included && (
                  <Text style={s.vatBadge}>VAT 포함</Text>
                )}
              </View>

              {expense.account_number && (
                <Text style={s.accountNumber}>계좌: {expense.account_number}</Text>
              )}

              <Text style={s.createdDate}>
                등록: {new Date(expense.created_at).toLocaleDateString('ko-KR')}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: { backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  addButton: { backgroundColor: '#007AFF', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  filterContainer: { backgroundColor: '#fff', padding: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', alignItems: 'center' },
  filterLabel: { fontSize: 16, fontWeight: '600', color: '#333', marginRight: 10 },
  pickerWrapper: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 8, overflow: 'hidden' },
  bankAccountContainer: { backgroundColor: '#F0F8FF', padding: 12, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#B3D9FF' },
  bankAccountLabel: { fontSize: 14, fontWeight: '600', color: '#007AFF', marginRight: 8 },
  bankAccountText: { fontSize: 14, color: '#007AFF', fontFamily: 'monospace' },
  listContainer: { flex: 1, padding: 20 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#999' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  
  // 분류를 한 줄로 배치
  categoryRow: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    flexWrap: 'wrap',
    gap: 6
  },
  
  // 1차 분류 (시공/자재/직영/외주)
  classificationBadge: { 
    backgroundColor: '#666', 
    paddingVertical: 5, 
    paddingHorizontal: 12, 
    borderRadius: 12 
  },
  classificationText: { 
    fontSize: 13, 
    color: '#fff', 
    fontWeight: '700' 
  },
  
  // 2차 분류 (공정)
  categoryBadge: { 
    backgroundColor: '#E8F4FD', 
    paddingVertical: 5, 
    paddingHorizontal: 10, 
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007AFF'
  },
  categoryText: { 
    fontSize: 12, 
    color: '#007AFF', 
    fontWeight: '600' 
  },
  
  // 3차 분류 (세부분류)
  subcategoryBadge: { 
    backgroundColor: '#FFF', 
    paddingVertical: 5, 
    paddingHorizontal: 10, 
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD'
  },
  subcategoryText: { 
    fontSize: 11, 
    color: '#666', 
    fontWeight: '500' 
  },
  
  statusBadge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  statusText: { fontSize: 12, color: '#fff', fontWeight: 'bold' },
  
  amountContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#eee', 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee', 
    marginVertical: 8 
  },
  amountValue: { fontSize: 20, fontWeight: 'bold', color: '#333', flex: 1 },
  vatBadge: { fontSize: 10, color: '#FF9500', backgroundColor: '#FFF3E0', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 4, fontWeight: '600' },
  accountNumber: { fontSize: 13, color: '#666', marginTop: 4, fontFamily: 'monospace' },
  createdDate: { fontSize: 11, color: '#999', marginTop: 6 }
})

const pickerStyles = StyleSheet.create({
  inputIOS: { fontSize: 15, paddingVertical: 10, paddingHorizontal: 12, color: '#333' },
  inputAndroid: { fontSize: 15, paddingVertical: 8, paddingHorizontal: 12, color: '#333' },
  inputWeb: { fontSize: 15, paddingVertical: 10, paddingHorizontal: 12, color: '#333' }
})

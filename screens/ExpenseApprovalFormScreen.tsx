import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  Platform, 
  Alert 
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import RNPickerSelect from 'react-native-picker-select'
import { supabase } from '../lib/supabase'

type WorkCategory = { id: string; category_name: string; subcategories: string[] }
type UnpaidWorkLog = { id: string; work_date: string; work_category: string | null; work_subcategory: string | null; notes: string | null }
type Worker = { id: string; name: string; worker_type: string }

export default function ExpenseApprovalFormScreen({ route, navigation }: any) {
  const { projectId, expenseData, editMode } = route.params || {}
  
  const [loading, setLoading] = useState(false)
  const [projectName, setProjectName] = useState('') // 프로젝트 이름
  const [classification, setClassification] = useState(expenseData?.classification || '시공')
  const [workCategory, setWorkCategory] = useState(expenseData?.work_category || '')
  const [workSubcategory, setWorkSubcategory] = useState(expenseData?.work_subcategory || '')
  const [customCategory, setCustomCategory] = useState('')
  const [customSubcategory, setCustomSubcategory] = useState('')
  const [useCustomCategory, setUseCustomCategory] = useState(false)
  const [useCustomSubcategory, setUseCustomSubcategory] = useState(false)
  const [amount, setAmount] = useState(expenseData?.amount?.toString() || '')
  const [vatIncluded, setVatIncluded] = useState(expenseData?.vat_included ?? true)
  const [accountNumber, setAccountNumber] = useState(expenseData?.account_number || '')
  const [notes, setNotes] = useState(expenseData?.notes || '')
  
  const [workCategories, setWorkCategories] = useState<WorkCategory[]>([])
  const [subcategories, setSubcategories] = useState<string[]>([])
  const [unpaidWorkLogs, setUnpaidWorkLogs] = useState<UnpaidWorkLog[]>([])
  const [showUnpaidLogs, setShowUnpaidLogs] = useState(false)
  const [workers, setWorkers] = useState<Worker[]>([])

  useEffect(() => {
    loadWorkCategories()
    loadUnpaidWorkLogs()
    loadProjectInfo()
  }, [])

  useEffect(() => {
    if (workCategory && !useCustomCategory) {
      const category = workCategories.find(c => c.category_name === workCategory)
      setSubcategories(category?.subcategories || [])
    }
  }, [workCategory, workCategories, useCustomCategory])

  // 분류가 직영 또는 외주인 경우 부가세 미포함으로 고정
  useEffect(() => {
    if (classification === '직영' || classification === '외주') {
      setVatIncluded(false)
    }
  }, [classification])

  // 분류가 변경되면 해당 타입의 작업자 불러오기
  useEffect(() => {
    if (classification === '직영' || classification === '외주') {
      loadWorkersByType(classification)
    } else {
      setWorkers([])
    }
  }, [classification])

  const loadProjectInfo = async () => {
    if (!projectId) return

    const { data, error } = await supabase
      .from('projects')
      .select('project_name')
      .eq('id', projectId)
      .single()

    if (!error && data) {
      setProjectName(data.project_name)
    }
  }

  const loadWorkCategories = async () => {
    const { data, error } = await supabase
      .from('work_categories')
      .select('*')
      .order('category_name')

    if (!error && data) {
      setWorkCategories(data as any)
    }
  }

  const loadWorkersByType = async (workerType: string) => {
    if (!projectId) {
      setWorkers([])
      return
    }

    try {
      // 1. 해당 프로젝트의 미결제 작업일지에서 작업자 이름 가져오기
      const { data: unpaidLogs, error: logsError } = await supabase
        .from('work_logs')
        .select('worker_name')
        .eq('project_id', projectId)
        .eq('payment_completed', false)
        .not('worker_name', 'is', null)

      if (logsError) throw logsError

      // 작업일지에 있는 작업자 이름들 (중복 제거)
      const workerNamesInLogs = [...new Set(
        (unpaidLogs || []).map(log => log.worker_name).filter(Boolean)
      )] as string[]

      if (workerNamesInLogs.length === 0) {
        // 미결제 작업일지에 작업자가 없으면 빈 목록
        setWorkers([])
        return
      }

      // 2. 해당 타입의 활성 작업자 중에서 작업일지에 있는 작업자만 필터링
      const { data: allWorkers, error: workersError } = await supabase
        .from('workers')
        .select('id, name, worker_type')
        .eq('worker_type', workerType)
        .eq('is_active', true)
        .in('name', workerNamesInLogs)
        .order('name')

      if (workersError) throw workersError

      setWorkers(allWorkers as Worker[] || [])
    } catch (error) {
      console.error('작업자 로드 오류:', error)
      setWorkers([])
    }
  }

  const loadUnpaidWorkLogs = async () => {
    if (!projectId) return

    const { data, error } = await supabase
      .from('work_logs')
      .select('id, work_date, work_category, work_subcategory, notes')
      .eq('project_id', projectId)
      .eq('payment_completed', false)
      .order('work_date', { ascending: false })

    if (!error && data) {
      setUnpaidWorkLogs(data as any)
    }
  }

  const handleLoadFromWorkLog = (log: UnpaidWorkLog) => {
    if (log.work_category) setWorkCategory(log.work_category)
    if (log.work_subcategory) setWorkSubcategory(log.work_subcategory)
    setShowUnpaidLogs(false)
    Alert.alert('불러오기 완료', '작업일지 정보를 불러왔습니다')
  }

  // 계좌 불러오기
  const handleLoadAccount = () => {
    navigation.navigate('계좌 선택', {
      onSelect: (selectedAccount: string) => {
        setAccountNumber(selectedAccount)
      }
    })
  }

  // 계좌 관리
  const handleManageAccounts = () => {
    navigation.navigate('계좌 관리')
  }

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('오류', '금액을 입력해주세요')
      return
    }

    const finalCategory = useCustomCategory ? customCategory : workCategory
    const finalSubcategory = useCustomSubcategory ? customSubcategory : workSubcategory

    setLoading(true)

    const submitData = {
      project_id: projectId,
      classification: classification,
      work_category: finalCategory || null,
      work_subcategory: finalSubcategory || null,
      amount: parseFloat(amount),
      vat_included: vatIncluded,
      account_number: accountNumber || null,
      status: 'pending', // 상태는 항상 대기로 고정
      notes: notes || null
    }

    try {
      if (editMode && expenseData?.id) {
        const { error } = await supabase
          .from('expense_approvals')
          .update(submitData)
          .eq('id', expenseData.id)

        if (error) throw error
        Alert.alert('성공', '지출결의서가 수정되었습니다', [
          { text: '확인', onPress: () => navigation.goBack() }
        ])
      } else {
        const { error } = await supabase
          .from('expense_approvals')
          .insert([submitData])

        if (error) throw error
        Alert.alert('성공', '지출결의서가 등록되었습니다', [
          { text: '확인', onPress: () => navigation.goBack() }
        ])
      }
    } catch (error: any) {
      console.error('Submit error:', error)
      Alert.alert('오류', error.message || '저장 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 직영/외주인 경우 부가세 포함 버튼 비활성화
  const isVatDisabled = classification === '직영' || classification === '외주'
  
  // 직영/외주인 경우 세부분류를 작업자 목록에서 선택
  const isWorkerTypeClassification = classification === '직영' || classification === '외주'

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView style={s.scrollView}>
        <Text style={s.title}>{editMode ? '지출결의서 수정' : '지출결의서 등록'}</Text>

        {/* 프로젝트 이름 표시 */}
        {projectName && (
          <View style={s.projectBadge}>
            <Text style={s.projectLabel}>프로젝트</Text>
            <Text style={s.projectName}>{projectName}</Text>
          </View>
        )}

        {/* 미결제 작업일지 불러오기 */}
        {!editMode && unpaidWorkLogs.length > 0 && (
          <View style={s.section}>
            <TouchableOpacity 
              style={s.unpaidButton}
              onPress={() => setShowUnpaidLogs(!showUnpaidLogs)}
            >
              <Text style={s.unpaidButtonText}>
                📋 미결제 작업일지 불러오기 ({unpaidWorkLogs.length}건)
              </Text>
            </TouchableOpacity>

            {showUnpaidLogs && (
              <View style={s.unpaidList}>
                {unpaidWorkLogs.map((log) => (
                  <TouchableOpacity
                    key={log.id}
                    style={s.unpaidItem}
                    onPress={() => handleLoadFromWorkLog(log)}
                  >
                    <Text style={s.unpaidDate}>{log.work_date}</Text>
                    {log.work_category && (
                      <Text style={s.unpaidCategory}>
                        {log.work_category}
                        {log.work_subcategory ? ` > ${log.work_subcategory}` : ''}
                      </Text>
                    )}
                    {log.notes && (
                      <Text style={s.unpaidNotes} numberOfLines={1}>{log.notes}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 분류 */}
        <Text style={s.label}>분류 *</Text>
        <View style={s.pickerContainer}>
          <RNPickerSelect
            value={classification}
            onValueChange={(v) => {
              setClassification(v)
              // 분류 변경 시 세부분류 초기화
              setWorkSubcategory('')
              setCustomSubcategory('')
            }}
            items={[
              { label: '시공', value: '시공' },
              { label: '자재', value: '자재' },
              { label: '직영', value: '직영' },
              { label: '외주', value: '외주' }
            ]}
            style={ps}
            useNativeAndroidPickerStyle={false}
          />
        </View>

        {/* 공정 (대분류) */}
        <Text style={s.label}>공정</Text>
        <View style={s.toggleRow}>
          <TouchableOpacity
            style={[s.toggleButton, !useCustomCategory && s.toggleButtonActive]}
            onPress={() => setUseCustomCategory(false)}
          >
            <Text style={[s.toggleText, !useCustomCategory && s.toggleTextActive]}>
              목록에서 선택
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.toggleButton, useCustomCategory && s.toggleButtonActive]}
            onPress={() => setUseCustomCategory(true)}
          >
            <Text style={[s.toggleText, useCustomCategory && s.toggleTextActive]}>
              직접 입력
            </Text>
          </TouchableOpacity>
        </View>

        {useCustomCategory ? (
          <TextInput
            style={s.input}
            value={customCategory}
            onChangeText={setCustomCategory}
            placeholder="공정 입력"
            placeholderTextColor="#999"
          />
        ) : (
          <View style={s.pickerContainer}>
            <RNPickerSelect
              value={workCategory}
              onValueChange={(v) => setWorkCategory(v)}
              items={workCategories.map(c => ({ label: c.category_name, value: c.category_name }))}
              style={ps}
              useNativeAndroidPickerStyle={false}
              placeholder={{ label: '공정 선택', value: '' }}
            />
          </View>
        )}

        {/* 작업자 선택 / 공정 세부분류 */}
        <Text style={s.label}>
          {isWorkerTypeClassification ? '작업자 선택' : '공정 세부분류'}
          {isWorkerTypeClassification && workers.length === 0 && (
            <Text style={s.warningNote}> (미결제 작업일지 없음)</Text>
          )}
        </Text>
        <View style={s.toggleRow}>
          <TouchableOpacity
            style={[s.toggleButton, !useCustomSubcategory && s.toggleButtonActive]}
            onPress={() => setUseCustomSubcategory(false)}
          >
            <Text style={[s.toggleText, !useCustomSubcategory && s.toggleTextActive]}>
              목록에서 선택
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.toggleButton, useCustomSubcategory && s.toggleButtonActive]}
            onPress={() => setUseCustomSubcategory(true)}
          >
            <Text style={[s.toggleText, useCustomSubcategory && s.toggleTextActive]}>
              직접 입력
            </Text>
          </TouchableOpacity>
        </View>

        {useCustomSubcategory ? (
          <TextInput
            style={s.input}
            value={customSubcategory}
            onChangeText={setCustomSubcategory}
            placeholder={isWorkerTypeClassification ? "작업자 이름 입력" : "세부분류 입력"}
            placeholderTextColor="#999"
          />
        ) : (
          <View style={s.pickerContainer}>
            <RNPickerSelect
              value={workSubcategory}
              onValueChange={(v) => setWorkSubcategory(v)}
              items={
                isWorkerTypeClassification
                  ? workers.map(w => ({ label: w.name, value: w.name }))
                  : subcategories.map(su => ({ label: su, value: su }))
              }
              style={ps}
              useNativeAndroidPickerStyle={false}
              placeholder={{ 
                label: isWorkerTypeClassification 
                  ? (workers.length === 0 ? '미결제 작업일지에 작업자 없음' : '작업자 선택')
                  : '세부분류 선택', 
                value: '' 
              }}
              disabled={!isWorkerTypeClassification && !workCategory && !useCustomCategory}
            />
          </View>
        )}

        {/* 금액 */}
        <Text style={s.label}>금액 (원) *</Text>
        <TextInput
          style={s.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="1000000"
          placeholderTextColor="#999"
          keyboardType="numeric"
        />

        {/* 부가세 포함 - 직영/외주일 경우 비활성화 */}
        <Text style={s.label}>
          부가세 {isVatDisabled && <Text style={s.disabledNote}>(직영/외주는 미포함 고정)</Text>}
        </Text>
        <View style={s.toggleRow}>
          <TouchableOpacity
            style={[
              s.toggleButton,
              vatIncluded && s.toggleButtonActive,
              isVatDisabled && s.toggleButtonDisabled
            ]}
            onPress={() => !isVatDisabled && setVatIncluded(true)}
            disabled={isVatDisabled}
          >
            <Text
              style={[
                s.toggleText,
                vatIncluded && s.toggleTextActive,
                isVatDisabled && s.toggleTextDisabled
              ]}
            >
              포함
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              s.toggleButton,
              !vatIncluded && s.toggleButtonActive,
              isVatDisabled && s.toggleButtonDisabled
            ]}
            onPress={() => !isVatDisabled && setVatIncluded(false)}
            disabled={isVatDisabled}
          >
            <Text
              style={[
                s.toggleText,
                !vatIncluded && s.toggleTextActive,
                isVatDisabled && s.toggleTextDisabled
              ]}
            >
              미포함
            </Text>
          </TouchableOpacity>
        </View>

        {/* 계좌번호 - 불러오기 & 관리 버튼 */}
        <View style={s.accountRow}>
          <Text style={s.label}>계좌번호</Text>
          <View style={s.accountButtons}>
            <TouchableOpacity style={s.accountActionButton} onPress={handleLoadAccount}>
              <Text style={s.accountActionText}>불러오기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.accountActionButton} onPress={handleManageAccounts}>
              <Text style={s.accountActionText}>관리</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TextInput
          style={s.input}
          value={accountNumber}
          onChangeText={setAccountNumber}
          placeholder="국민은행 110-123-456789 홍길동"
          placeholderTextColor="#999"
          keyboardType="default"
        />

        {/* 비고 */}
        <Text style={s.label}>비고</Text>
        <TextInput
          style={[s.input, s.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="추가 메모"
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
        />

        {/* 제출 버튼 */}
        <TouchableOpacity
          style={[s.submitButton, loading && s.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.submitButtonText}>
              {editMode ? '수정' : '등록'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollView: { flex: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 10, marginTop: 20, color: '#333' },

  // 프로젝트 배지
  projectBadge: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF'
  },
  projectLabel: { 
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
    marginRight: 8
  },
  projectName: { 
    fontSize: 15,
    color: '#007AFF',
    fontWeight: 'bold',
    flex: 1
  },

  section: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', marginTop: 15, marginBottom: 8, color: '#333' },
  disabledNote: { fontSize: 13, color: '#FF9500', fontWeight: 'normal' },
  warningNote: { fontSize: 13, color: '#FF3B30', fontWeight: 'normal' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, fontSize: 16 },
  textArea: { height: 80, textAlignVertical: 'top' },
  pickerContainer: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, overflow: 'hidden' },

  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  toggleButton: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, alignItems: 'center' },
  toggleButtonActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  toggleButtonDisabled: { backgroundColor: '#E0E0E0', borderColor: '#CCC' },
  toggleText: { fontSize: 14, color: '#666' },
  toggleTextActive: { color: '#fff', fontWeight: '600' },
  toggleTextDisabled: { color: '#999' },

  // 계좌 관련
  accountRow: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 8
  },
  accountButtons: { 
    flexDirection: 'row',
    gap: 8
  },
  accountActionButton: { 
    backgroundColor: '#007AFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6
  },
  accountActionText: { 
    color: '#fff',
    fontSize: 13,
    fontWeight: '600'
  },

  // 미결제 작업일지
  unpaidButton: { backgroundColor: '#FF9500', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  unpaidButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  unpaidList: { backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden' },
  unpaidItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  unpaidDate: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4 },
  unpaidCategory: { fontSize: 13, color: '#666', marginBottom: 2 },
  unpaidNotes: { fontSize: 12, color: '#999' },

  submitButton: { backgroundColor: '#007AFF', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  submitButtonDisabled: { backgroundColor: '#999' },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
})

const ps = StyleSheet.create({
  inputIOS: { fontSize: 16, paddingVertical: 12, paddingHorizontal: 12, color: '#333' },
  inputAndroid: { fontSize: 16, paddingHorizontal: 12, paddingVertical: 8, color: '#333' },
  inputWeb: { fontSize: 16, paddingVertical: 12, paddingHorizontal: 12, color: '#333' }
})

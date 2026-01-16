import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import RNPickerSelect from 'react-native-picker-select'
import { supabase } from '../lib/supabase'

type Project = { id: string; project_name: string }
type TaxInvoice = {
  id: string
  project_id: string | null
  invoice_number: string
  invoice_date: string
  invoice_type: string
  supplier_name: string
  supplier_tax_id: string | null
  recipient_name: string | null
  amount: number
  tax_amount: number
  total_amount: number
  status: string
  volta_invoice_id: string | null
}

export default function TaxInvoiceScreen({ navigation }: any) {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [invoices, setInvoices] = useState<TaxInvoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<TaxInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<TaxInvoice | null>(null)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [modalProjectId, setModalProjectId] = useState<string>('')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData()
    })
    return unsubscribe
  }, [navigation])

  useEffect(() => {
    filterInvoices()
  }, [selectedProject, invoices])

  const loadData = async () => {
    setLoading(true)
    await Promise.all([loadProjects(), loadInvoices()])
    setLoading(false)
  }

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, project_name')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setProjects(data)
    }
  }

  const loadInvoices = async () => {
    const { data, error } = await supabase
      .from('tax_invoices')
      .select('*')
      .order('invoice_date', { ascending: false })

    if (!error && data) {
      setInvoices(data)
    }
  }

  const filterInvoices = () => {
    if (selectedProject === 'all') {
      setFilteredInvoices(invoices)
    } else if (selectedProject === 'unassigned') {
      setFilteredInvoices(invoices.filter(inv => !inv.project_id))
    } else {
      setFilteredInvoices(invoices.filter(inv => inv.project_id === selectedProject))
    }
  }

  const handleSyncInvoices = async () => {
    setSyncing(true)
    try {
      // Supabase Edge Function 호출
      const { data, error } = await supabase.functions.invoke('sync-tax-invoices', {
        body: { companyId: 'your-company-id' }
      })

      if (error) throw error

      Alert.alert('동기화 완료', `${data.newCount}건의 새로운 세금계산서가 추가되었습니다.`)
      loadInvoices()
    } catch (error: any) {
      console.error('Sync error:', error)
      Alert.alert('동기화 실패', error.message || '세금계산서를 가져오는 중 오류가 발생했습니다.')
    } finally {
      setSyncing(false)
    }
  }

  const handleInvoicePress = (invoice: TaxInvoice) => {
    setSelectedInvoice(invoice)
    setModalProjectId(invoice.project_id || '')
    setShowProjectModal(true)
  }

  const handleAssignProject = async () => {
    if (!selectedInvoice) return

    try {
      const { error } = await supabase
        .from('tax_invoices')
        .update({ project_id: modalProjectId || null })
        .eq('id', selectedInvoice.id)

      if (error) throw error

      Alert.alert('성공', '프로젝트가 연결되었습니다.')
      setShowProjectModal(false)
      loadInvoices()
    } catch (error: any) {
      console.error('Assign project error:', error)
      Alert.alert('오류', '프로젝트 연결에 실패했습니다.')
    }
  }

  const formatCurrency = (amount: number) => '₩' + amount.toLocaleString('ko-KR')
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR')
  }

  const getStatusText = (status: string) => {
    const map: any = { pending: '대기', received: '수령', paid: '완료' }
    return map[status] || status
  }

  const getStatusColor = (status: string) => {
    const map: any = { pending: '#FF9500', received: '#007AFF', paid: '#34C759' }
    return map[status] || '#999'
  }

  const getInvoiceTypeText = (type: string) => {
    return type === 'sales' ? '매출' : '매입'
  }

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
        <Text style={s.title}>세금계산서</Text>
        <TouchableOpacity
          style={[s.syncButton, syncing && s.syncButtonDisabled]}
          onPress={handleSyncInvoices}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={s.syncButtonText}>가져오기</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 프로젝트 필터 */}
      <View style={s.filterContainer}>
        <Text style={s.filterLabel}>프로젝트:</Text>
        <View style={s.pickerWrapper}>
          <RNPickerSelect
            value={selectedProject}
            onValueChange={(value) => setSelectedProject(value)}
            items={[
              { label: '전체', value: 'all' },
              { label: '미배정', value: 'unassigned' },
              ...projects.map(p => ({ label: p.project_name, value: p.id }))
            ]}
            style={pickerStyles}
            useNativeAndroidPickerStyle={false}
          />
        </View>
      </View>

      {/* 세금계산서 목록 */}
      <ScrollView style={s.listContainer} contentContainerStyle={{ paddingBottom: 80 }}>
        {filteredInvoices.length === 0 ? (
          <View style={s.emptyContainer}>
            <Text style={s.emptyText}>
              {selectedProject === 'unassigned'
                ? '미배정 세금계산서가 없습니다'
                : '세금계산서가 없습니다'}
            </Text>
            <Text style={s.emptySubText}>가져오기 버튼을 눌러 세금계산서를 동기화하세요</Text>
          </View>
        ) : (
          filteredInvoices.map((invoice) => {
            const project = projects.find(p => p.id === invoice.project_id)

            return (
              <TouchableOpacity
                key={invoice.id}
                style={s.card}
                onPress={() => handleInvoicePress(invoice)}
              >
                <View style={s.cardHeader}>
                  <View style={s.headerLeft}>
                    <View style={s.invoiceTypeBadge}>
                      <Text style={s.invoiceTypeText}>
                        {getInvoiceTypeText(invoice.invoice_type)}
                      </Text>
                    </View>
                    <Text style={s.invoiceNumber}>{invoice.invoice_number}</Text>
                  </View>
                  <View
                    style={[
                      s.statusBadge,
                      { backgroundColor: getStatusColor(invoice.status) }
                    ]}
                  >
                    <Text style={s.statusText}>{getStatusText(invoice.status)}</Text>
                  </View>
                </View>

                <View style={s.cardContent}>
                  <View style={s.infoRow}>
                    <Text style={s.label}>발행일:</Text>
                    <Text style={s.value}>{formatDate(invoice.invoice_date)}</Text>
                  </View>

                  <View style={s.infoRow}>
                    <Text style={s.label}>공급자:</Text>
                    <Text style={s.value}>{invoice.supplier_name}</Text>
                  </View>

                  {invoice.recipient_name && (
                    <View style={s.infoRow}>
                      <Text style={s.label}>공급받는자:</Text>
                      <Text style={s.value}>{invoice.recipient_name}</Text>
                    </View>
                  )}

                  <View style={s.divider} />

                  <View style={s.amountContainer}>
                    <View style={s.amountRow}>
                      <Text style={s.amountLabel}>공급가액</Text>
                      <Text style={s.amountValue}>{formatCurrency(invoice.amount)}</Text>
                    </View>
                    <View style={s.amountRow}>
                      <Text style={s.amountLabel}>세액</Text>
                      <Text style={s.amountValue}>{formatCurrency(invoice.tax_amount)}</Text>
                    </View>
                    <View style={[s.amountRow, s.totalRow]}>
                      <Text style={s.totalLabel}>합계</Text>
                      <Text style={s.totalValue}>{formatCurrency(invoice.total_amount)}</Text>
                    </View>
                  </View>

                  {project && (
                    <View style={s.projectBadge}>
                      <Text style={s.projectBadgeText}>📁 {project.project_name}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )
          })
        )}
      </ScrollView>

      {/* 프로젝트 배정 모달 */}
      <Modal
        visible={showProjectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProjectModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>프로젝트 연결</Text>

            {selectedInvoice && (
              <View style={s.modalInvoiceInfo}>
                <Text style={s.modalInvoiceNumber}>{selectedInvoice.invoice_number}</Text>
                <Text style={s.modalInvoiceSupplier}>{selectedInvoice.supplier_name}</Text>
                <Text style={s.modalInvoiceAmount}>
                  {formatCurrency(selectedInvoice.total_amount)}
                </Text>
              </View>
            )}

            <View style={s.modalPickerContainer}>
              <Text style={s.modalLabel}>프로젝트 선택:</Text>
              <View style={s.modalPickerWrapper}>
                <RNPickerSelect
                  value={modalProjectId}
                  onValueChange={(value) => setModalProjectId(value)}
                  items={[
                    { label: '프로젝트 없음', value: '' },
                    ...projects.map(p => ({ label: p.project_name, value: p.id }))
                  ]}
                  style={pickerStyles}
                  useNativeAndroidPickerStyle={false}
                  placeholder={{ label: '프로젝트 선택', value: '' }}
                />
              </View>
            </View>

            <View style={s.modalButtons}>
              <TouchableOpacity
                style={[s.modalButton, s.modalCancelButton]}
                onPress={() => setShowProjectModal(false)}
              >
                <Text style={s.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalButton, s.modalConfirmButton]}
                onPress={handleAssignProject}
              >
                <Text style={s.modalConfirmText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  syncButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center'
  },
  syncButtonDisabled: { backgroundColor: '#999' },
  syncButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  filterContainer: {
    backgroundColor: '#fff',
    padding: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center'
  },
  filterLabel: { fontSize: 16, fontWeight: '600', color: '#333', marginRight: 10 },
  pickerWrapper: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 8, overflow: 'hidden' },
  listContainer: { flex: 1, padding: 20 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#999', marginBottom: 8 },
  emptySubText: { fontSize: 14, color: '#bbb' },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, elevation: 2 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  invoiceTypeBadge: {
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8
  },
  invoiceTypeText: { fontSize: 11, color: '#007AFF', fontWeight: 'bold' },
  invoiceNumber: { fontSize: 15, fontWeight: '600', color: '#333', flex: 1 },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  statusText: { fontSize: 11, color: '#fff', fontWeight: 'bold' },
  cardContent: { padding: 16 },
  infoRow: { flexDirection: 'row', marginBottom: 8 },
  label: { fontSize: 14, color: '#666', width: 90 },
  value: { fontSize: 14, color: '#333', flex: 1, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },
  amountContainer: { backgroundColor: '#f9f9f9', padding: 12, borderRadius: 8 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  amountLabel: { fontSize: 13, color: '#666' },
  amountValue: { fontSize: 13, color: '#333', fontWeight: '500' },
  totalRow: { marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  totalLabel: { fontSize: 15, color: '#333', fontWeight: 'bold' },
  totalValue: { fontSize: 15, color: '#007AFF', fontWeight: 'bold' },
  projectBadge: {
    marginTop: 12,
    backgroundColor: '#E8F4FD',
    padding: 8,
    borderRadius: 6
  },
  projectBadgeText: { fontSize: 13, color: '#007AFF', fontWeight: '500' },

  // 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  modalInvoiceInfo: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16
  },
  modalInvoiceNumber: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4 },
  modalInvoiceSupplier: { fontSize: 13, color: '#666', marginBottom: 4 },
  modalInvoiceAmount: { fontSize: 16, fontWeight: 'bold', color: '#007AFF' },
  modalPickerContainer: { marginBottom: 20 },
  modalLabel: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 8 },
  modalPickerWrapper: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden'
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
  modalCancelButton: { backgroundColor: '#f0f0f0' },
  modalConfirmButton: { backgroundColor: '#007AFF' },
  modalCancelText: { fontSize: 16, fontWeight: '600', color: '#666' },
  modalConfirmText: { fontSize: 16, fontWeight: '600', color: '#fff' }
})

const pickerStyles = StyleSheet.create({
  inputIOS: { fontSize: 15, paddingVertical: 10, paddingHorizontal: 12, color: '#333' },
  inputAndroid: { fontSize: 15, paddingVertical: 8, paddingHorizontal: 12, color: '#333' },
  inputWeb: { fontSize: 15, paddingVertical: 10, paddingHorizontal: 12, color: '#333' }
})

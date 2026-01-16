import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'

type AccountItem = {
  id: string
  company_name: string
  account_number: string
  bank_name: string | null
  account_holder: string | null
  business_type: string | null
  contact_phone: string | null
  notes: string | null
}

export default function SubcontractorAccountManagementScreen({ navigation }: any) {
  const [accounts, setAccounts] = useState<AccountItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // 입력 필드
  const [companyName, setCompanyName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('subcontractor_accounts')
      .select('*')
      .order('company_name')

    if (error) {
      Alert.alert('오류', '계좌 정보를 불러올 수 없습니다')
    } else {
      setAccounts(data || [])
    }
    setLoading(false)
  }

  const resetForm = () => {
    setCompanyName('')
    setAccountNumber('')
    setBankName('')
    setAccountHolder('')
    setBusinessType('')
    setContactPhone('')
    setNotes('')
    setEditingId(null)
  }

  const handleEdit = (account: AccountItem) => {
    setCompanyName(account.company_name)
    setAccountNumber(account.account_number)
    setBankName(account.bank_name || '')
    setAccountHolder(account.account_holder || '')
    setBusinessType(account.business_type || '')
    setContactPhone(account.contact_phone || '')
    setNotes(account.notes || '')
    setEditingId(account.id)
  }

  const handleSave = async () => {
    if (!companyName || !accountNumber) {
      Alert.alert('오류', '업체명과 계좌번호는 필수입니다')
      return
    }

    const data = {
      company_name: companyName,
      account_number: accountNumber,
      bank_name: bankName || null,
      account_holder: accountHolder || null,
      business_type: businessType || null,
      contact_phone: contactPhone || null,
      notes: notes || null
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('subcontractor_accounts')
          .update(data)
          .eq('id', editingId)

        if (error) throw error
        Alert.alert('성공', '수정되었습니다')
      } else {
        const { error } = await supabase
          .from('subcontractor_accounts')
          .insert([data])

        if (error) throw error
        Alert.alert('성공', '등록되었습니다')
      }
      resetForm()
      loadAccounts()
    } catch (error: any) {
      Alert.alert('오류', error.message)
    }
  }

  const handleDelete = (id: string) => {
    Alert.alert(
      '삭제 확인',
      '정말 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('subcontractor_accounts')
              .delete()
              .eq('id', id)

            if (error) {
              Alert.alert('오류', '삭제 실패')
            } else {
              Alert.alert('성공', '삭제되었습니다')
              loadAccounts()
            }
          }
        }
      ]
    )
  }

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    )
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>계좌 관리</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.closeButton}>닫기</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.content}>
        {/* 입력 폼 */}
        <View style={s.formSection}>
          <Text style={s.sectionTitle}>{editingId ? '계좌 수정' : '계좌 등록'}</Text>
          
          <Text style={s.label}>업체명 *</Text>
          <TextInput
            style={s.input}
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="업체명 입력"
            placeholderTextColor="#999"
          />

          <Text style={s.label}>계좌번호 *</Text>
          <TextInput
            style={s.input}
            value={accountNumber}
            onChangeText={setAccountNumber}
            placeholder="110-123-456789"
            placeholderTextColor="#999"
            keyboardType="default"
          />

          <Text style={s.label}>은행명</Text>
          <TextInput
            style={s.input}
            value={bankName}
            onChangeText={setBankName}
            placeholder="국민은행"
            placeholderTextColor="#999"
          />

          <Text style={s.label}>예금주</Text>
          <TextInput
            style={s.input}
            value={accountHolder}
            onChangeText={setAccountHolder}
            placeholder="홍길동"
            placeholderTextColor="#999"
          />

          <Text style={s.label}>공정</Text>
          <TextInput
            style={s.input}
            value={businessType}
            onChangeText={setBusinessType}
            placeholder="철근, 목공, 타일 등"
            placeholderTextColor="#999"
          />

          <Text style={s.label}>연락처</Text>
          <TextInput
            style={s.input}
            value={contactPhone}
            onChangeText={setContactPhone}
            placeholder="010-1234-5678"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />

          <Text style={s.label}>비고</Text>
          <TextInput
            style={[s.input, s.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="추가 메모"
            placeholderTextColor="#999"
            multiline
            numberOfLines={2}
          />

          <View style={s.buttonRow}>
            {editingId && (
              <TouchableOpacity style={s.cancelButton} onPress={resetForm}>
                <Text style={s.cancelButtonText}>취소</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[s.saveButton, editingId && { flex: 1 }]} 
              onPress={handleSave}
            >
              <Text style={s.saveButtonText}>{editingId ? '수정' : '등록'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 계좌 목록 */}
        <View style={s.listSection}>
          <Text style={s.sectionTitle}>등록된 계좌 ({accounts.length})</Text>
          
          {accounts.length === 0 ? (
            <View style={s.emptyContainer}>
              <Text style={s.emptyText}>등록된 계좌가 없습니다</Text>
            </View>
          ) : (
            accounts.map((account) => (
              <View key={account.id} style={s.accountCard}>
                <View style={s.accountHeader}>
                  <Text style={s.companyName}>{account.company_name}</Text>
                  {account.business_type && (
                    <View style={s.typeBadge}>
                      <Text style={s.typeText}>{account.business_type}</Text>
                    </View>
                  )}
                </View>
                
                <Text style={s.accountNumber}>
                  {account.bank_name && `${account.bank_name} `}
                  {account.account_number}
                  {account.account_holder && ` (${account.account_holder})`}
                </Text>
                
                {account.contact_phone && (
                  <Text style={s.accountDetail}>📞 {account.contact_phone}</Text>
                )}
                
                {account.notes && (
                  <Text style={s.accountNotes}>{account.notes}</Text>
                )}

                <View style={s.accountActions}>
                  <TouchableOpacity 
                    style={s.editButton}
                    onPress={() => handleEdit(account)}
                  >
                    <Text style={s.editButtonText}>수정</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={s.deleteButton}
                    onPress={() => handleDelete(account.id)}
                  >
                    <Text style={s.deleteButtonText}>삭제</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  closeButton: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  content: { flex: 1 },
  formSection: { backgroundColor: '#fff', padding: 20, marginBottom: 10 },
  listSection: { backgroundColor: '#fff', padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 6, color: '#333' },
  input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, fontSize: 15 },
  textArea: { height: 60, textAlignVertical: 'top' },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  saveButton: { backgroundColor: '#007AFF', padding: 14, borderRadius: 8, alignItems: 'center', flex: 1 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { backgroundColor: '#999', padding: 14, borderRadius: 8, alignItems: 'center', flex: 1 },
  cancelButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#999' },
  accountCard: { backgroundColor: '#f9f9f9', padding: 16, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  accountHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  companyName: { fontSize: 17, fontWeight: 'bold', color: '#333', flex: 1 },
  typeBadge: { backgroundColor: '#007AFF', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  typeText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  accountNumber: { fontSize: 15, color: '#333', marginBottom: 6, fontWeight: '600' },
  accountDetail: { fontSize: 13, color: '#666', marginBottom: 4 },
  accountNotes: { fontSize: 12, color: '#999', marginTop: 6, fontStyle: 'italic' },
  accountActions: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#ddd' },
  editButton: { flex: 1, backgroundColor: '#007AFF', padding: 10, borderRadius: 6, alignItems: 'center' },
  editButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  deleteButton: { flex: 1, backgroundColor: '#FF3B30', padding: 10, borderRadius: 6, alignItems: 'center' },
  deleteButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' }
})

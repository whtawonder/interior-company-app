import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'

type AccountItem = {
  id: string
  company_name: string
  account_number: string
  bank_name: string | null
  account_holder: string | null
  business_type: string | null
}

export default function AccountSelectionModal({ route, navigation }: any) {
  const { onSelect } = route.params || {}
  const [accounts, setAccounts] = useState<AccountItem[]>([])
  const [filteredAccounts, setFilteredAccounts] = useState<AccountItem[]>([])
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    if (searchText) {
      const filtered = accounts.filter(account =>
        account.company_name.toLowerCase().includes(searchText.toLowerCase()) ||
        account.account_number.includes(searchText) ||
        (account.account_holder && account.account_holder.toLowerCase().includes(searchText.toLowerCase()))
      )
      setFilteredAccounts(filtered)
    } else {
      setFilteredAccounts(accounts)
    }
  }, [searchText, accounts])

  const loadAccounts = async () => {
    const { data, error } = await supabase
      .from('subcontractor_accounts')
      .select('*')
      .order('company_name')

    if (!error && data) {
      setAccounts(data)
      setFilteredAccounts(data)
    }
    setLoading(false)
  }

  const handleSelect = (account: AccountItem) => {
    if (onSelect) {
      // 은행명 계좌번호 예금주 형식으로 전달
      const formattedAccount = `${account.bank_name || ''} ${account.account_number} ${account.account_holder || ''}`.trim()
      onSelect(formattedAccount)
    }
    navigation.goBack()
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>계좌 선택</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.closeButton}>닫기</Text>
        </TouchableOpacity>
      </View>

      <View style={s.searchContainer}>
        <TextInput
          style={s.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="업체명, 예금주, 계좌번호 검색"
          placeholderTextColor="#999"
        />
      </View>

      {loading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <ScrollView style={s.listContainer}>
          {filteredAccounts.length === 0 ? (
            <View style={s.emptyContainer}>
              <Text style={s.emptyText}>
                {searchText ? '검색 결과가 없습니다' : '등록된 계좌가 없습니다'}
              </Text>
            </View>
          ) : (
            filteredAccounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={s.accountItem}
                onPress={() => handleSelect(account)}
              >
                <View style={s.accountInfo}>
                  <View style={s.accountRow}>
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
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  closeButton: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  searchContainer: { backgroundColor: '#fff', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchInput: { backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8, fontSize: 15 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { flex: 1 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#999' },
  accountItem: { backgroundColor: '#fff', padding: 16, marginHorizontal: 15, marginTop: 10, borderRadius: 10, elevation: 1 },
  accountInfo: { flex: 1 },
  accountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  companyName: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1 },
  typeBadge: { backgroundColor: '#007AFF', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10 },
  typeText: { fontSize: 10, color: '#fff', fontWeight: '600' },
  accountNumber: { fontSize: 15, color: '#333', fontWeight: '600' }
})

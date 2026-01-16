import React from 'react';
import { Text, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

// 기존 화면들
import ProjectManagementScreen from './screens/ProjectManagementScreen';
import ProjectFormScreen from './screens/ProjectFormScreen';
import WorkLogScreen from './screens/WorkLogScreen';
import WorkLogListScreen from './screens/WorkLogListScreen';

// 새로 추가된 현장일지 화면들
import SiteDiaryListScreen from './screens/SiteDiaryListScreen';
import SiteDiaryFormScreen from './screens/SiteDiaryFormScreen';
import SiteDiaryDetailScreen from './screens/SiteDiaryDetailScreen';

// 지출결의서 화면들 추가 (기존 import에 추가)
import ExpenseApprovalListScreen from './screens/ExpenseApprovalListScreen';
import ExpenseApprovalFormScreen from './screens/ExpenseApprovalFormScreen';
import SubcontractorAccountManagementScreen from './screens/SubcontractorAccountManagementScreen';
import AccountSelectionModal from './screens/AccountSelectionModal';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// 프로젝트 관리 스택
function ProjectStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProjectManagement"
        component={ProjectManagementScreen}
        //options={{ title: '프로젝트 관리2' }}//
      />
      <Stack.Screen
        name="프로젝트 입력"
        component={ProjectFormScreen}
        //options={{ title: '프로젝트 입력' }}//
      />
    </Stack.Navigator>
  );
}

// 작업일지 입력 스택
function WorkLogStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="작업일지 입력"
        component={WorkLogScreen}
        options={{ title: '작업일지 입력' }}
      />
    </Stack.Navigator>
  );
}

// 작업일지 목록 스택 (수정 화면 추가)
function WorkLogListStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="WorkLogList"
        component={WorkLogListScreen}
        options={{ title: '작업일지 목록' }}
      />
      <Stack.Screen
        name="작업일지 입력"
        component={WorkLogScreen}
        options={{ title: '작업일지 수정' }}
      />
    </Stack.Navigator>
  );
}

// 현장일지 스택
function SiteDiaryStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="SiteDiaryList"
        component={SiteDiaryListScreen}
        options={{ title: '현장일지' }}
      />
      <Stack.Screen
        name="SiteDiaryForm"
        component={SiteDiaryFormScreen}
        options={{ title: '사진 추가' }}
      />
      <Stack.Screen
        name="SiteDiaryDetail"
        component={SiteDiaryDetailScreen}
        options={{ title: '사진 상세' }}
      />
    </Stack.Navigator>
  );
}

// 지출결의서 스택 수정
function ExpenseApprovalStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="지출결의서"
        component={ExpenseApprovalListScreen}
        options={{ title: '지출결의서' }}
      />
      <Stack.Screen
        name="지출결의서 입력"
        component={ExpenseApprovalFormScreen}
        options={{ title: '지출결의서 입력' }}
      />
      <Stack.Screen
        name="계좌 관리"
        component={SubcontractorAccountManagementScreen}
        options={{ title: '계좌 관리' }}
      />
      <Stack.Screen
        name="계좌 선택"
        component={AccountSelectionModal}
        options={{ title: '계좌 선택', presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

// SafeArea를 고려한 Tab Navigator
function MainTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          backgroundColor: '#FFFFFF',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      {/* 1. 프로젝트 관리 */}
      <Tab.Screen
        name="ProjectTab"
        component={ProjectStack}
        options={{
          tabBarLabel: '프로젝트',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24 }}>🏗️</Text>
          ),
        }}
      />

      {/* 2. 작업일지 입력 */}
      <Tab.Screen
        name="WorkLogTab"
        component={WorkLogStack}
        options={{
          tabBarLabel: '작업일지입력',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24 }}>✍️</Text>
          ),
        }}
      />

      {/* 3. 작업일지 목록 */}
      <Tab.Screen
        name="WorkLogListTab"
        component={WorkLogListStack}
        options={{
          tabBarLabel: '작업일지목록',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24 }}>📋</Text>
          ),
        }}
      />

      {/* 4. 현장일지 */}
      <Tab.Screen
        name="SiteDiaryTab"
        component={SiteDiaryStack}
        options={{
          tabBarLabel: '현장일지',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24 }}>📷</Text>
          ),
        }}
      />

      {/* 5. 지출결의서 (새로 추가) */}
      <Tab.Screen
        name="ExpenseApprovalTab"
        component={ExpenseApprovalStack}
        options={{
          tabBarLabel: '지출결의서',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24 }}>💰</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <MainTabNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

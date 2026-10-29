import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ManagerRole } from '../../types';
import { FICTextInput } from '../../components/ui/FICTextInput';
import { FICButton } from '../../components/ui/FICButton';

import { ENV } from '../../constants/env';
import { apiClient } from '../../services/api/ApiClient';

export interface RegisterScreenProps {
  onBackToLogin: () => void;
  onRegisterSuccess?: () => void;
}

interface TerritoryOption {
  id: string;
  name: string;
}

const ROLES = [
  { label: 'State Manager (L1)', value: ManagerRole.STATE_MANAGER },
  { label: 'District Manager (L2)', value: ManagerRole.DISTRICT_MANAGER },
  { label: 'Division Manager (L3)', value: ManagerRole.DIVISION_MANAGER },
  { label: 'Pincode Manager (L4)', value: ManagerRole.PINCODE_MANAGER },
];

const STATES: TerritoryOption[] = [
  { id: 'st-tn-01', name: 'Tamil Nadu' },
  { id: 'st-mh-01', name: 'Maharashtra' },
  { id: 'st-ka-01', name: 'Karnataka' },
  { id: 'st-kl-01', name: 'Kerala' },
  { id: 'st-ap-01', name: 'Andhra Pradesh' },
  { id: 'st-ts-01', name: 'Telangana' },
  { id: 'st-gj-01', name: 'Gujarat' },
  { id: 'st-up-01', name: 'Uttar Pradesh' },
  { id: 'st-mp-01', name: 'Madhya Pradesh' },
  { id: 'st-rj-01', name: 'Rajasthan' },
  { id: 'st-wb-01', name: 'West Bengal' },
  { id: 'st-dl-01', name: 'Delhi (NCT)' },
  { id: 'st-pb-01', name: 'Punjab' },
  { id: 'st-hr-01', name: 'Haryana' },
  { id: 'st-br-01', name: 'Bihar' },
  { id: 'st-od-01', name: 'Odisha' },
  { id: 'st-as-01', name: 'Assam' },
  { id: 'st-jh-01', name: 'Jharkhand' },
  { id: 'st-cg-01', name: 'Chhattisgarh' },
  { id: 'st-uk-01', name: 'Uttarakhand' },
  { id: 'st-hp-01', name: 'Himachal Pradesh' },
  { id: 'st-jk-01', name: 'Jammu & Kashmir' },
  { id: 'st-goa-01', name: 'Goa' },
  { id: 'st-py-01', name: 'Puducherry' },
  { id: 'st-ch-01', name: 'Chandigarh' },
  { id: 'st-tr-01', name: 'Tripura' },
  { id: 'st-ml-01', name: 'Meghalaya' },
  { id: 'st-mn-01', name: 'Manipur' },
  { id: 'st-nl-01', name: 'Nagaland' },
  { id: 'st-mz-01', name: 'Mizoram' },
  { id: 'st-ar-01', name: 'Arunachal Pradesh' },
  { id: 'st-sk-01', name: 'Sikkim' },
  { id: 'st-ld-01', name: 'Ladakh' },
  { id: 'st-an-01', name: 'Andaman & Nicobar Islands' },
  { id: 'st-dh-01', name: 'Dadra & Nagar Haveli and Daman & Diu' },
];

const DISTRICTS_MAP: Record<string, TerritoryOption[]> = {
  'st-tn-01': [
    { id: 'dt-chn-01', name: 'Chennai' },
    { id: 'dt-cbe-01', name: 'Coimbatore' },
    { id: 'dt-dharm-01', name: 'Dharmapuri' },
    { id: 'dt-salem-01', name: 'Salem' },
    { id: 'dt-mdu-01', name: 'Madurai' },
    { id: 'dt-trichy-01', name: 'Tiruchirappalli' },
    { id: 'dt-tpr-01', name: 'Tiruppur' },
    { id: 'dt-erode-01', name: 'Erode' },
    { id: 'dt-vellore-01', name: 'Vellore' },
    { id: 'dt-tvl-01', name: 'Tirunelveli' },
    { id: 'dt-kanch-01', name: 'Kanchipuram' },
    { id: 'dt-thanj-01', name: 'Thanjavur' },
    { id: 'dt-dgl-01', name: 'Dindigul' },
    { id: 'dt-cudd-01', name: 'Cuddalore' },
    { id: 'dt-karur-01', name: 'Karur' },
    { id: 'dt-nam-01', name: 'Namakkal' },
    { id: 'dt-krish-01', name: 'Krishnagiri' },
    { id: 'dt-theni-01', name: 'Theni' },
    { id: 'dt-vnr-01', name: 'Virudhunagar' },
    { id: 'dt-tut-01', name: 'Thoothukudi' },
    { id: 'dt-ram-01', name: 'Ramanathapuram' },
    { id: 'dt-svg-01', name: 'Sivaganga' },
    { id: 'dt-pdk-01', name: 'Pudukkottai' },
    { id: 'dt-ngt-01', name: 'Nagapattinam' },
    { id: 'dt-tvr-01', name: 'Tiruvarur' },
    { id: 'dt-may-01', name: 'Mayiladuthurai' },
    { id: 'dt-ari-01', name: 'Ariyalur' },
    { id: 'dt-per-01', name: 'Perambalur' },
    { id: 'dt-tvm-01', name: 'Tiruvannamalai' },
    { id: 'dt-kkl-01', name: 'Kallakurichi' },
    { id: 'dt-vpm-01', name: 'Villupuram' },
    { id: 'dt-rpt-01', name: 'Ranipet' },
    { id: 'dt-tpt-01', name: 'Tirupattur' },
    { id: 'dt-cgp-01', name: 'Chengalpattu' },
    { id: 'dt-ten-01', name: 'Tenkasi' },
    { id: 'dt-tvr2-01', name: 'Tiruvallur' },
    { id: 'dt-kk-01', name: 'Kanyakumari' },
    { id: 'dt-nil-01', name: 'Nilgiris' },
  ],
  'st-mh-01': [
    { id: 'dt-mumbai-01', name: 'Mumbai City' },
    { id: 'dt-mumbai-sub-01', name: 'Mumbai Suburban' },
    { id: 'dt-pune-01', name: 'Pune' },
    { id: 'dt-nagpur-01', name: 'Nagpur' },
    { id: 'dt-thane-01', name: 'Thane' },
    { id: 'dt-nashik-01', name: 'Nashik' },
    { id: 'dt-aurangabad-01', name: 'Chhatrapati Sambhajinagar' },
    { id: 'dt-solapur-01', name: 'Solapur' },
    { id: 'dt-amravati-01', name: 'Amravati' },
    { id: 'dt-kolhapur-01', name: 'Kolhapur' },
    { id: 'dt-sangli-01', name: 'Sangli' },
    { id: 'dt-satara-01', name: 'Satara' },
    { id: 'dt-nanded-01', name: 'Nanded' },
    { id: 'dt-jalgaon-01', name: 'Jalgaon' },
  ],
  'st-ka-01': [
    { id: 'dt-blr-01', name: 'Bengaluru Urban' },
    { id: 'dt-mys-01', name: 'Mysuru' },
    { id: 'dt-mang-01', name: 'Mangaluru' },
    { id: 'dt-belagavi-01', name: 'Belagavi' },
    { id: 'dt-hubli-01', name: 'Hubballi-Dharwad' },
    { id: 'dt-kalab-01', name: 'Kalaburagi' },
    { id: 'dt-ballari-01', name: 'Ballari' },
    { id: 'dt-vijaya-01', name: 'Vijayapura' },
    { id: 'dt-shivam-01', name: 'Shivamogga' },
    { id: 'dt-tumakuru-01', name: 'Tumakuru' },
    { id: 'dt-udupi-01', name: 'Udupi' },
    { id: 'dt-hassan-01', name: 'Hassan' },
  ],
  'st-kl-01': [
    { id: 'dt-tvm-kl', name: 'Thiruvananthapuram' },
    { id: 'dt-kochi-kl', name: 'Ernakulam (Kochi)' },
    { id: 'dt-kozh-kl', name: 'Kozhikode' },
    { id: 'dt-thrissur-kl', name: 'Thrissur' },
    { id: 'dt-kollam-kl', name: 'Kollam' },
    { id: 'dt-palakkad-kl', name: 'Palakkad' },
    { id: 'dt-malappuram-kl', name: 'Malappuram' },
    { id: 'dt-kannur-kl', name: 'Kannur' },
    { id: 'dt-kottayam-kl', name: 'Kottayam' },
    { id: 'dt-alappuzha-kl', name: 'Alappuzha' },
  ],
  'st-ap-01': [
    { id: 'dt-vizag-ap', name: 'Visakhapatnam' },
    { id: 'dt-vjw-ap', name: 'Vijayawada (NTR)' },
    { id: 'dt-guntur-ap', name: 'Guntur' },
    { id: 'dt-tirupati-ap', name: 'Tirupati' },
    { id: 'dt-kurnool-ap', name: 'Kurnool' },
    { id: 'dt-nellore-ap', name: 'Nellore' },
    { id: 'dt-kakinada-ap', name: 'Kakinada' },
  ],
  'st-ts-01': [
    { id: 'dt-hyd-ts', name: 'Hyderabad' },
    { id: 'dt-warangal-ts', name: 'Warangal' },
    { id: 'dt-rangareddy-ts', name: 'Rangareddy' },
    { id: 'dt-medchal-ts', name: 'Medchal-Malkajgiri' },
    { id: 'dt-karimnagar-ts', name: 'Karimnagar' },
    { id: 'dt-nizamabad-ts', name: 'Nizamabad' },
  ],
  'st-gj-01': [
    { id: 'dt-ahmedabad-gj', name: 'Ahmedabad' },
    { id: 'dt-surat-gj', name: 'Surat' },
    { id: 'dt-vadodara-gj', name: 'Vadodara' },
    { id: 'dt-rajkot-gj', name: 'Rajkot' },
    { id: 'dt-bhavnagar-gj', name: 'Bhavnagar' },
    { id: 'dt-gandhinagar-gj', name: 'Gandhinagar' },
  ],
  'st-up-01': [
    { id: 'dt-lucknow-up', name: 'Lucknow' },
    { id: 'dt-kanpur-up', name: 'Kanpur Nagar' },
    { id: 'dt-varanasi-up', name: 'Varanasi' },
    { id: 'dt-agra-up', name: 'Agra' },
    { id: 'dt-prayagraj-up', name: 'Prayagraj' },
    { id: 'dt-noida-up', name: 'Noida (Gautam Buddha Nagar)' },
    { id: 'dt-ghaziabad-up', name: 'Ghaziabad' },
    { id: 'dt-meerut-up', name: 'Meerut' },
  ],
  'st-mp-01': [
    { id: 'dt-indore-01', name: 'Indore' },
    { id: 'dt-bhopal-01', name: 'Bhopal' },
    { id: 'dt-gwl-01', name: 'Gwalior' },
    { id: 'dt-jbp-01', name: 'Jabalpur' },
    { id: 'dt-ujjain-01', name: 'Ujjain' },
    { id: 'dt-sagar-01', name: 'Sagar' },
    { id: 'dt-rewa-01', name: 'Rewa' },
    { id: 'dt-satna-01', name: 'Satna' },
    { id: 'dt-ratlam-01', name: 'Ratlam' },
  ],
  'st-rj-01': [
    { id: 'dt-jaipur-rj', name: 'Jaipur' },
    { id: 'dt-jodhpur-rj', name: 'Jodhpur' },
    { id: 'dt-kota-rj', name: 'Kota' },
    { id: 'dt-udaipur-rj', name: 'Udaipur' },
    { id: 'dt-bikaner-rj', name: 'Bikaner' },
    { id: 'dt-ajmer-rj', name: 'Ajmer' },
  ],
  'st-wb-01': [
    { id: 'dt-kolkata-wb', name: 'Kolkata' },
    { id: 'dt-howrah-wb', name: 'Howrah' },
    { id: 'dt-n24p-wb', name: 'North 24 Parganas' },
    { id: 'dt-s24p-wb', name: 'South 24 Parganas' },
    { id: 'dt-darjeeling-wb', name: 'Darjeeling' },
    { id: 'dt-siliguri-wb', name: 'Siliguri' },
  ],
  'st-dl-01': [
    { id: 'dt-newdelhi-dl', name: 'New Delhi' },
    { id: 'dt-central-dl', name: 'Central Delhi' },
    { id: 'dt-north-dl', name: 'North Delhi' },
    { id: 'dt-south-dl', name: 'South Delhi' },
    { id: 'dt-east-dl', name: 'East Delhi' },
    { id: 'dt-west-dl', name: 'West Delhi' },
  ],
  'st-pb-01': [
    { id: 'dt-ludhiana-pb', name: 'Ludhiana' },
    { id: 'dt-amritsar-pb', name: 'Amritsar' },
    { id: 'dt-jalandhar-pb', name: 'Jalandhar' },
    { id: 'dt-patiala-pb', name: 'Patiala' },
    { id: 'dt-mohali-pb', name: 'Mohali (SAS Nagar)' },
  ],
  'st-hr-01': [
    { id: 'dt-gurugram-hr', name: 'Gurugram' },
    { id: 'dt-faridabad-hr', name: 'Faridabad' },
    { id: 'dt-panipat-hr', name: 'Panipat' },
    { id: 'dt-ambala-hr', name: 'Ambala' },
    { id: 'dt-panchkula-hr', name: 'Panchkula' },
  ],
  'st-br-01': [
    { id: 'dt-patna-br', name: 'Patna' },
    { id: 'dt-gaya-br', name: 'Gaya' },
    { id: 'dt-muzaffarpur-br', name: 'Muzaffarpur' },
    { id: 'dt-bhagalpur-br', name: 'Bhagalpur' },
  ],
};

const DIVISIONS_MAP: Record<string, TerritoryOption[]> = {
  'dt-chn-01': [
    { id: 'div-chn-n', name: 'Chennai North' },
    { id: 'div-chn-s', name: 'Chennai South' },
    { id: 'div-chn-c', name: 'Chennai Central' },
  ],
  'dt-dharm-01': [
    { id: 'div-dharm-c', name: 'Dharmapuri Central' },
    { id: 'div-dharm-p', name: 'Pennagaram' },
  ],
  'dt-indore-01': [
    { id: 'div-north-01', name: 'Indore North' },
    { id: 'div-south-01', name: 'Indore South' },
  ],
};

const PINCODES_MAP: Record<string, TerritoryOption[]> = {
  'div-chn-c': [
    { id: '600001', name: '600001 - George Town' },
    { id: '600002', name: '600002 - Anna Salai' },
  ],
  'div-dharm-c': [
    { id: '636701', name: '636701 - Dharmapuri Main' },
    { id: '636702', name: '636702 - Dharmapuri West' },
  ],
  'div-north-01': [
    { id: '452001', name: '452001 - Indore GPO' },
    { id: '452002', name: '452002 - Rajwada' },
  ],
};

// Node quota configuration (max 2 managers per node)
const NODE_QUOTA_MAP: Record<string, number> = {
  'st-tn-01': 1, // 1/2 slot filled
  'st-mp-01': 2, // 2/2 slots filled (FULL)
  'st-ka-01': 0, // 0/2 slots filled
  'dt-chn-01': 1,
  'dt-dharm-01': 1,
  'dt-indore-01': 2, // Full
  'div-chn-c': 1,
  'div-dharm-c': 0,
  'div-north-01': 2, // Full
  '600001': 1,
  '636701': 1,
  '452001': 2, // Full
};

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onBackToLogin,
  onRegisterSuccess,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Territory Selection hierarchy
  const [selectedRole, setSelectedRole] = useState<ManagerRole>(ManagerRole.STATE_MANAGER);
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedStateName, setSelectedStateName] = useState<string>('');
  const [stateSearchQuery, setStateSearchQuery] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedDistrictName, setSelectedDistrictName] = useState<string>('');
  const [districtSearchQuery, setDistrictSearchQuery] = useState<string>('');
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [selectedPincode, setSelectedPincode] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cascading change handlers: Parent selection clears dependent selections
  const handleRoleChange = (role: ManagerRole) => {
    setSelectedRole(role);
    setSelectedState('');
    setSelectedStateName('');
    setStateSearchQuery('');
    setSelectedDistrict('');
    setSelectedDistrictName('');
    setDistrictSearchQuery('');
    setSelectedDivision('');
    setSelectedPincode('');
  };

  const handleStateChange = (stateId: string, stateName?: string) => {
    setSelectedState(stateId);
    setSelectedStateName(stateName || '');
    setSelectedDistrict('');
    setSelectedDistrictName('');
    setDistrictSearchQuery('');
    setSelectedDivision('');
    setSelectedPincode('');
  };

  const handleDistrictChange = (districtId: string, districtName?: string) => {
    setSelectedDistrict(districtId);
    setSelectedDistrictName(districtName || '');
    setSelectedDivision('');
    setSelectedPincode('');
  };

  const handleDivisionChange = (divisionId: string) => {
    setSelectedDivision(divisionId);
    setSelectedPincode('');
  };

  const handlePincodeChange = (pincodeId: string) => {
    setSelectedPincode(pincodeId);
  };

  // Determine current active node for quota calculation
  const getSelectedNodeId = (): string => {
    if (selectedRole === ManagerRole.PINCODE_MANAGER) return selectedPincode;
    if (selectedRole === ManagerRole.DIVISION_MANAGER) return selectedDivision;
    if (selectedRole === ManagerRole.DISTRICT_MANAGER) return selectedDistrict;
    return selectedState;
  };

  const selectedNodeId = getSelectedNodeId();
  const currentSlotCount = selectedNodeId ? (NODE_QUOTA_MAP[selectedNodeId] ?? 0) : 0;
  const isNodeFull = currentSlotCount >= 2;

  const handleSubmitRegistration = async () => {
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please complete all required manager credentials.');
      return;
    }
    if (!selectedState) {
      Alert.alert('Territory Error', 'Please select assigned State.');
      return;
    }
    if (
      (selectedRole === ManagerRole.DISTRICT_MANAGER ||
        selectedRole === ManagerRole.DIVISION_MANAGER ||
        selectedRole === ManagerRole.PINCODE_MANAGER) &&
      !selectedDistrict
    ) {
      Alert.alert('Territory Error', 'Please select assigned District.');
      return;
    }
    if (
      (selectedRole === ManagerRole.DIVISION_MANAGER ||
        selectedRole === ManagerRole.PINCODE_MANAGER) &&
      !selectedDivision
    ) {
      Alert.alert('Territory Error', 'Please select assigned Division.');
      return;
    }
    if (selectedRole === ManagerRole.PINCODE_MANAGER && !selectedPincode) {
      Alert.alert('Territory Error', 'Please select assigned Pincode.');
      return;
    }

    if (isNodeFull) {
      Alert.alert(
        'Quota Exceeded',
        'Maximum quota of 2 managers per node reached for this territory. Please choose another slot.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (!ENV.useMockData) {
        await apiClient.post('/auth/register', {
          name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          role: selectedRole,
          stateId: selectedState,
          districtId: selectedDistrict || undefined,
          divisionId: selectedDivision || undefined,
          pincodeId: selectedPincode || undefined,
        });
      } else {
        // Mock simulated network latency
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      setIsSubmitting(false);
      Alert.alert(
        'Registration Submitted',
        'Your manager account has been registered and submitted for administrative activation.',
        [
          {
            text: 'Go to Login',
            onPress: onRegisterSuccess || onBackToLogin,
          },
        ]
      );
    } catch (error: any) {
      setIsSubmitting(false);
      Alert.alert('Registration Failed', error?.message || 'Unable to complete registration. Please try again.');
    }
  };

  const filteredStates = STATES.filter(s =>
    s.name.toLowerCase().includes(stateSearchQuery.trim().toLowerCase())
  );
  const districts = selectedState
    ? (DISTRICTS_MAP[selectedState] || [
        { id: `dt-${selectedState}-1`, name: `${selectedStateName || 'State'} Main District` },
        { id: `dt-${selectedState}-2`, name: `${selectedStateName || 'State'} North District` },
        { id: `dt-${selectedState}-3`, name: `${selectedStateName || 'State'} South District` },
      ])
    : [];
  const filteredDistricts = districts.filter(d =>
    d.name.toLowerCase().includes(districtSearchQuery.trim().toLowerCase())
  );
  const divisions = selectedDistrict
    ? (DIVISIONS_MAP[selectedDistrict] || [
        { id: `div-${selectedDistrict}-c`, name: `${selectedDistrictName || 'District'} Central` },
        { id: `div-${selectedDistrict}-n`, name: `${selectedDistrictName || 'District'} North` },
        { id: `div-${selectedDistrict}-s`, name: `${selectedDistrictName || 'District'} South` },
      ])
    : [];
  const pincodes = selectedDivision
    ? (PINCODES_MAP[selectedDivision] || [
        { id: `pin-600010`, name: '600010 - Main Town' },
        { id: `pin-600020`, name: '600020 - East Extension' },
      ])
    : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBackToLogin} activeOpacity={0.7}>
          <Icon name="arrow-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manager Registration</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionSubtitle}>
          Apply for territory manager onboarding. Node allocations are strictly limited to 2 managers per jurisdiction.
        </Text>

        {/* 1. ROLE SELECTION */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>1. Assigned Role Tier</Text>
          <View style={styles.roleGrid}>
            {ROLES.map(r => {
              const isSelected = selectedRole === r.value;
              return (
                <TouchableOpacity
                  key={r.value}
                  style={[styles.roleChip, isSelected && styles.activeRoleChip]}
                  onPress={() => handleRoleChange(r.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.roleChipText, isSelected && styles.activeRoleChipText]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 2. TERRITORY HIERARCHY CASCADING SELECTORS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>2. Territory Jurisdiction</Text>

          {/* State */}
          <View style={styles.districtHeaderRow}>
            <Text style={styles.fieldLabel}>State *</Text>
            {selectedState ? (
              <View style={styles.selectedDistrictBadgeContainer}>
                <Text style={styles.selectedDistrictBadgeText}>
                  ✓ {selectedStateName || STATES.find(s => s.id === selectedState)?.name}
                </Text>
              </View>
            ) : null}
          </View>

          {/* State Search Bar */}
          <View style={styles.searchBoxContainer}>
            <Icon name="magnify" size={18} color="#64748B" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search or enter state (e.g. Maharashtra, Kerala)..."
              placeholderTextColor="#94A3B8"
              value={stateSearchQuery}
              onChangeText={setStateSearchQuery}
            />
            {stateSearchQuery ? (
              <TouchableOpacity onPress={() => setStateSearchQuery('')} style={{ padding: 4 }}>
                <Icon name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView
            nestedScrollEnabled
            style={styles.districtScrollView}
            contentContainerStyle={styles.pillRow}
            showsVerticalScrollIndicator={true}
          >
            {filteredStates.map(s => (
              <TouchableOpacity
                key={s.id}
                style={[styles.optionPill, selectedState === s.id && styles.activeOptionPill]}
                onPress={() => handleStateChange(s.id, s.name)}
              >
                <Text style={[styles.optionPillText, selectedState === s.id && styles.activeOptionPillText]}>
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}

            {stateSearchQuery.trim() !== '' &&
              !filteredStates.some(s => s.name.toLowerCase() === stateSearchQuery.trim().toLowerCase()) && (
                <TouchableOpacity
                  style={[styles.optionPill, styles.customOptionPill]}
                  onPress={() => {
                    const customName = stateSearchQuery.trim();
                    const customId = `st-custom-${customName.toLowerCase().replace(/\s+/g, '-')}`;
                    handleStateChange(customId, customName);
                  }}
                >
                  <Text style={styles.customOptionPillText}>
                    + Select "{stateSearchQuery.trim()}"
                  </Text>
                </TouchableOpacity>
              )}
          </ScrollView>

          {/* District (for L2, L3, L4) */}
          {(selectedRole === ManagerRole.DISTRICT_MANAGER ||
            selectedRole === ManagerRole.DIVISION_MANAGER ||
            selectedRole === ManagerRole.PINCODE_MANAGER) && (
            <>
              <View style={styles.districtHeaderRow}>
                <Text style={styles.fieldLabel}>District *</Text>
                {selectedDistrict ? (
                  <View style={styles.selectedDistrictBadgeContainer}>
                    <Text style={styles.selectedDistrictBadgeText}>
                      ✓ {selectedDistrictName || districts.find(d => d.id === selectedDistrict)?.name}
                    </Text>
                  </View>
                ) : null}
              </View>

              {districts.length === 0 ? (
                <Text style={styles.placeholderText}>Select a State first</Text>
              ) : (
                <>
                  {/* Search Bar for manual search / filter */}
                  <View style={styles.searchBoxContainer}>
                    <Icon name="magnify" size={18} color="#64748B" style={styles.searchIcon} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search or enter district (e.g. Salem, Madurai)..."
                      placeholderTextColor="#94A3B8"
                      value={districtSearchQuery}
                      onChangeText={setDistrictSearchQuery}
                    />
                    {districtSearchQuery ? (
                      <TouchableOpacity onPress={() => setDistrictSearchQuery('')} style={{ padding: 4 }}>
                        <Icon name="close-circle" size={16} color="#94A3B8" />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <ScrollView
                    nestedScrollEnabled
                    style={styles.districtScrollView}
                    contentContainerStyle={styles.pillRow}
                    showsVerticalScrollIndicator={true}
                  >
                    {filteredDistricts.map(d => (
                      <TouchableOpacity
                        key={d.id}
                        style={[styles.optionPill, selectedDistrict === d.id && styles.activeOptionPill]}
                        onPress={() => handleDistrictChange(d.id, d.name)}
                      >
                        <Text
                          style={[
                            styles.optionPillText,
                            selectedDistrict === d.id && styles.activeOptionPillText,
                          ]}
                        >
                          {d.name}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    {/* Manual entry option when search query doesn't match any standard district pill */}
                    {districtSearchQuery.trim() !== '' &&
                      !filteredDistricts.some(
                        d => d.name.toLowerCase() === districtSearchQuery.trim().toLowerCase()
                      ) && (
                        <TouchableOpacity
                          style={[styles.optionPill, styles.customOptionPill]}
                          onPress={() => {
                            const customName = districtSearchQuery.trim();
                            const customId = `dt-custom-${customName.toLowerCase().replace(/\s+/g, '-')}`;
                            handleDistrictChange(customId, customName);
                          }}
                        >
                          <Text style={styles.customOptionPillText}>
                            + Select "{districtSearchQuery.trim()}"
                          </Text>
                        </TouchableOpacity>
                      )}
                  </ScrollView>
                </>
              )}
            </>
          )}

          {/* Division (for L3, L4) */}
          {(selectedRole === ManagerRole.DIVISION_MANAGER ||
            selectedRole === ManagerRole.PINCODE_MANAGER) && (
            <>
              <Text style={styles.fieldLabel}>Division *</Text>
              {divisions.length === 0 ? (
                <Text style={styles.placeholderText}>Select a District first</Text>
              ) : (
                <View style={styles.pillRow}>
                  {divisions.map(div => (
                    <TouchableOpacity
                      key={div.id}
                      style={[styles.optionPill, selectedDivision === div.id && styles.activeOptionPill]}
                      onPress={() => handleDivisionChange(div.id)}
                    >
                      <Text style={[styles.optionPillText, selectedDivision === div.id && styles.activeOptionPillText]}>
                        {div.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}

          {/* Pincode (for L4) */}
          {selectedRole === ManagerRole.PINCODE_MANAGER && (
            <>
              <Text style={styles.fieldLabel}>Assigned Pincode *</Text>
              {pincodes.length === 0 ? (
                <Text style={styles.placeholderText}>Select a Division first</Text>
              ) : (
                <View style={styles.pillRow}>
                  {pincodes.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.optionPill, selectedPincode === p.id && styles.activeOptionPill]}
                      onPress={() => handlePincodeChange(p.id)}
                    >
                      <Text style={[styles.optionPillText, selectedPincode === p.id && styles.activeOptionPillText]}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}

          {/* QUOTA STATUS INDICATOR */}
          {selectedNodeId ? (
            <View
              style={[
                styles.quotaIndicatorBox,
                isNodeFull ? styles.quotaBoxFull : styles.quotaBoxAvailable,
              ]}
            >
              <Icon
                name={isNodeFull ? 'close-circle' : 'check-circle'}
                size={18}
                color={isNodeFull ? '#DC2626' : '#166534'}
                style={{ marginRight: 8 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.quotaTitleText,
                    { color: isNodeFull ? '#991B1B' : '#166534' },
                  ]}
                >
                  {isNodeFull ? 'Slots Filled (2/2)' : `Slot Available (${currentSlotCount}/2)`}
                </Text>
                <Text style={styles.quotaSubtext}>
                  {isNodeFull
                    ? 'This territory node has reached its maximum manager capacity of 2. Registration is disabled.'
                    : 'Territory node capacity permits registration.'}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* 3. MANAGER CREDENTIALS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>3. Manager Details</Text>
          <FICTextInput
            label="Full Legal Name *"
            placeholder="e.g. Anand Sharma"
            value={fullName}
            onChangeText={setFullName}
          />
          <FICTextInput
            label="Official Email *"
            placeholder="anand.s@forgeindia.in"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <FICTextInput
            label="Mobile Phone *"
            placeholder="10-digit mobile number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <FICTextInput
            label="Password *"
            placeholder="Create password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <FICButton
          title={isNodeFull ? 'Territory Node Full — Cannot Register' : 'Submit Registration'}
          onPress={handleSubmitRegistration}
          loading={isSubmitting}
          disabled={isNodeFull}
          style={isNodeFull ? { ...styles.submitButton, ...styles.disabledButton } : styles.submitButton}
        />

        <TouchableOpacity style={styles.loginLink} onPress={onBackToLogin} activeOpacity={0.7}>
          <Text style={styles.loginLinkText}>
            Already have an active account? <Text style={styles.loginLinkBold}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  roleGrid: {
    gap: 8,
  },
  roleChip: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  activeRoleChip: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  activeRoleChipText: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginTop: 10,
    marginBottom: 6,
  },
  districtHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 6,
  },
  selectedDistrictBadgeContainer: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  selectedDistrictBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  searchBoxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0F172A',
    paddingVertical: 2,
  },
  districtScrollView: {
    maxHeight: 180,
    marginBottom: 8,
  },
  customOptionPill: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  customOptionPillText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '700',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  optionPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  activeOptionPill: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  optionPillText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  activeOptionPillText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  placeholderText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  quotaIndicatorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
  },
  quotaBoxAvailable: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
  quotaBoxFull: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  quotaTitleText: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  quotaSubtext: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#94A3B8',
    borderColor: '#94A3B8',
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  loginLinkText: {
    fontSize: 13,
    color: '#64748B',
  },
  loginLinkBold: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
});

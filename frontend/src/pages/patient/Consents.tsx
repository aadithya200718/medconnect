import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Users, Building2, Plus, Trash2, Shield, AlertTriangle } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Button } from '@/components/shared/Button';
import { Modal } from '@/components/shared/Modal';
import { Input } from '@/components/shared/Input';
import { Badge } from '@/components/shared/Badge';
import { patientApi } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import type { Patient, ConsentType } from '@/types';

// Mock removed

const consentTypeLabels: Record<ConsentType, { label: string; color: string }> = {
    read: { label: 'Read Access', color: 'info' },
    write: { label: 'Write Access', color: 'warning' },
    dispense: { label: 'Dispense', color: 'success' },
};

export function PatientConsents() {
    const { user } = useAuthStore();
    const patient = user as Patient;
    const [consents, setConsents] = useState<any[]>([]);
    const [showNewConsentModal, setShowNewConsentModal] = useState(false);
    const [showRevokeModal, setShowRevokeModal] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');

    // New Consent Form State
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedGrantee, setSelectedGrantee] = useState<any | null>(null);
    const [granteeType, setGranteeType] = useState<'doctor' | 'pharmacy'>('doctor');
    const [selectedDuration, setSelectedDuration] = useState(24);

    useEffect(() => {
        loadConsents();
    }, [patient]);

    const loadConsents = async () => {
        if (!patient?.id) return;
        const res = await patientApi.getConsents(patient.id);
        if (res.success) {
            setConsents(res.data);
        }
    };

    const handleSearch = async (term: string) => {
        setSearchTerm(term);
        if (term.length < 2) {
            setSearchResults([]);
            return;
        }

        let res;
        if (granteeType === 'doctor') {
            res = await patientApi.searchDoctors(term);
        } else {
            res = await patientApi.searchPharmacies(term);
        }

        if (res.success) {
            setSearchResults(res.data);
        }
    };

    const handleGrantConsent = async () => {
        if (!selectedGrantee || !patient?.id) return;

        const res = await patientApi.grantConsent(patient.id, {
            grantedToId: selectedGrantee.id,
            grantedToType: granteeType,
            consentTypes: granteeType === 'pharmacy' ? ['read', 'dispense'] : ['read', 'write'],
            durationHours: selectedDuration
        });

        if (res.success) {
            setShowNewConsentModal(false);
            loadConsents();
            setSelectedGrantee(null);
            setSearchTerm('');
        }
    };

    const handleRevokeConsent = async (consentId: string) => {
        if (!patient?.id) return;

        const res = await patientApi.revokeConsent(patient.id, consentId);
        if (res.success) {
            loadConsents();
            setShowRevokeModal(null);
        }
    };

    const getDaysRemaining = (expiresAt: string) => {
        const now = new Date();
        const expiry = new Date(expiresAt);
        const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    const filteredConsents = consents.filter((consent) => {
        const isActive = consent.is_active || consent.isActive;
        if (filter === 'all') return true;
        if (filter === 'active') return isActive;
        if (filter === 'expired') return !isActive;
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-3xl font-bold text-white mb-2">Consent Management</h1>
                <p className="text-white/60">Control who can access your medical records</p>
            </motion.div>

            {/* Info Card */}
            <GlassCard className="border-l-4 border-l-primary-500">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-primary-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-semibold mb-1">Time-Bound Consent System</h3>
                        <p className="text-sm text-white/60">
                            Grant temporary access to your medical data. All consents are recorded on the blockchain
                            and automatically expire at the specified time. You can revoke access at any time.
                        </p>
                    </div>
                </div>
            </GlassCard>

            {/* Actions & Filters */}
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex gap-2">
                    {(['all', 'active', 'expired'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f
                                ? 'bg-primary-500 text-white'
                                : 'bg-white/10 text-white/60 hover:bg-white/20'
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
                <Button onClick={() => setShowNewConsentModal(true)}>
                    <Plus className="w-4 h-4" />
                    Grant New Consent
                </Button>
            </div>

            {/* Consents List */}
            <div className="space-y-4">
                {filteredConsents.map((consent, index) => {
                    const daysRemaining = getDaysRemaining(consent.expires_at || consent.expiresAt);
                    const isActive = consent.is_active || consent.isActive;
                    const isExpiringSoon = isActive && daysRemaining <= 7 && daysRemaining > 0;
                    // Handle JSON parsing if it comes as string from DB
                    const types = typeof consent.consent_types === 'string'
                        ? JSON.parse(consent.consent_types)
                        : (consent.consent_types || consent.consentTypes);

                    return (
                        <motion.div
                            key={consent.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <GlassCard className={!isActive ? 'opacity-60' : ''}>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${consent.granted_to_type === 'doctor'
                                            ? 'bg-primary-500/20'
                                            : 'bg-success-500/20'
                                            }`}>
                                            {consent.granted_to_type === 'doctor' ? (
                                                <Users className="w-6 h-6 text-primary-400" />
                                            ) : (
                                                <Building2 className="w-6 h-6 text-success-400" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-lg font-semibold text-white">
                                                    {consent.granted_to_name || consent.grantedToName}
                                                </h3>
                                                {!isActive && (
                                                    <Badge variant="danger">Expired</Badge>
                                                )}
                                                {isExpiringSoon && (
                                                    <Badge variant="warning">Expiring Soon</Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-white/50 capitalize mb-2">
                                                {consent.granted_to_type || consent.grantedToType}
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {types.map((type: any) => (
                                                    consentTypeLabels[type as ConsentType] && (
                                                        <Badge
                                                            key={type}
                                                            variant={consentTypeLabels[type as ConsentType].color as any}
                                                            size="sm"
                                                        >
                                                            {consentTypeLabels[type as ConsentType].label}
                                                        </Badge>
                                                    )
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="flex items-center gap-2 text-sm text-white/40 mb-1">
                                                <Clock className="w-3 h-3" />
                                                <span>
                                                    {isActive
                                                        ? `${daysRemaining} days remaining`
                                                        : 'Expired'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-white/30">
                                                Expires: {new Date(consent.expires_at || consent.expiresAt).toLocaleDateString()}
                                            </p>
                                        </div>

                                        {isActive && (
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={() => setShowRevokeModal(consent.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Revoke
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    );
                })}

                {filteredConsents.length === 0 && (
                    <GlassCard className="text-center py-12">
                        <Clock className="w-12 h-12 text-white/20 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">No consents found</h3>
                        <p className="text-white/50">You haven't granted any consents yet</p>
                    </GlassCard>
                )}
            </div>

            {/* New Consent Modal */}
            <Modal
                isOpen={showNewConsentModal}
                onClose={() => setShowNewConsentModal(false)}
                title="Grant New Consent"
            >
                <div className="space-y-4">
                    <div>
                        <div className="flex gap-2 mb-4">
                            <Button
                                size="sm"
                                variant={granteeType === 'doctor' ? 'primary' : 'outline'}
                                onClick={() => { setGranteeType('doctor'); setSearchResults([]); setSearchTerm(''); setSelectedGrantee(null); }}
                            >
                                Doctor
                            </Button>
                            <Button
                                size="sm"
                                variant={granteeType === 'pharmacy' ? 'primary' : 'outline'}
                                onClick={() => { setGranteeType('pharmacy'); setSearchResults([]); setSearchTerm(''); setSelectedGrantee(null); }}
                            >
                                Pharmacy
                            </Button>
                        </div>

                        <label className="block text-sm text-white/60 mb-2">Search {granteeType === 'doctor' ? 'Doctor' : 'Pharmacy'}</label>
                        <Input
                            placeholder={`Enter ${granteeType} name...`}
                            icon={<Users className="w-4 h-4" />}
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                        />

                        {/* Search Results */}
                        {searchResults.length > 0 && !selectedGrantee && (
                            <div className="mt-2 bg-white/10 rounded-lg p-2 max-h-40 overflow-y-auto">
                                {searchResults.map(result => (
                                    <div
                                        key={result.id}
                                        className="p-2 hover:bg-white/10 rounded cursor-pointer text-sm text-white"
                                        onClick={() => { setSelectedGrantee(result); setSearchTerm(result.full_name || result.pharmacy_name); setSearchResults([]); }}
                                    >
                                        {result.full_name || result.pharmacy_name}
                                        <span className="block text-xs text-white/50">{result.hospital || result.address}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {selectedGrantee && (
                            <p className="text-xs text-green-400 mt-1">Selected: {selectedGrantee.full_name || selectedGrantee.pharmacy_name}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm text-white/60 mb-2">Duration</label>
                        <div className="grid grid-cols-4 gap-2">
                            {[1, 24, 168, 720].map(hrs => (
                                <Button
                                    key={hrs}
                                    variant={selectedDuration === hrs ? 'primary' : 'outline'}
                                    size="sm"
                                    onClick={() => setSelectedDuration(hrs)}
                                >
                                    {hrs < 24 ? `${hrs} Hrs` : `${hrs / 24} Days`}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-warning-500/10 border border-warning-500/20">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-warning-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-warning-400">
                                This consent will be recorded on the blockchain and cannot be modified.
                                You can revoke it at any time before expiration.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button variant="outline" className="flex-1" onClick={() => setShowNewConsentModal(false)}>
                            Cancel
                        </Button>
                        <Button className="flex-1" disabled={!selectedGrantee} onClick={handleGrantConsent}>
                            Grant Consent
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Revoke Confirmation Modal */}
            <Modal
                isOpen={!!showRevokeModal}
                onClose={() => setShowRevokeModal(null)}
                title="Revoke Consent"
            >
                <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-danger-500/10 border border-danger-500/20">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-danger-400 flex-shrink-0" />
                            <div>
                                <p className="text-danger-400 font-medium mb-1">Are you sure?</p>
                                <p className="text-sm text-white/60">
                                    This will immediately revoke access to your medical records.
                                    The revocation will be recorded on the blockchain.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setShowRevokeModal(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            className="flex-1"
                            onClick={() => showRevokeModal && handleRevokeConsent(showRevokeModal)}
                        >
                            Revoke Access
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

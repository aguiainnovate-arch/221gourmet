import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User,
  ChevronDown,
  Mail,
  Phone,
  MapPin,
  Plus,
  Trash2,
  LogOut,
  Loader2,
  Check,
} from 'lucide-react';
import type { DeliveryUser } from '../../types/deliveryUser';
import { deleteDeliveryUserAccount, updateDeliveryUserProfile } from '../../services/deliveryUserService';
import { deleteUser } from 'firebase/auth';
import { auth } from '../../../firebase';
import {
  addAddress,
  clearSavedAddresses,
  getSavedAddresses,
  removeAddress,
  saveAddresses,
} from '../../utils/deliveryAddressStorage';
import { formatPhoneDisplay } from '../../utils/authInputUtils';

interface Props {
  user: DeliveryUser;
  onUpdateUser: (user: DeliveryUser) => void;
  onLogout: () => void;
  /** Incrementar para abrir o menu externamente (ex.: aba Perfil). */
  openTrigger?: number;
}

export default function DeliveryProfileMenu({ user, onUpdateUser, onLogout, openTrigger }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [primaryAddress, setPrimaryAddress] = useState(user.address);
  const [addresses, setAddresses] = useState<string[]>([]);
  const [newAddress, setNewAddress] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone);
    setPrimaryAddress(user.address);
    setAddresses(getSavedAddresses(user.id, user.address));
  }, [user]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (openTrigger != null && openTrigger > 0) setOpen(true);
  }, [openTrigger]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await updateDeliveryUserProfile(user.id, {
        name,
        email,
        phone,
        address: primaryAddress,
      });
      saveAddresses(user.id, addresses);
      onUpdateUser(updated);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('[DeliveryProfileMenu] save', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm(t('delivery.profileDeleteAccountConfirm'))) return;
    setDeleting(true);
    try {
      await deleteDeliveryUserAccount(user.id);
      clearSavedAddresses(user.id);
      const fbUser = auth.currentUser;
      if (fbUser) {
        try {
          await deleteUser(fbUser);
        } catch {
          // sessão antiga: o perfil no Firestore já foi apagado
        }
      }
      setOpen(false);
      onLogout();
    } catch (err) {
      console.error('[DeliveryProfileMenu] delete account', err);
      window.alert(t('delivery.profileDeleteAccountError'));
    } finally {
      setDeleting(false);
    }
  };

  const handleAddAddress = () => {
    const trimmed = newAddress.trim();
    if (!trimmed) return;
    const next = addAddress(user.id, trimmed, primaryAddress);
    setAddresses(next);
    if (!primaryAddress.trim()) setPrimaryAddress(trimmed);
    setNewAddress('');
  };

  const handleRemoveAddress = (addr: string) => {
    const next = removeAddress(user.id, addr, primaryAddress);
    setAddresses(next);
    if (primaryAddress === addr) {
      setPrimaryAddress(next[0] ?? '');
    }
  };

  const setAsPrimary = (addr: string) => {
    setPrimaryAddress(addr);
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border min-w-0 max-w-[140px] active:scale-[0.98] transition-transform"
        style={{ backgroundColor: '#FAF0DB', borderColor: '#E9D7C4', color: '#2A1E1A' }}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <User className="w-4 h-4 shrink-0" />
        <span className="font-semibold text-xs truncate">{t('delivery.clientLabel')}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(100vw-2rem,320px)] rounded-2xl border shadow-xl overflow-hidden"
          style={{ backgroundColor: '#FFF8F2', borderColor: '#E9D7C4' }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: '#E9D7C4', backgroundColor: '#FAF0DB' }}>
            <p className="font-bold text-sm truncate" style={{ color: '#2A1E1A' }}>
              {user.name}
            </p>
            <p className="text-xs truncate mt-0.5" style={{ color: '#6B5A54' }}>
              {t('delivery.profileMenuSubtitle')}
            </p>
          </div>

          <div className="max-h-[min(70dvh,420px)] overflow-y-auto p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wide text-black">
                {t('delivery.fullName')}
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-sm text-black"
                style={{ borderColor: '#E9D7C4', backgroundColor: '#FFFFFF' }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1 text-black">
                <Mail className="w-3 h-3" /> E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-sm text-black"
                style={{ borderColor: '#E9D7C4', backgroundColor: '#FFFFFF' }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1 text-black">
                <Phone className="w-3 h-3" /> {t('delivery.phone')}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-sm text-black"
                style={{ borderColor: '#E9D7C4', backgroundColor: '#FFFFFF' }}
              />
              <p className="text-[10px]" style={{ color: '#6B5A54' }}>
                {formatPhoneDisplay(phone)}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1 text-black">
                <MapPin className="w-3 h-3" /> {t('delivery.profileAddresses')}
              </label>
              <div className="space-y-1.5">
                {addresses.length === 0 ? (
                  <p className="text-xs" style={{ color: '#6B5A54' }}>
                    {t('delivery.profileNoAddresses')}
                  </p>
                ) : (
                  addresses.map((addr) => (
                    <div
                      key={addr}
                      className="flex items-start gap-2 p-2 rounded-xl border"
                      style={{
                        borderColor: primaryAddress === addr ? '#E91120' : '#E9D7C4',
                        backgroundColor: primaryAddress === addr ? 'rgba(233,17,32,0.06)' : '#FFFFFF',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setAsPrimary(addr)}
                        className="flex-1 text-left text-xs leading-snug"
                        style={{ color: '#2A1E1A' }}
                      >
                        {addr}
                        {primaryAddress === addr ? (
                          <span className="block text-[10px] font-bold mt-0.5" style={{ color: '#E91120' }}>
                            {t('delivery.profilePrimaryAddress')}
                          </span>
                        ) : null}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveAddress(addr)}
                        className="p-1 rounded-lg shrink-0"
                        style={{ color: '#6B5A54' }}
                        aria-label={t('delivery.remove')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder={t('delivery.addressPlaceholder')}
                  className="flex-1 px-3 py-2 rounded-xl border text-xs text-black placeholder:text-neutral-400"
                  style={{ borderColor: '#E9D7C4', backgroundColor: '#FFFFFF' }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddAddress()}
                />
                <button
                  type="button"
                  onClick={handleAddAddress}
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white"
                  style={{ backgroundColor: '#E91120' }}
                  aria-label={t('delivery.profileAddAddress')}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleSaveProfile()}
              disabled={saving}
              className="w-full py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ backgroundColor: '#2A1E1A' }}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <Check className="w-4 h-4" />
              ) : null}
              {saved ? t('delivery.profileSaved') : t('delivery.profileSave')}
            </button>

            <button
              type="button"
              onClick={() => void handleDeleteAccount()}
              disabled={saving || deleting}
              className="w-full py-2.5 rounded-xl text-sm font-bold border flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ color: '#E91120', borderColor: '#E91120', backgroundColor: '#FFF5F5' }}
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {deleting ? `${t('delivery.profileDeleteAccount')}…` : t('delivery.profileDeleteAccount')}
            </button>
          </div>

          <div className="p-3 border-t" style={{ borderColor: '#E9D7C4' }}>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="w-full py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.99]"
              style={{ backgroundColor: '#E91120' }}
            >
              <LogOut className="w-4 h-4" />
              {t('delivery.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DeliveryProfileLoginButton() {
  const { t } = useTranslation();
  return (
    <Link
      to="/delivery/auth"
      className="flex items-center gap-1.5 text-white px-3 py-2 rounded-xl font-semibold text-xs transition-all shadow-md shrink-0 hover:opacity-90 active:scale-[0.98]"
      style={{ backgroundColor: '#E91120' }}
    >
      <User className="w-4 h-4 shrink-0" />
      <span className="whitespace-nowrap">{t('delivery.signIn')}</span>
    </Link>
  );
}

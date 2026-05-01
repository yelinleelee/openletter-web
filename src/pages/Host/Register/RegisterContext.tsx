import { createContext, useContext, useMemo, useState } from 'react';
import { api } from '../../../lib/api';

export const TYPE_TO_ENUM: Record<string, string> = {
  '단독주택': 'house',
  '아파트': 'apartment',
  '별장/펜션': 'villa',
  '한옥': 'unique',
  '독채 캐빈': 'guesthouse',
  '부티크 호텔': 'hotel',
};

export interface RegisterFormData {
  type: string | null;
  concept: string | null;
  guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  name: string;
  description: string;
  region: string;
  address: string;
  photos: File[];
  price: string;
}

interface RegisterContextValue {
  data: RegisterFormData;
  setField: <K extends keyof RegisterFormData>(key: K, value: RegisterFormData[K]) => void;
  addPhotos: (files: File[]) => void;
  removePhoto: (index: number) => void;
  submitting: boolean;
  submitError: string | null;
  submit: () => Promise<boolean>;
}

const initialData: RegisterFormData = {
  type: null,
  concept: null,
  guests: 2,
  bedrooms: 1,
  beds: 1,
  bathrooms: 1,
  name: '',
  description: '',
  region: '',
  address: '',
  photos: [],
  price: '',
};

const RegisterContext = createContext<RegisterContextValue | null>(null);

export function RegisterProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<RegisterFormData>(initialData);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const value = useMemo<RegisterContextValue>(() => ({
    data,
    setField: (key, value) => setData(prev => ({ ...prev, [key]: value })),
    addPhotos: (files) => setData(prev => ({ ...prev, photos: [...prev.photos, ...files] })),
    removePhoto: (index) => setData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    })),
    submitting,
    submitError,
    submit: async () => {
      setSubmitError(null);

      const propertyType = data.type ? TYPE_TO_ENUM[data.type] : null;
      if (!propertyType) {
        setSubmitError('숙소 유형을 선택해주세요.');
        return false;
      }
      if (!data.name.trim()) {
        setSubmitError('숙소 이름을 입력해주세요.');
        return false;
      }
      if (!data.region || !data.address.trim()) {
        setSubmitError('숙소 위치를 입력해주세요.');
        return false;
      }
      const priceNum = Number(data.price);
      if (!priceNum || priceNum <= 0) {
        setSubmitError('가격을 입력해주세요.');
        return false;
      }
      if (data.photos.length === 0) {
        setSubmitError('사진을 1장 이상 업로드해주세요.');
        return false;
      }

      setSubmitting(true);
      try {
        const formData = new FormData();
        data.photos.forEach(file => formData.append('images', file));
        const uploadRes = await api.post<{ images: { url: string }[] }>('/upload/images', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const imageUrls = uploadRes.data.images.map(img => img.url);

        const amenities = data.concept ? [data.concept] : [];

        await api.post('/properties', {
          title: data.name.trim(),
          description: data.description.trim() || null,
          propertyType,
          roomType: 'entire',
          maxGuests: data.guests,
          bedrooms: data.bedrooms,
          beds: data.beds,
          bathrooms: data.bathrooms,
          price: priceNum,
          currency: 'KRW',
          address: data.address.trim(),
          city: data.region,
          country: '한국',
          amenities,
          images: imageUrls,
          isAvailable: true,
        });

        setData(initialData);
        return true;
      } catch (err: any) {
        const msg = err?.response?.data?.error || err?.message || '숙소 등록에 실패했습니다.';
        setSubmitError(msg);
        return false;
      } finally {
        setSubmitting(false);
      }
    },
  }), [data, submitting, submitError]);

  return <RegisterContext.Provider value={value}>{children}</RegisterContext.Provider>;
}

export function useRegister() {
  const ctx = useContext(RegisterContext);
  if (!ctx) throw new Error('useRegister must be used inside RegisterProvider');
  return ctx;
}

import type { Stay, StayDetail } from '../types';

export interface ApiProperty {
  id: string;
  hostId: string;
  title: string;
  description: string | null;
  propertyType: 'apartment' | 'house' | 'villa' | 'guesthouse' | 'hotel' | 'unique';
  roomType: 'entire' | 'private' | 'shared';
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number | string;
  price: number | string;
  currency: string;
  address: string;
  city: string;
  country: string;
  latitude: number | string | null;
  longitude: number | string | null;
  amenities: string[] | null;
  images: string[] | null;
  isAvailable: boolean;
  rating: number | string;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
  host?: { id: string; name: string; avatar?: string | null; phone?: string | null };
  reviews?: Array<{ id: string; rating: number; comment?: string; createdAt: string; userId?: string }>;
}

export const TYPE_LABEL: Record<ApiProperty['propertyType'], string> = {
  apartment: '아파트',
  house: '단독주택',
  villa: '별장/펜션',
  guesthouse: '독채 캐빈',
  hotel: '부티크 호텔',
  unique: '한옥',
};

const KNOWN_CATEGORIES = ['아트 스테이', '친환경', '로컬 스테이', '럭셔리'];

function pickCategories(p: ApiProperty): string[] {
  const amenities = p.amenities ?? [];
  const found = amenities.filter(a => KNOWN_CATEGORIES.includes(a));
  return found.length > 0 ? found : [TYPE_LABEL[p.propertyType] ?? '스테이'];
}

function capacityLabel(p: ApiProperty): string {
  const max = Number(p.maxGuests) || 1;
  return max <= 1 ? '1명' : `1~${max}명`;
}

export function getLatLng(p: ApiProperty): { lat: number; lng: number } | null {
  const lat = Number(p.latitude);
  const lng = Number(p.longitude);
  if (!isFinite(lat) || !isFinite(lng) || lat === 0 || lng === 0) return null;
  return { lat, lng };
}

export function mapApiToStay(p: ApiProperty): Stay {
  return {
    id: p.id,
    name: p.title,
    region: p.city,
    district: '',
    categories: pickCategories(p),
    capacity: capacityLabel(p),
    price: Number(p.price) || 0,
    badges: [],
    description: p.description ?? '',
    images: p.images ?? [],
  };
}

export function mapApiToStayDetail(p: ApiProperty): StayDetail {
  const price = Number(p.price) || 0;
  const cover = p.images?.[0];
  return {
    id: p.id,
    name: p.title,
    location: `${p.city}${p.address ? `, ${p.address}` : ''}`,
    colorClass: 'cp-b1',
    badges: [],
    reviews: { score: Number(p.rating) || 0, count: p.reviewCount || 0 },
    originalPrice: null,
    discount: null,
    finalPrice: price,
    coupon: null,
    promo: null,
    introImage: cover,
    roomImage: p.images?.[1],
    room: {
      name: p.title,
      type: '기본형',
      minGuests: 1,
      maxGuests: p.maxGuests || 2,
    },
    description: p.description ?? '',
    address: p.address,
    locationDesc: '',
    checkin: '15:00',
    checkout: '11:00',
    rules: [],
    sampleReviews: [],
  };
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar } from '../common/Calendar';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import styles from './BookingWidget.module.css';

interface Props {
  propertyId: string;
  pricePerNight: number;
  maxGuests: number;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
}

export function BookingWidget({ propertyId, pricePerNight, maxGuests }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [guests, setGuests] = useState(1);
  const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get<string[]>(`/properties/${propertyId}/booked-dates`)
      .then(res => {
        if (!cancelled) setBookedDates(new Set(res.data));
      })
      .catch(() => { /* non-fatal: widget still usable */ });
    return () => { cancelled = true; };
  }, [propertyId]);

  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const total = nights * pricePerNight;

  async function handleReserve() {
    setError(null);
    if (!user) {
      navigate('/', { state: { needLogin: true } });
      return;
    }
    if (!checkIn || !checkOut) {
      setError('체크인/체크아웃 날짜를 선택해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/bookings', {
        propertyId,
        checkIn,
        checkOut,
        guests,
      });
      navigate('/bookings/my');
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.error
        || (status === 409 ? '선택한 날짜에 이미 예약이 있습니다.' : '예약에 실패했습니다.');
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.box}>
      <div className={styles.priceRow}>
        <span className={styles.price}>₩{pricePerNight.toLocaleString()}</span>
        <span className={styles.per}>/ 박</span>
      </div>

      <div className={styles.calendarWrap}>
        <Calendar
          checkIn={checkIn}
          checkOut={checkOut}
          onChange={(ci, co) => { setCheckIn(ci); setCheckOut(co); }}
          bookedDates={bookedDates}
        />
      </div>

      <div className={styles.dateSummary}>
        <div className={styles.dateCol}>
          <span className={styles.dateLabel}>체크인</span>
          <span className={styles.dateVal}>{checkIn ?? '날짜 선택'}</span>
        </div>
        <div className={styles.dateCol}>
          <span className={styles.dateLabel}>체크아웃</span>
          <span className={styles.dateVal}>{checkOut ?? '날짜 선택'}</span>
        </div>
      </div>

      <div className={styles.guestRow}>
        <span className={styles.guestLabel}>인원</span>
        <div className={styles.counter}>
          <button
            type="button"
            className={styles.counterBtn}
            disabled={guests <= 1}
            onClick={() => setGuests(g => Math.max(1, g - 1))}
            aria-label="인원 감소"
          >−</button>
          <span className={styles.counterNum}>{guests}</span>
          <button
            type="button"
            className={styles.counterBtn}
            disabled={guests >= maxGuests}
            onClick={() => setGuests(g => Math.min(maxGuests, g + 1))}
            aria-label="인원 증가"
          >+</button>
        </div>
      </div>

      {nights > 0 && (
        <div className={styles.totalRow}>
          <span>₩{pricePerNight.toLocaleString()} × {nights}박</span>
          <strong>₩{total.toLocaleString()}</strong>
        </div>
      )}

      {error && <div className={styles.errorBox}>{error}</div>}

      <button
        type="button"
        className={styles.reserveBtn}
        onClick={handleReserve}
        disabled={submitting}
      >
        {submitting ? '예약 요청 중…' : user ? '예약하기' : '로그인하고 예약하기'}
      </button>

      <p className={styles.note}>예약 즉시 결제되지 않으며, 호스트 승인 후 확정됩니다.</p>
    </div>
  );
}

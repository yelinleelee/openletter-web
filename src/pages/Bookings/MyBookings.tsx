import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import styles from './MyBookings.module.css';

interface BookingProperty {
  id: string;
  title: string;
  city: string;
  address: string;
  images: string[] | null;
}

interface MyBooking {
  id: string;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number | string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: string;
  createdAt: string;
  property?: BookingProperty;
}

const STATUS_LABEL: Record<MyBooking['status'], { label: string; cls: string }> = {
  pending:   { label: '승인 대기', cls: 'statusPending' },
  confirmed: { label: '예약 확정', cls: 'statusConfirmed' },
  cancelled: { label: '취소됨',    cls: 'statusCancelled' },
  completed: { label: '이용 완료', cls: 'statusCompleted' },
};

export function MyBookingsPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<MyBooking[]>('/bookings/my');
      setBookings(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || '예약을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCancel(id: string) {
    if (!confirm('예약을 취소하시겠습니까?')) return;
    setCancelling(id);
    try {
      await api.patch(`/bookings/${id}/cancel`);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.error || '예약 취소에 실패했습니다.');
    } finally {
      setCancelling(null);
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>내 예약</h1>

      {error && <div className={styles.errorBox}>{error}</div>}

      {loading ? (
        <div className={styles.empty}>불러오는 중…</div>
      ) : bookings.length === 0 ? (
        <div className={styles.empty}>
          <p>예약 내역이 없습니다.</p>
          <button className={styles.linkBtn} onClick={() => navigate('/stays')}>스테이 둘러보기</button>
        </div>
      ) : (
        <div className={styles.list}>
          {bookings.map(b => {
            const s = STATUS_LABEL[b.status];
            const cover = b.property?.images?.[0];
            const canCancel = b.status === 'pending' || b.status === 'confirmed';
            return (
              <div key={b.id} className={styles.card}>
                <div
                  className={styles.thumb}
                  onClick={() => b.property && navigate(`/stays/${b.property.id}`)}
                >
                  {cover ? (
                    <img src={cover} alt={b.property?.title || ''} />
                  ) : (
                    <div className={styles.thumbPlaceholder}>이미지 없음</div>
                  )}
                </div>
                <div className={styles.body}>
                  <div className={styles.cardHead}>
                    <div className={styles.propTitle}>{b.property?.title ?? '(삭제된 숙소)'}</div>
                    <span className={`${styles.badge} ${styles[s.cls]}`}>{s.label}</span>
                  </div>
                  <div className={styles.meta}>{b.property?.city} · {b.property?.address}</div>
                  <div className={styles.dates}>
                    {b.checkIn} → {b.checkOut} · {b.guests}명
                  </div>
                  <div className={styles.priceRow}>
                    <span>총 결제액</span>
                    <strong>₩{Number(b.totalPrice).toLocaleString()}</strong>
                  </div>
                  {canCancel && (
                    <div className={styles.actions}>
                      <button
                        className={styles.cancelBtn}
                        onClick={() => handleCancel(b.id)}
                        disabled={cancelling === b.id}
                      >
                        {cancelling === b.id ? '취소 중…' : '예약 취소'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

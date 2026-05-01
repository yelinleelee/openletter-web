import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { HostSidebar } from '../Dashboard/HostSidebar';
import dashStyles from '../Dashboard/Dashboard.module.css';
import styles from './HostBookings.module.css';

interface BookingProperty {
  id: string;
  title: string;
  city: string;
  images: string[] | null;
}

interface BookingGuest {
  id: string;
  name: string;
  email: string;
}

interface HostBooking {
  id: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number | string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: string;
  createdAt: string;
  property?: BookingProperty;
  guest?: BookingGuest;
}

const STATUS_LABEL: Record<HostBooking['status'], { label: string; cls: string }> = {
  pending:   { label: '승인 대기', cls: 'statusPending' },
  confirmed: { label: '예약 확정', cls: 'statusConfirmed' },
  cancelled: { label: '취소됨',    cls: 'statusCancelled' },
  completed: { label: '이용 완료', cls: 'statusCompleted' },
};

export function HostBookingsPage() {
  const [bookings, setBookings] = useState<HostBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<HostBooking[]>('/bookings/host/me');
      setBookings(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || '예약을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleApprove(id: string) {
    setActing(id);
    try {
      await api.patch(`/bookings/${id}/approve`);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.error || '승인에 실패했습니다.');
    } finally {
      setActing(null);
    }
  }

  async function handleReject(id: string) {
    if (!confirm('이 예약을 거절(취소)하시겠습니까?')) return;
    setActing(id);
    try {
      await api.patch(`/bookings/${id}/cancel`, { reason: '호스트 거절' });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.error || '거절에 실패했습니다.');
    } finally {
      setActing(null);
    }
  }

  return (
    <div className={dashStyles.layout}>
      <HostSidebar />

      <main className={dashStyles.main}>
        <div className={dashStyles.mainHeader}>
          <h1 className={dashStyles.mainTitle}>예약 관리</h1>
        </div>

        {error && (
          <div style={{ padding: 14, background: '#fff5f5', border: '1px solid #ffcccc', borderRadius: 10, color: '#c0392b', fontSize: 14, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div className={dashStyles.section}>
          {loading ? (
            <div className={styles.empty}>불러오는 중…</div>
          ) : bookings.length === 0 ? (
            <div className={styles.empty}>아직 들어온 예약이 없습니다.</div>
          ) : (
            <div className={styles.list}>
              {bookings.map(b => {
                const s = STATUS_LABEL[b.status];
                const cover = b.property?.images?.[0];
                return (
                  <div key={b.id} className={styles.row}>
                    <div className={styles.thumb}>
                      {cover ? (
                        <img src={cover} alt={b.property?.title || ''} />
                      ) : (
                        <div className={styles.thumbPlaceholder}>—</div>
                      )}
                    </div>
                    <div className={styles.info}>
                      <div className={styles.propTitle}>{b.property?.title ?? '(삭제된 숙소)'}</div>
                      <div className={styles.guest}>
                        게스트: <strong>{b.guest?.name ?? '-'}</strong>
                        {b.guest?.email && <span className={styles.email}> · {b.guest.email}</span>}
                      </div>
                      <div className={styles.dates}>
                        {b.checkIn} → {b.checkOut} · {b.guests}명 · ₩{Number(b.totalPrice).toLocaleString()}
                      </div>
                    </div>
                    <div className={styles.statusCol}>
                      <span className={`${styles.badge} ${styles[s.cls]}`}>{s.label}</span>
                      {b.status === 'pending' && (
                        <div className={styles.actions}>
                          <button
                            className={styles.approveBtn}
                            onClick={() => handleApprove(b.id)}
                            disabled={acting === b.id}
                          >
                            {acting === b.id ? '처리 중…' : '승인'}
                          </button>
                          <button
                            className={styles.rejectBtn}
                            onClick={() => handleReject(b.id)}
                            disabled={acting === b.id}
                          >
                            거절
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
      </main>
    </div>
  );
}

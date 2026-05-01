import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Dashboard.module.css';
import { api } from '../../../lib/api';

interface MyProperty {
  id: string;
  title: string;
  city: string;
  address: string;
  price: number | string;
  currency: string;
  images: string[];
  rating: number | string;
  reviewCount: number;
  isAvailable: boolean;
}

interface HostBooking {
  id: string;
  status: string;
  checkIn: string;
  totalPrice: number | string;
}

const MENU = ['내 숙소', '예약 관리', '정산', '리뷰', '설정'];

export function HostDashboard() {
  const navigate = useNavigate();

  const [properties, setProperties] = useState<MyProperty[]>([]);
  const [bookings, setBookings] = useState<HostBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [propsRes, bookingsRes] = await Promise.all([
          api.get<MyProperty[]>('/properties/my'),
          api.get<HostBooking[]>('/bookings/host/me'),
        ]);
        if (cancelled) return;
        setProperties(propsRes.data);
        setBookings(bookingsRes.data);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.response?.data?.error || e?.message || '데이터를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    const activeBookings = bookings.filter(b => b.status !== 'cancelled');
    const now = new Date();
    const monthIncome = activeBookings.reduce((sum, b) => {
      const d = new Date(b.checkIn);
      if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
        return sum + Number(b.totalPrice || 0);
      }
      return sum;
    }, 0);
    const ratedProps = properties.filter(p => Number(p.reviewCount) > 0);
    const avgRating = ratedProps.length
      ? ratedProps.reduce((s, p) => s + Number(p.rating || 0), 0) / ratedProps.length
      : null;

    return [
      { label: '총 예약', value: `${activeBookings.length}건`, icon: '📅' },
      { label: '이번 달 수입', value: `₩${monthIncome.toLocaleString()}`, icon: '💰' },
      { label: '리뷰 평점', value: avgRating ? avgRating.toFixed(2) : '-', icon: '⭐' },
      { label: '등록 숙소', value: `${properties.length}개`, icon: '🏠' },
    ];
  }, [properties, bookings]);

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo} onClick={() => navigate('/')}>
          OPEN LETTER<span>HOST</span>
        </div>
        <nav className={styles.sidebarNav}>
          {MENU.map(item => (
            <div key={item} className={styles.sidebarItem}>{item}</div>
          ))}
        </nav>
        <button className={styles.guestModeBtn} onClick={() => navigate('/')}>← 게스트 모드</button>
      </aside>

      <main className={styles.main}>
        <div className={styles.mainHeader}>
          <h1 className={styles.mainTitle}>호스트 대시보드</h1>
          <button className={styles.registerBtn} onClick={() => navigate('/host/register/select')}>
            + 새 숙소 등록
          </button>
        </div>

        <div className={styles.statsGrid}>
          {stats.map(s => (
            <div key={s.label} className={styles.statCard}>
              <div className={styles.statIcon}>{s.icon}</div>
              <div className={styles.statLabel}>{s.label}</div>
              <div className={styles.statValue}>{loading ? '…' : s.value}</div>
            </div>
          ))}
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>내 숙소</h2>

          {error && (
            <div style={{ padding: 14, background: '#fff5f5', border: '1px solid #ffcccc', borderRadius: 10, color: '#c0392b', fontSize: 14, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--light)' }}>불러오는 중…</div>
          ) : properties.length === 0 ? (
            <div className={styles.emptyState}>
              <p>등록된 숙소가 없습니다.</p>
              <p>첫 번째 숙소를 등록해보세요!</p>
              <button className={styles.emptyBtn} onClick={() => navigate('/host/register/select')}>숙소 등록하기</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
              {properties.map(p => {
                const cover = p.images?.[0];
                return (
                  <div
                    key={p.id}
                    style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', background: 'white' }}
                    onClick={() => navigate(`/stays/${p.id}`)}
                  >
                    <div style={{ aspectRatio: '4 / 3', background: '#eee', overflow: 'hidden' }}>
                      {cover ? (
                        <img src={cover} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--light)', fontSize: 13 }}>이미지 없음</div>
                      )}
                    </div>
                    <div style={{ padding: 16 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.city} · {p.address}</div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>
                        ₩{Number(p.price).toLocaleString()} <span style={{ fontWeight: 400, color: 'var(--mid)', fontSize: 13 }}>/ 박</span>
                      </div>
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

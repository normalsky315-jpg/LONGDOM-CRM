import { Card } from '../components/ui/Card';

export function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <h2 className="brand-font font-bold text-[22px] m-0 mb-4.5" style={{ color: 'var(--foreground)' }}>{title}</h2>
      <Card className="p-10 text-center" style={{ color: 'var(--muted-foreground)' }}>
        此模組尚在後續階段施工中（銷售日報／來人分析／系統管理），目前先完成了首頁、客戶管理、銷控表、任務管理。
      </Card>
    </div>
  );
}

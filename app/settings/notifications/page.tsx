import NotificationSettings from "@/app/settings/notifications/notification-settings";

export const metadata = {
  title: "알림 설정 | 전경 개인 기록",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotificationSettingsPage() {
  return (
    <div className="page-shell settings-layout">
      <section className="section-heading">
        <div>
          <p className="eyebrow">휴대폰 앱 설정</p>
          <h1>푸시 알림</h1>
          <p>
            아침·오후·저녁 중 원하는 시간을 1~3개 선택하세요. 알림은 이 휴대폰
            한 대에만 연결됩니다.
          </p>
        </div>
      </section>
      <NotificationSettings />
    </div>
  );
}

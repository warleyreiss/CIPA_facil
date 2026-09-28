interface ConfigAccessNoticeProps {
  icon?: string;
  title: string;
  message: string;
}

export default function ConfigAccessNotice({
  icon = 'pi pi-lock',
  title,
  message,
}: ConfigAccessNoticeProps) {
  return (
    <div
      className="flex align-items-start gap-3 p-3 surface-ground border-round border-1 surface-border"
      role="status"
    >
      <i className={`${icon} text-primary text-xl mt-1`} aria-hidden />
      <div>
        <p className="m-0 mb-1 font-semibold">{title}</p>
        <p className="m-0 text-sm text-color-secondary">{message}</p>
      </div>
    </div>
  );
}

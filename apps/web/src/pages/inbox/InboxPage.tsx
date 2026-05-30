export function InboxPage() {
  return (
    <div className="-m-6 h-full overflow-hidden">
      <iframe
        src="https://mail.senior-dev.cloud"
        title="Inbox (Roundcube Webmail)"
        className="w-full h-full border-0"
      />
    </div>
  );
}

export function InboxPage() {
  return (
    <div className="-m-6 h-[calc(100vh-56px)] flex flex-col">
      <iframe
        src="https://mail.senior-dev.cloud"
        title="Inbox (Roundcube Webmail)"
        className="w-full flex-1 border-0"
      />
    </div>
  );
}

export function InboxPage() {
  return (
    <div className="-m-6 h-[calc(100vh-56px)]">
      <iframe
        src="/webmail/"
        title="Inbox (Roundcube)"
        className="w-full h-full border-0"
        allow="same-origin"
      />
    </div>
  );
}

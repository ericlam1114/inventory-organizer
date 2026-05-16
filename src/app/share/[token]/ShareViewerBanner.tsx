export function ShareViewerBanner({ senderName, expiresAt, note }: {
  senderName: string;
  expiresAt: string;
  note: string | null;
}) {
  return (
    <div className="bg-sand2 border-b border-rule px-6 lg:px-8 py-4">
      <div className="max-w-5xl mx-auto flex items-start justify-between gap-4">
        <div className="text-[13px] text-ink2">
          Shared by <span className="font-medium text-ink">{senderName}</span> &middot; Expires {new Date(expiresAt).toLocaleDateString()} &middot; <span className="uppercase tracking-wide">View only</span>
        </div>
      </div>
      {note && (
        <div className="max-w-5xl mx-auto mt-2 text-ink2 text-[14px] italic">&ldquo;{note}&rdquo;</div>
      )}
    </div>
  );
}

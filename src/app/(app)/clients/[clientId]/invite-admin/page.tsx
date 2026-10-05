import { redirect } from 'next/navigation';

// Invites are now text-able links created on the Team page.
export default function InviteAdminPage() {
  redirect('/settings/team');
}

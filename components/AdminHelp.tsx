export default function AdminHelp({ children }: { children: React.ReactNode }) {
  return <aside className="admin-help" role="note"><strong>How this works</strong><p>{children}</p><p>Changes to agency, requirement, resource, and tutorial content are saved in this browser only. They do not publish to other users or update Supabase. Check the official source before sharing information.</p></aside>;
}

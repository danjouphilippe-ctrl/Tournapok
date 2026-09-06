"use client";

export function ClubMemberRoleSelect({
  action,
  defaultRole,
}: {
  action: (formData: FormData) => void;
  defaultRole: string;
}) {
  return (
    <form action={action}>
      <select
        name="role"
        defaultValue={defaultRole}
        onChange={(e) => e.target.form?.requestSubmit()}
        className="input py-0.5 text-xs"
      >
        <option value="admin">Administrateur</option>
        <option value="treasurer">Trésorier</option>
        <option value="member">Membre</option>
      </select>
    </form>
  );
}

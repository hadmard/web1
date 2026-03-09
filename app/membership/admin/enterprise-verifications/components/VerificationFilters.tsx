type Status = "pending" | "approved" | "rejected";

export function VerificationFilters({
  statusFilter,
  onChange,
}: {
  statusFilter: "" | Status;
  onChange: (value: "" | Status) => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface-elevated p-4">
      <div className="flex flex-wrap gap-2">
        {[
          { key: "pending", label: "待审核" },
          { key: "approved", label: "已通过" },
          { key: "rejected", label: "已驳回" },
          { key: "", label: "全部" },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onChange(item.key as "" | Status)}
            className={`px-3 py-1.5 rounded border text-sm ${
              statusFilter === item.key ? "bg-accent text-white border-accent" : "border-border hover:bg-surface"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}

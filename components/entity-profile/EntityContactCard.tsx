import Image from "next/image";
import type { ReactNode } from "react";

type ContactItem = {
  label: string;
  value: string;
  href?: string | null;
};

export function EntityContactCard({
  eyebrow = "Contact",
  title,
  intro,
  primaryAction,
  secondaryAction,
  items,
  note,
  qrImageUrl,
  qrDescription,
}: {
  eyebrow?: string;
  title: string;
  intro: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  items: ContactItem[];
  note?: string | null;
  qrImageUrl?: string | null;
  qrDescription?: string | null;
}) {
  return (
    <section>
      <div className="overflow-hidden rounded-[30px] border border-[rgba(180,154,107,0.18)] bg-[linear-gradient(135deg,rgba(255,252,247,0.98)_0%,rgba(245,238,229,0.96)_48%,rgba(234,223,209,0.94)_100%)] shadow-[0_28px_90px_rgba(32,24,17,0.08)] sm:rounded-[36px]">
        <div className="grid gap-6 px-5 py-7 sm:px-10 sm:py-10 lg:grid-cols-[minmax(0,0.9fr),minmax(0,1.1fr)] lg:gap-8 lg:px-12">
          <div className="flex flex-col justify-center">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#9f7a46]">{eyebrow}</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-[#231b15] sm:text-5xl">{title}</h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-[#4e4033]">{intro}</p>
            {(primaryAction || secondaryAction) ? (
              <div className="mt-8 flex flex-wrap gap-4">
                {primaryAction}
                {secondaryAction}
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),220px]">
            <div className="rounded-[24px] border border-[rgba(180,154,107,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(255,251,245,0.72))] p-5 shadow-[0_18px_36px_rgba(35,26,18,0.05)] sm:rounded-[28px] sm:p-6">
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[18px] border border-[rgba(180,154,107,0.12)] bg-white/88 px-4 py-4 shadow-[0_10px_24px_rgba(35,26,18,0.03)] sm:rounded-[22px] sm:px-5"
                  >
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#9f7a46]">{item.label}</p>
                    {item.href ? (
                      <a
                        href={item.href}
                        target={item.href.startsWith("http") ? "_blank" : undefined}
                        rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                        className="mt-2 block text-lg leading-7 text-[#231b15] underline-offset-4 hover:text-[#a47b45] hover:underline"
                      >
                        {item.value}
                      </a>
                    ) : (
                      <p className="mt-2 text-lg leading-7 text-[#231b15]">{item.value}</p>
                    )}
                  </div>
                ))}
              </div>
              {note ? <p className="mt-5 text-sm leading-7 text-[#6d5d4f]">{note}</p> : null}
            </div>

            {qrImageUrl ? (
              <div className="rounded-[24px] border border-[rgba(180,154,107,0.16)] bg-white/78 p-5 shadow-[0_16px_32px_rgba(35,26,18,0.05)] sm:rounded-[28px]">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#9f7a46]">扫码联系</p>
                <div className="mt-4 flex items-center justify-center overflow-hidden rounded-[18px] border border-[rgba(180,154,107,0.14)] bg-white p-3 sm:rounded-[20px]">
                  <Image src={qrImageUrl} alt="联系二维码" width={220} height={220} className="h-full w-full object-contain" />
                </div>
                {qrDescription ? <p className="mt-3 text-sm leading-6 text-[#6d5d4f]">{qrDescription}</p> : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

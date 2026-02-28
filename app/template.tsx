"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function RootTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, [pathname]);

  return (
    <div
      key={pathname}
      className={`route-transition ${ready ? "route-transition--ready" : "route-transition--instant"}`}
    >
      {children}
    </div>
  );
}

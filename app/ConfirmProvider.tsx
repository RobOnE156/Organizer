"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ConfirmOpts = {
  title?: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

const ConfirmCtx = createContext<(opts: ConfirmOpts) => Promise<boolean>>(async () => false);

// In-app confirmation dialog. Replaces window.confirm (which iOS can suppress
// after "block further dialogs"), so a destructive action always asks first.
export function useConfirm() {
  return useContext(ConfirmCtx);
}

export default function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOpts | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOpts) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setOpts(o);
    });
  }, []);

  const close = useCallback((v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
  }, []);

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {opts
        ? createPortal(
            <div className="cfmwrap" role="dialog" aria-modal="true" onClick={() => close(false)}>
              <div className="cfmcard" onClick={(e) => e.stopPropagation()}>
                {opts.title ? <h2 className="cfmtitle">{opts.title}</h2> : null}
                {opts.body ? <p className="cfmbody">{opts.body}</p> : null}
                <div className="row" style={{ justifyContent: "flex-end", marginTop: 4 }}>
                  <button type="button" className="btn" onClick={() => close(false)}>
                    {opts.cancelLabel ?? "Abbrechen"}
                  </button>
                  <button
                    type="button"
                    className={"btn " + (opts.danger ? "btn-danger" : "btn-primary")}
                    onClick={() => close(true)}
                  >
                    {opts.confirmLabel ?? "Löschen"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </ConfirmCtx.Provider>
  );
}

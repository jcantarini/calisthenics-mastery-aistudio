// Manual progress editor (Sprint 7.4B-2).
// Presentation only: every calculation comes from the pure manualProgress
// model, and persistence happens through the callback owned by the route.

import { useEffect, useId, useRef, useState } from "react";
import { Check, PencilLine } from "lucide-react";
import type { GoalProgressSignal } from "@/services/goals/goalEvents";
import type { Goal } from "@/services/goals/goalTypes";
import { goalTrackingMode } from "@/services/goals/goalTrackingCapability";
import { useGoalsT } from "@/lib/goals-i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createSingleFlightGuard } from "./goalSubmissionGuard";
import { unitLabelKey } from "./goalPresentation";
import {
  buildManualSignal,
  isManualProgressEligible,
  manualProgressModel,
  previewManualProgress,
  validateManualValue,
} from "./manualProgress";

function trim(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
}

export function GoalManualProgress({
  goal,
  pending,
  onSubmit,
}: {
  goal: Goal;
  pending: boolean;
  /** Resolves true when the progress was saved. The component never persists. */
  onSubmit: (signal: GoalProgressSignal) => Promise<boolean>;
}) {
  const { tg } = useGoalsT();
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [localPending, setLocalPending] = useState(false);
  const guard = useRef(createSingleFlightGuard());
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmTitleRef = useRef<HTMLHeadingElement>(null);
  const fieldId = useId();

  const eligible = isManualProgressEligible(goal);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (confirming) confirmTitleRef.current?.focus();
  }, [confirming]);

  if (!eligible) return null;

  const model = manualProgressModel(goal);
  const busy = pending || localPending;
  const unit = tg(unitLabelKey(goal.unit));
  const isPending = goalTrackingMode(goal) === "pending";
  const parsed = validateManualValue(model, model.input === "boolean" ? 1 : raw);
  const preview = parsed.ok ? previewManualProgress(goal, model, parsed.value) : null;

  const reset = () => {
    setRaw("");
    setError(null);
    setSaveError(false);
  };

  const submit = async (value: number) => {
    if (busy) return;
    setLocalPending(true);
    setSaveError(false);
    try {
      const done = await guard.current.run(() => onSubmit(buildManualSignal(model, value)));
      if (done === true) {
        setConfirming(false);
        setOpen(false);
        reset();
      } else if (done === false) {
        setSaveError(true);
      }
    } catch {
      // Never surface a raw database error; the friendly message is enough.
      setSaveError(true);
    } finally {
      setLocalPending(false);
    }
  };

  const requestSubmit = () => {
    if (busy) return;
    if (!parsed.ok) {
      setError(tg(parsed.errorKey));
      inputRef.current?.focus();
      return;
    }
    setError(null);
    if (preview?.completes) {
      setConfirming(true);
      return;
    }
    void submit(parsed.value);
  };

  const errorId = `${fieldId}-error`;
  const previewId = `${fieldId}-preview`;

  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
      <p className="text-xs text-muted-foreground">
        {tg(isPending ? "gl.mp.pendingNote" : "gl.mp.manualNote")}
      </p>

      {!open ? (
        <Button
          type="button"
          variant="secondary"
          className="mt-3 min-h-11 w-full rounded-full"
          disabled={busy}
          onClick={() => setOpen(true)}
        >
          {model.input === "boolean" ? (
            <Check className="h-4 w-4" aria-hidden />
          ) : (
            <PencilLine className="h-4 w-4" aria-hidden />
          )}
          {tg(model.input === "boolean" ? "gl.mp.markAchieved" : "gl.mp.open")}
        </Button>
      ) : (
        <div className="mt-3 space-y-3">
          {model.input === "numeric" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor={fieldId} className="text-xs">
                  {tg(model.labelKey)}
                  {unit ? ` (${unit})` : ""}
                </Label>
                <Input
                  id={fieldId}
                  ref={inputRef}
                  type="number"
                  inputMode={model.decimal ? "decimal" : "numeric"}
                  step={model.step}
                  min={model.min}
                  value={raw}
                  disabled={busy}
                  aria-invalid={error !== null}
                  aria-describedby={error ? errorId : previewId}
                  className="min-h-11"
                  onChange={(e) => {
                    setRaw(e.target.value);
                    setError(null);
                  }}
                />
                <p id={previewId} className="text-xs text-muted-foreground">
                  {tg("gl.mp.current")}: {trim(goal.currentValue)} / {trim(goal.targetValue)}
                  {unit ? ` ${unit}` : ""}
                  {preview ? ` — ${trim(preview.currentValue)} → ${trim(preview.nextValue)}` : ""}
                </p>
              </div>

              {model.quickAdds.length > 0 ? (
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label={tg("gl.mp.quickAdd")}
                >
                  {model.quickAdds.map((amount) => {
                    const selected = raw !== "" && parseDecimalInput(raw) === amount;
                    return (
                      <button
                        key={amount}
                        type="button"
                        disabled={busy}
                        aria-pressed={selected}
                        className={cn(
                          "min-h-11 rounded-full border px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selected
                            ? "border-primary bg-primary/15 text-primary underline underline-offset-4"
                            : "border-border/60 text-muted-foreground",
                        )}
                        onClick={() => {
                          setRaw(String(amount));
                          setError(null);
                        }}
                      >
                        +{amount}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm">{tg("gl.mp.booleanHint")}</p>
          )}

          {error ? (
            <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
              {error}
            </p>
          ) : null}
          {saveError ? (
            <p role="alert" className="text-xs font-medium text-destructive">
              {tg("gl.mp.err.save")}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 flex-1 rounded-full"
              disabled={busy}
              onClick={() => {
                if (busy) return;
                setOpen(false);
                reset();
              }}
            >
              {tg("gl.mp.cancel")}
            </Button>
            <Button
              type="button"
              className="min-h-11 flex-1 rounded-full"
              disabled={busy}
              onClick={requestSubmit}
            >
              {busy ? tg("gl.mp.saving") : tg("gl.mp.save")}
            </Button>
          </div>
        </div>
      )}

      <AlertDialog
        open={confirming}
        onOpenChange={(next) => !next && !busy && setConfirming(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle ref={confirmTitleRef} tabIndex={-1}>
              {tg("gl.mp.confirm.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>{tg("gl.mp.confirm.desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{tg("gl.mp.confirm.no")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                if (busy || !parsed.ok) return;
                void submit(parsed.value);
              }}
            >
              {busy ? tg("gl.mp.saving") : tg("gl.mp.confirm.yes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Goal Creation Wizard (Sprint 7.4B-1).
// Presentation + explicit wizard state only. Every domain decision (validation,
// persistence, events) stays inside GoalService and the pure template adapter.

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { CreateGoalInput, GoalCategory, GoalDifficulty } from "@/services/goals/goalTypes";
import { GOAL_DIFFICULTIES } from "@/services/goals/goalTypes";
import { validateCreateGoal } from "@/services/goals/goalValidation";
import { useGoalsT } from "@/lib/goals-i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { createSingleFlightGuard } from "./goalSubmissionGuard";
import { GoalCategoryCard } from "./GoalCategoryCard";
import { GoalTemplateCard } from "./GoalTemplateCard";
import { GoalReviewCard } from "./GoalReviewCard";
import { difficultyLabelKey, unitLabelKey } from "./goalPresentation";
import {
  CUSTOM_KINDS,
  WIZARD_CATEGORIES,
  buildCreateGoalInput,
  emptyDraft,
  findCustomKind,
  findTemplate,
  selectCategory,
  selectCustomKind,
  selectTemplate,
  targetBounds,
  templatesForCategory,
  todayKey,
  validateDraft,
  type GoalDraft,
} from "./goalTemplates";

const STEP_KEYS = ["category", "goal", "target", "tune", "review"] as const;
type StepKey = (typeof STEP_KEYS)[number];

const STEP_TITLE: Record<StepKey, string> = {
  category: "gl.wizard.category",
  goal: "gl.wizard.goal",
  target: "gl.wizard.target",
  tune: "gl.wizard.tune",
  review: "gl.wizard.review",
};

export function GoalCreationWizard({
  open,
  pending,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  /** Resolves true when the goal was created; the wizard never calls Supabase. */
  onCreate: (input: CreateGoalInput) => Promise<boolean>;
}) {
  const { tg } = useGoalsT();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<GoalDraft>(emptyDraft);
  const [showIssues, setShowIssues] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [localSubmitting, setLocalSubmitting] = useState(false);
  const guard = useRef(createSingleFlightGuard());
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);
  const fieldId = useId();

  const today = todayKey();
  const template = findTemplate(draft.templateId);
  const customKind = findCustomKind(draft.customKindId);
  const isCustom = template?.id === "custom";
  const bounds = targetBounds(draft);
  const issues = useMemo(() => validateDraft(draft, today), [draft, today]);
  const issueFor = (field: "title" | "target" | "deadline") =>
    showIssues ? issues.find((i) => i.field === field) : undefined;

  const input = useMemo(() => buildCreateGoalInput(draft, tg, today), [draft, tg, today]);
  const currentStep = STEP_KEYS[step] as StepKey;

  // Move focus to the step heading so screen readers announce the new step.
  useEffect(() => {
    if (open) headingRef.current?.focus();
  }, [step, open]);

  const reset = () => {
    setStep(0);
    setDraft(emptyDraft());
    setShowIssues(false);
    setSubmitError(false);
  };

  const requestClose = () => {
    if (pending) return;
    if (draft.category !== null) {
      setConfirmDiscard(true);
      return;
    }
    onOpenChange(false);
  };

  const canContinue = () => {
    if (currentStep === "category") return draft.category !== null;
    if (currentStep === "goal") return draft.templateId !== null;
    if (currentStep === "target") return issues.every((i) => i.field === "deadline");
    if (currentStep === "tune") return issues.length === 0;
    return true;
  };

  const goNext = () => {
    if (!canContinue()) {
      setShowIssues(true);
      const first = issues[0];
      if (first?.field === "title") titleInputRef.current?.focus();
      else if (first?.field === "target") targetInputRef.current?.focus();
      return;
    }
    setShowIssues(false);
    setStep((s) => Math.min(s + 1, STEP_KEYS.length - 1));
  };

  const goBack = () => {
    setShowIssues(false);
    setStep((s) => Math.max(s - 1, 0));
  };

  const submit = async () => {
    if (effectivePending || !input) return;
    if (issues.length > 0 || !validateCreateGoal(input).valid) {
      setShowIssues(true);
      setStep(2);
      return;
    }
    setLocalSubmitting(true);
    setSubmitError(false);
    try {
      const created = await guard.current.run(() => onCreate(input));
      if (created === undefined) return; // another submission is in flight
      if (created) {
        onOpenChange(false);
        reset();
      } else {
        setSubmitError(true);
      }
    } catch (error) {
      console.error("[goals] goal creation failed", error);
      setSubmitError(true);
    } finally {
      setLocalSubmitting(false);
    }
  };

  const setTarget = (value: number) => {
    setDraft((d) => ({ ...d, target: value }));
  };

  const questionKey = isCustom
    ? `gl.ck.q.${draft.customKindId}`
    : `gl.t.${template?.id ?? "custom"}.q`;

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) requestClose();
          else onOpenChange(true);
        }}
      >
        <SheetContent
          side="bottom"
          closeLabel={tg("gl.close")}
          className="flex max-h-[92dvh] flex-col rounded-t-3xl pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:mx-auto sm:max-w-lg"
        >
          <SheetHeader className="text-left">
            <p className="text-xs font-medium text-muted-foreground" aria-live="polite">
              {tg("gl.wizard.step")} {step + 1} {tg("gl.wizard.of")} {STEP_KEYS.length}
            </p>
            <SheetTitle className="text-lg leading-tight">{tg("gl.wizard.title")}</SheetTitle>
            <SheetDescription>{tg("gl.wizard.desc")}</SheetDescription>
          </SheetHeader>

          <div
            className="-mx-1 mt-2 flex-1 space-y-4 overflow-y-auto px-1 pb-2"
            data-step={currentStep}
          >
            <div className="space-y-1">
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="text-base font-semibold outline-none"
                aria-live="polite"
              >
                {tg(STEP_TITLE[currentStep])}
              </h2>
              <p className="text-xs text-muted-foreground">{tg(`gl.wizard.hint.${currentStep}`)}</p>
            </div>

            {/* STEP 1 — category */}
            {currentStep === "category" ? (
              <div role="radiogroup" aria-label={tg("gl.wizard.category")} className="grid gap-2">
                {WIZARD_CATEGORIES.map((category: GoalCategory) => (
                  <GoalCategoryCard
                    key={category}
                    category={category}
                    selected={draft.category === category}
                    onSelect={(next) => setDraft((d) => selectCategory(d, next))}
                  />
                ))}
              </div>
            ) : null}

            {/* STEP 2 — template */}
            {currentStep === "goal" && draft.category ? (
              <div role="radiogroup" aria-label={tg("gl.wizard.goal")} className="grid gap-2">
                {templatesForCategory(draft.category).map((item) => (
                  <GoalTemplateCard
                    key={item.id}
                    template={item}
                    selected={draft.templateId === item.id}
                    onSelect={(next) => setDraft(selectTemplate(next))}
                  />
                ))}
              </div>
            ) : null}

            {/* STEP 3 — target */}
            {currentStep === "target" && template ? (
              <div className="space-y-4">
                {isCustom ? (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor={`${fieldId}-title`}>{tg("gl.wizard.customTitle")}</Label>
                      <Input
                        id={`${fieldId}-title`}
                        ref={titleInputRef}
                        value={draft.customTitle}
                        placeholder={tg("gl.wizard.customTitlePh")}
                        aria-invalid={Boolean(issueFor("title"))}
                        aria-describedby={issueFor("title") ? `${fieldId}-title-error` : undefined}
                        onChange={(e) => setDraft((d) => ({ ...d, customTitle: e.target.value }))}
                        className="min-h-11"
                      />
                      {issueFor("title") ? (
                        <p
                          id={`${fieldId}-title-error`}
                          role="alert"
                          className="text-xs text-destructive"
                        >
                          {tg(issueFor("title")!.messageKey)}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`${fieldId}-desc`}>{tg("gl.wizard.customDesc")}</Label>
                      <Textarea
                        id={`${fieldId}-desc`}
                        rows={2}
                        value={draft.customDescription}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, customDescription: e.target.value }))
                        }
                      />
                    </div>

                    <fieldset className="space-y-2">
                      <legend className="text-sm font-medium">{tg("gl.wizard.customKind")}</legend>
                      <div className="flex flex-wrap gap-2">
                        {CUSTOM_KINDS.map((kind) => (
                          <button
                            key={kind.id}
                            type="button"
                            role="radio"
                            aria-checked={draft.customKindId === kind.id}
                            onClick={() => setDraft((d) => selectCustomKind(d, kind))}
                            className={cn(
                              "min-h-11 rounded-full border px-4 text-sm transition-colors",
                              draft.customKindId === kind.id
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border/60 text-muted-foreground",
                            )}
                          >
                            {tg(`gl.ck.${kind.id}`)}
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    {customKind && customKind.units.length > 1 ? (
                      <fieldset className="space-y-2">
                        <legend className="text-sm font-medium">
                          {tg("gl.wizard.customUnit")}
                        </legend>
                        <div className="flex flex-wrap gap-2">
                          {customKind.units.map((unit) => (
                            <button
                              key={unit}
                              type="button"
                              role="radio"
                              aria-checked={draft.customUnit === unit}
                              onClick={() => setDraft((d) => ({ ...d, customUnit: unit }))}
                              className={cn(
                                "min-h-11 rounded-full border px-4 text-sm transition-colors",
                                draft.customUnit === unit
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border/60 text-muted-foreground",
                              )}
                            >
                              {tg(unitLabelKey(unit))}
                            </button>
                          ))}
                        </div>
                      </fieldset>
                    ) : null}
                  </>
                ) : null}

                {bounds.numeric ? (
                  <div className="space-y-1.5">
                    <Label htmlFor={`${fieldId}-target`}>{tg(questionKey)}</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={tg("gl.wizard.less")}
                        className="min-h-11 min-w-11 rounded-full"
                        onClick={() => setTarget(Math.max(bounds.min, draft.target - bounds.step))}
                      >
                        <Minus className="h-4 w-4" aria-hidden />
                      </Button>
                      <Input
                        id={`${fieldId}-target`}
                        ref={targetInputRef}
                        type="number"
                        inputMode="numeric"
                        min={bounds.min}
                        max={bounds.max}
                        step={bounds.step}
                        value={String(draft.target)}
                        aria-invalid={Boolean(issueFor("target"))}
                        aria-describedby={
                          issueFor("target") ? `${fieldId}-target-error` : undefined
                        }
                        onChange={(e) => setTarget(Number(e.target.value))}
                        className="min-h-11 text-center text-lg font-semibold"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={tg("gl.wizard.more")}
                        className="min-h-11 min-w-11 rounded-full"
                        onClick={() => setTarget(Math.min(bounds.max, draft.target + bounds.step))}
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tg(unitLabelKey(input?.unit ?? "workouts"))} · {bounds.min}–{bounds.max}
                    </p>
                    {issueFor("target") ? (
                      <p
                        id={`${fieldId}-target-error`}
                        role="alert"
                        className="text-xs text-destructive"
                      >
                        {tg(issueFor("target")!.messageKey)}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
                    {tg("gl.wizard.noTarget")}
                  </p>
                )}

                {template.id === "weekly_workouts" ? (
                  <p className="text-xs text-muted-foreground">{tg("gl.wizard.weeklyNote")}</p>
                ) : null}
              </div>
            ) : null}

            {/* STEP 4 — difficulty + deadline */}
            {currentStep === "tune" && template ? (
              <div className="space-y-5">
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">{tg("gl.difficulty")}</legend>
                  <div className="grid gap-2">
                    {GOAL_DIFFICULTIES.map((difficulty: GoalDifficulty) => (
                      <button
                        key={difficulty}
                        type="button"
                        role="radio"
                        aria-checked={draft.difficulty === difficulty}
                        onClick={() => setDraft((d) => ({ ...d, difficulty }))}
                        className={cn(
                          "min-h-11 rounded-2xl border p-3 text-left transition-colors",
                          draft.difficulty === difficulty
                            ? "border-primary bg-primary/10"
                            : "border-border/60 bg-card/40",
                        )}
                      >
                        <span className="block text-sm font-semibold">
                          {tg(difficultyLabelKey(difficulty))}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {tg(`gl.diffHint.${difficulty}`)}
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                {template.allowDeadline ? (
                  <div className="space-y-1.5">
                    <Label htmlFor={`${fieldId}-date`}>{tg("gl.wizard.deadline")}</Label>
                    <Input
                      id={`${fieldId}-date`}
                      type="date"
                      min={today}
                      value={draft.targetDate ?? ""}
                      aria-invalid={Boolean(issueFor("deadline"))}
                      aria-describedby={
                        issueFor("deadline") ? `${fieldId}-date-error` : `${fieldId}-date-hint`
                      }
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, targetDate: e.target.value || null }))
                      }
                      className="min-h-11"
                    />
                    <p id={`${fieldId}-date-hint`} className="text-xs text-muted-foreground">
                      {tg("gl.wizard.deadlineHint")}
                    </p>
                    {issueFor("deadline") ? (
                      <p
                        id={`${fieldId}-date-error`}
                        role="alert"
                        className="text-xs text-destructive"
                      >
                        {tg(issueFor("deadline")!.messageKey)}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{tg("gl.wizard.weeklyNote")}</p>
                )}
              </div>
            ) : null}

            {/* STEP 5 — review */}
            {currentStep === "review" && input ? (
              <div className="space-y-3">
                <GoalReviewCard input={input} />
                {submitError ? (
                  <p role="alert" className="text-xs text-destructive">
                    {tg("gl.wizard.error")}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex gap-2 border-t border-border/50 pt-3">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 flex-1 rounded-full"
              disabled={pending}
              onClick={step === 0 ? requestClose : goBack}
            >
              {step === 0 ? tg("gl.close") : tg("gl.wizard.prev")}
            </Button>
            {currentStep === "review" ? (
              <Button
                type="button"
                className="min-h-11 flex-1 rounded-full"
                disabled={pending}
                onClick={() => void submit()}
              >
                {pending ? tg("gl.wizard.creating") : tg("gl.wizard.finish")}
              </Button>
            ) : (
              <Button
                type="button"
                className="min-h-11 flex-1 rounded-full"
                onClick={goNext}
                disabled={pending}
              >
                {tg("gl.wizard.next")}
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tg("gl.wizard.discard.title")}</AlertDialogTitle>
            <AlertDialogDescription>{tg("gl.wizard.discard.desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tg("gl.wizard.keepEditing")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDiscard(false);
                onOpenChange(false);
                reset();
              }}
            >
              {tg("gl.wizard.discard.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

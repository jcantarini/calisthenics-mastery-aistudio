// Goal Creation Wizard (Sprint 7.4B-1, hardened in 7.5A).
// Presentation + explicit wizard state only. Every domain decision (validation,
// persistence, events) stays inside GoalService and the pure template adapter.

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { CreateGoalInput, GoalCategory, GoalDifficulty, GoalUnit } from "@/services/goals/goalTypes";
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
import { GoalRadioGroup } from "./GoalRadioGroup";
import { GoalReviewCard } from "./GoalReviewCard";
import { difficultyLabelKey, unitLabelKey } from "./goalPresentation";
import { isDecimalUnit } from "./manualProgress";
import { formatNumericInput, validateNumericInput } from "./numericInput";
import {
  WIZARD_STEP_KEYS,
  routeForIssues,
  stepIndexForField,
  type WizardStepKey,
} from "./wizardNavigation";
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
  type DraftErrorField,
  type DraftIssue,
  type GoalDraft,
} from "./goalTemplates";

const STEP_TITLE: Record<WizardStepKey, string> = {
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
  const [targetText, setTargetText] = useState("");
  const [showIssues, setShowIssues] = useState(false);
  const [focusRequest, setFocusRequest] = useState<DraftErrorField | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [localSubmitting, setLocalSubmitting] = useState(false);
  const guard = useRef(createSingleFlightGuard());
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const fieldId = useId();

  const today = todayKey();
  const template = findTemplate(draft.templateId);
  const customKind = findCustomKind(draft.customKindId);
  const isCustom = template?.id === "custom";
  const bounds = targetBounds(draft);
  const input = useMemo(() => buildCreateGoalInput(draft, tg, today), [draft, tg, today]);
  const resolvedUnit: GoalUnit = input?.unit ?? draft.customUnit;
  const allowDecimal = isDecimalUnit(resolvedUnit);

  const targetCheck = useMemo(
    () =>
      validateNumericInput(targetText, {
        min: bounds.min,
        max: bounds.max,
        allowDecimal,
      }),
    [targetText, bounds.min, bounds.max, allowDecimal],
  );

  // Canonical issue list: domain-shaped draft checks + the localized numeric
  // check for the raw target text (the draft never stores NaN).
  const issues: DraftIssue[] = useMemo(() => {
    const base = validateDraft(draft, today).filter(
      (issue) => !(bounds.numeric && issue.field === "target"),
    );
    if (bounds.numeric && !targetCheck.ok) {
      base.push({ field: "target", messageKey: targetCheck.messageKey });
    }
    return base;
  }, [draft, today, bounds.numeric, targetCheck]);

  const issueFor = (field: DraftErrorField) =>
    showIssues ? issues.find((i) => i.field === field) : undefined;

  const currentStep = WIZARD_STEP_KEYS[step] as WizardStepKey;
  const effectivePending = pending || localSubmitting;

  // Focus: the requested invalid field once its step has mounted, otherwise
  // the step heading so screen readers announce the new step.
  useEffect(() => {
    if (!open) return;
    if (focusRequest && stepIndexForField(focusRequest) === step) {
      const target =
        focusRequest === "title"
          ? titleInputRef.current
          : focusRequest === "target"
            ? targetInputRef.current
            : dateInputRef.current;
      if (target) {
        target.focus();
        setFocusRequest(null);
        return;
      }
    }
    headingRef.current?.focus();
  }, [step, open, focusRequest]);

  const reset = () => {
    setStep(0);
    setDraft(emptyDraft());
    setTargetText("");
    setShowIssues(false);
    setFocusRequest(null);
    setSubmitError(false);
  };

  const applyDraft = (next: GoalDraft) => {
    setDraft(next);
    setTargetText(targetBounds(next).numeric ? formatNumericInput(next.target) : "");
    setSubmitError(false);
  };

  const requestClose = () => {
    if (effectivePending) return;
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

  /** Routes to the step that actually owns the first invalid field. */
  const routeToFirstIssue = () => {
    setShowIssues(true);
    const route = routeForIssues(issues);
    if (!route) return;
    setStep(route.step);
    setFocusRequest(route.field);
  };

  const goNext = () => {
    if (!canContinue()) {
      routeToFirstIssue();
      return;
    }
    setShowIssues(false);
    setSubmitError(false);
    setStep((s) => Math.min(s + 1, WIZARD_STEP_KEYS.length - 1));
  };

  const goBack = () => {
    setShowIssues(false);
    setStep((s) => Math.max(s - 1, 0));
  };

  const submit = async () => {
    if (effectivePending) return;
    if (!input || issues.length > 0 || !validateCreateGoal(input).valid) {
      routeToFirstIssue();
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
    const clamped = Math.min(bounds.max, Math.max(bounds.min, value));
    const rounded = allowDecimal ? Math.round(clamped * 10) / 10 : Math.round(clamped);
    setDraft((d) => ({ ...d, target: rounded }));
    setTargetText(formatNumericInput(rounded));
    setSubmitError(false);
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
          onEscapeKeyDown={(event) => {
            if (effectivePending) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (effectivePending) event.preventDefault();
          }}
          aria-busy={effectivePending}
          className="flex max-h-[92dvh] flex-col rounded-t-3xl pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:mx-auto sm:max-w-lg"
        >
          <SheetHeader className="text-left">
            <p className="text-xs font-medium text-muted-foreground" aria-live="polite">
              {tg("gl.wizard.step")} {step + 1} {tg("gl.wizard.of")} {WIZARD_STEP_KEYS.length}
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
              <GoalRadioGroup
                label={tg("gl.wizard.category")}
                className="grid gap-2"
                options={WIZARD_CATEGORIES}
                getKey={(category: GoalCategory) => category}
                isSelected={(category) => draft.category === category}
                onSelect={(category) => applyDraft(selectCategory(draft, category))}
                renderOption={(category, props, selected) => (
                  <GoalCategoryCard category={category} selected={selected} radioProps={props} />
                )}
              />
            ) : null}

            {/* STEP 2 — template */}
            {currentStep === "goal" && draft.category ? (
              <GoalRadioGroup
                label={tg("gl.wizard.goal")}
                className="grid gap-2"
                options={templatesForCategory(draft.category)}
                getKey={(item) => item.id}
                isSelected={(item) => draft.templateId === item.id}
                onSelect={(item) => applyDraft(selectTemplate(item))}
                renderOption={(item, props, selected) => (
                  <GoalTemplateCard template={item} selected={selected} radioProps={props} />
                )}
              />
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
                        onChange={(e) => {
                          setDraft((d) => ({ ...d, customTitle: e.target.value }));
                          setSubmitError(false);
                        }}
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
                      <GoalRadioGroup
                        label={tg("gl.wizard.customKind")}
                        className="flex flex-wrap gap-2"
                        options={CUSTOM_KINDS}
                        getKey={(kind) => kind.id}
                        isSelected={(kind) => draft.customKindId === kind.id}
                        onSelect={(kind) => applyDraft(selectCustomKind(draft, kind))}
                        renderOption={(kind, props, selected) => (
                          <button
                            type="button"
                            {...props}
                            className={cn(
                              "min-h-11 rounded-full border px-4 text-sm transition-colors",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              selected
                                ? "border-primary bg-primary/10 font-semibold text-primary underline underline-offset-4"
                                : "border-border/60 text-muted-foreground",
                            )}
                          >
                            {tg(`gl.ck.${kind.id}`)}
                          </button>
                        )}
                      />
                    </fieldset>

                    {customKind && customKind.units.length > 1 ? (
                      <fieldset className="space-y-2">
                        <legend className="text-sm font-medium">
                          {tg("gl.wizard.customUnit")}
                        </legend>
                        <GoalRadioGroup
                          label={tg("gl.wizard.customUnit")}
                          className="flex flex-wrap gap-2"
                          options={customKind.units}
                          getKey={(unit) => unit}
                          isSelected={(unit) => draft.customUnit === unit}
                          onSelect={(unit) => {
                            setDraft((d) => ({ ...d, customUnit: unit }));
                            setSubmitError(false);
                          }}
                          renderOption={(unit, props, selected) => (
                            <button
                              type="button"
                              {...props}
                              className={cn(
                                "min-h-11 rounded-full border px-4 text-sm transition-colors",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                selected
                                  ? "border-primary bg-primary/10 font-semibold text-primary underline underline-offset-4"
                                  : "border-border/60 text-muted-foreground",
                              )}
                            >
                              {tg(unitLabelKey(unit))}
                            </button>
                          )}
                        />
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
                        onClick={() => setTarget(draft.target - bounds.step)}
                      >
                        <Minus className="h-4 w-4" aria-hidden />
                      </Button>
                      <Input
                        id={`${fieldId}-target`}
                        ref={targetInputRef}
                        type="text"
                        inputMode={allowDecimal ? "decimal" : "numeric"}
                        autoComplete="off"
                        value={targetText}
                        aria-invalid={Boolean(issueFor("target"))}
                        aria-describedby={
                          issueFor("target") ? `${fieldId}-target-error` : `${fieldId}-target-hint`
                        }
                        onChange={(e) => {
                          const text = e.target.value;
                          setTargetText(text);
                          setSubmitError(false);
                          const check = validateNumericInput(text, {
                            min: bounds.min,
                            max: bounds.max,
                            allowDecimal,
                          });
                          // The draft only ever holds a finite number.
                          if (check.ok) setDraft((d) => ({ ...d, target: check.value }));
                        }}
                        className="min-h-11 text-center text-lg font-semibold"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={tg("gl.wizard.more")}
                        className="min-h-11 min-w-11 rounded-full"
                        onClick={() => setTarget(draft.target + bounds.step)}
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                    <p id={`${fieldId}-target-hint`} className="text-xs text-muted-foreground">
                      {tg(unitLabelKey(resolvedUnit))} · {bounds.min}–{bounds.max}
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
                  <GoalRadioGroup
                    label={tg("gl.difficulty")}
                    className="grid gap-2"
                    options={GOAL_DIFFICULTIES}
                    getKey={(difficulty: GoalDifficulty) => difficulty}
                    isSelected={(difficulty) => draft.difficulty === difficulty}
                    onSelect={(difficulty) => {
                      setDraft((d) => ({ ...d, difficulty }));
                      setSubmitError(false);
                    }}
                    renderOption={(difficulty, props, selected) => (
                      <button
                        type="button"
                        {...props}
                        className={cn(
                          "min-h-11 rounded-2xl border p-3 text-left transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selected
                            ? "border-primary bg-primary/10"
                            : "border-border/60 bg-card/40",
                        )}
                      >
                        <span className="block text-sm font-semibold">
                          {tg(difficultyLabelKey(difficulty))}
                          {selected ? " ✓" : ""}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {tg(`gl.diffHint.${difficulty}`)}
                        </span>
                      </button>
                    )}
                  />
                </fieldset>

                {template.allowDeadline ? (
                  <div className="space-y-1.5">
                    <Label htmlFor={`${fieldId}-date`}>{tg("gl.wizard.deadline")}</Label>
                    <Input
                      id={`${fieldId}-date`}
                      ref={dateInputRef}
                      type="date"
                      min={today}
                      value={draft.targetDate ?? ""}
                      aria-invalid={Boolean(issueFor("deadline"))}
                      aria-describedby={
                        issueFor("deadline") ? `${fieldId}-date-error` : `${fieldId}-date-hint`
                      }
                      onChange={(e) => {
                        setDraft((d) => ({ ...d, targetDate: e.target.value || null }));
                        setSubmitError(false);
                      }}
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
                {effectivePending ? (
                  <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
                    {tg("gl.wizard.creating")}
                  </p>
                ) : null}
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
              disabled={effectivePending}
              onClick={step === 0 ? requestClose : goBack}
            >
              {step === 0 ? tg("gl.close") : tg("gl.wizard.prev")}
            </Button>
            {currentStep === "review" ? (
              <Button
                type="button"
                className="min-h-11 flex-1 rounded-full"
                disabled={effectivePending}
                onClick={() => void submit()}
              >
                {effectivePending ? tg("gl.wizard.creating") : tg("gl.wizard.finish")}
              </Button>
            ) : (
              <Button
                type="button"
                className="min-h-11 flex-1 rounded-full"
                onClick={goNext}
                disabled={effectivePending}
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

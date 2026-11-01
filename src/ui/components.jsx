import React, { useId, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { Button as BaseButton } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "../components/ui/collapsible";
import { Slider as BaseSlider } from "../components/ui/slider";
import {
  Select as SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/ui/select";
import { Checkbox as BaseCheckbox } from "../components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group";
import { begin, commit, S } from "./store.js";
import Tooltip, { HelpTip } from "./Tooltip.jsx";
export function Button({
  icon: Icon,
  children,
  tone = "",
  className = "",
  tip,
  ...props
}) {
  return (
    <Tooltip text={tip}>
      <BaseButton
        variant={
          tone === "primary"
            ? "default"
            : tone === "quiet" || className.includes("icon-button")
              ? "ghost"
              : "outline"
        }
        type="button"
        className={`button ${tone} ${className}`}
        {...props}
      >
        {Icon && <Icon size={17} strokeWidth={1.8} aria-hidden="true" />}
        {children}
      </BaseButton>
    </Tooltip>
  );
}
export function IconButton({ icon: Icon, label, className = "", ...props }) {
  return (
    <Button
      icon={Icon}
      className={`icon-button ${className}`}
      aria-label={label}
      tip={label}
      {...props}
    />
  );
}
export function Section({ title, children, aside, className = "" }) {
  return (
    <section className={"section " + className}>
      {title && (
        <div className="section-heading">
          <h2>{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}
export function Disclosure({ title, icon: Icon, children, badge }) {
  return (
    <Collapsible className="disclosure" disabled={S.busy}>
      <div className="disclosure-heading">
        <CollapsibleTrigger className="disclosure-trigger">
          {Icon && <Icon size={17} aria-hidden="true" />}
          <span>{title}</span>
          <ChevronDown size={15} className="chevron" aria-hidden="true" />
        </CollapsibleTrigger>
        {badge && <div className="disclosure-aside">{badge}</div>}
      </div>
      <CollapsibleContent className="disclosure-body">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
export function Field({ label, children, hint }) {
  return (
    <div className="field">
      <span className="field-label">
        {label}
        {hint && <HelpTip label={label + "说明"} text={hint} />}
      </span>
      {children}
    </div>
  );
}
export function Slider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = "",
  onChange,
  id,
}) {
  const auto = useId();
  const keyboard = useRef(false);
  return (
    <div className="field">
      <span className="field-label" id={auto + "-label"}>
        {label}
        <output>
          {Number(value).toFixed(step < 1 ? 1 : 0)}
          {unit}
        </output>
      </span>
      <BaseSlider
        id={id || auto}
        className="slider-root"
        aria-label={label}
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={S.busy}
        onFocus={begin}
        onValueChange={([v]) => {
          begin();
          onChange(v, true);
        }}
        onValueCommit={() => {
          if (!keyboard.current) commit();
        }}
        onKeyDown={() => {
          keyboard.current = true;
        }}
        onKeyUp={() => {
          keyboard.current = false;
          commit();
        }}
        onBlur={() => {
          keyboard.current = false;
          commit();
        }}
      />
    </div>
  );
}
export function Select({ label, value, options, onChange, id }) {
  const auto = useId();
  return (
    <div className="field">
      <label className="field-label" htmlFor={id || auto}>
        {label}
      </label>
      <SelectRoot
        value={String(value ?? "")}
        disabled={S.busy}
        onValueChange={onChange}
      >
        <SelectTrigger
          className="select-trigger"
          aria-label={label}
          id={id || auto}
        >
          <SelectValue placeholder={options.find(([v]) => v === "")?.[1]} />
        </SelectTrigger>
        <SelectContent
          position="popper"
          sideOffset={5}
          collisionPadding={8}
          className={`select-content ui-theme ${S.dark ? "dark" : ""}`}
        >
          {options
            .filter(([v]) => v !== "")
            .map(([v, t]) => (
              <SelectItem key={v} value={String(v)} className="select-option">
                {t}
              </SelectItem>
            ))}
        </SelectContent>
      </SelectRoot>
    </div>
  );
}
export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 16384,
  step = 1,
  id,
  onStart,
}) {
  const auto = useId();
  const [editing, setEditing] = useState(false),
    [draft, setDraft] = useState("");
  return (
    <label className="field" htmlFor={id || auto}>
      <span className="field-label">{label}</span>
      <Input
        aria-label={label}
        id={id || auto}
        type="number"
        min={min}
        max={max}
        step={step}
        value={editing ? draft : value}
        onFocus={() => {
          onStart?.();
          begin();
          setEditing(true);
          setDraft(String(value));
        }}
        onChange={(e) => {
          const text = e.target.value;
          setDraft(text);
          const v = Number(text);
          if (text !== "" && Number.isFinite(v) && v >= min && v <= max)
            onChange(v, true);
        }}
        onBlur={() => {
          setEditing(false);
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    </label>
  );
}
export function Check({ label, checked, onChange }) {
  const id = useId();
  return (
    <div className="check">
      <BaseCheckbox
        id={id}
        className="checkbox-control"
        disabled={S.busy}
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
      />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}
export function Color({ label = "颜色", value, onChange }) {
  const palette = [
    "#ffffff",
    "#25242c",
    "#7361cf",
    "#4169b2",
    "#bc6a52",
    "#d3b982",
  ];
  return (
    <div className="field">
      <span className="field-label">
        {label}
        <span className="hex-value">{value.toUpperCase()}</span>
      </span>
      <div className="color-row">
        {palette.map((c) => (
          <button
            key={c}
            type="button"
            className={`swatch ${value === c ? "selected" : ""}`}
            style={{ "--swatch": c }}
            aria-label={`${label} ${c}`}
            aria-pressed={value === c}
            onClick={() => onChange(c)}
          />
        ))}
        <label className="custom-color" title="自选颜色">
          <input
            aria-label={`${label} 自选`}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
export function Segmented({ label, value, options, onChange }) {
  return (
    <ToggleGroup
      onKeyDown={(event) => {
        if (
          [
            "ArrowLeft",
            "ArrowRight",
            "ArrowUp",
            "ArrowDown",
            "Home",
            "End",
          ].includes(event.key)
        )
          event.stopPropagation();
      }}
      className="segmented"
      type="single"
      value={String(value)}
      disabled={S.busy}
      aria-label={label}
      onValueChange={(v) => {
        if (v) onChange(options.find(([key]) => String(key) === v)[0]);
      }}
    >
      {options.map(([v, t, Icon]) => (
        <ToggleGroupItem
          key={v}
          value={String(v)}
          className={value === v ? "selected" : ""}
        >
          {Icon && <Icon size={15} />}
          <span>{t}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
export function Modal({
  title,
  subtitle,
  tip,
  children,
  onClose,
  className = "",
  footer,
  onKeyDown,
}) {
  const ref = useRef();
  const opener = useRef(document.activeElement);
  const descriptionId = useId();
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        onKeyDown={onKeyDown}
        ref={ref}
        data-modal="true"
        className={`modal ui-theme ${S.dark ? "dark" : ""} ${className}`}
        aria-describedby={subtitle ? descriptionId : undefined}
        onPointerDownOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (
            ref.current?.querySelector(
              'input:not([type="hidden"]):not([type="color"]):not([type="file"]), textarea',
            ) || ref.current
          )?.focus();
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          if (opener.current?.isConnected) opener.current.focus();
        }}
      >
        <div className="modal-heading">
          <div>
            <div className="modal-title-row">
              <DialogTitle>{title}</DialogTitle>
              {tip && <HelpTip label={title + "说明"} text={tip} />}
            </div>
            {subtitle && (
              <DialogDescription id={descriptionId}>
                {subtitle}
              </DialogDescription>
            )}
          </div>
          <IconButton icon={X} label="关闭弹窗" onClick={onClose} />
        </div>
        <div className="modal-content">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </DialogContent>
    </Dialog>
  );
}

import React, { useState } from "react";
import {
  Tooltip as BaseTooltip,
  TooltipProvider as BaseTooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "../components/ui/tooltip";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "../components/ui/popover";
import { Info } from "lucide-react";
import { S } from "./store.js";

export function TooltipProvider({ children }) {
  return (
    <BaseTooltipProvider delayDuration={250} skipDelayDuration={100}>
      {children}
    </BaseTooltipProvider>
  );
}

export default function Tooltip({ text, children, disabled = false }) {
  if (!text) return children;
  return (
    <BaseTooltip open={disabled ? false : undefined}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>

      <TooltipContent
        className="ui-tooltip"
        sideOffset={7}
        collisionPadding={8}
      >
        {text}
      </TooltipContent>
    </BaseTooltip>
  );
}

export function HelpTip({ label = "操作提示", text }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip text={text} disabled={open}>
        <PopoverTrigger type="button" className="help-tip" aria-label={label}>
          <Info size={14} aria-hidden="true" />
        </PopoverTrigger>
      </Tooltip>

      <PopoverContent
        data-help-popover="true"
        className={`help-popover ui-theme ${S.dark ? "dark" : ""}`}
        sideOffset={7}
        collisionPadding={8}
        aria-label={label}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        {text}
      </PopoverContent>
    </Popover>
  );
}

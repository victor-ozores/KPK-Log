import { RiInformationLine } from "@remixicon/react";

export default function InfoTooltip({ text }) {
  return (
    <span className="relative inline-flex group/tip">
      <RiInformationLine className="h-3.5 w-3.5 text-slate-400 group-hover/tip:text-gray-300 cursor-help transition-colors" />
      <span
        role="tooltip"
        className="pointer-events-none absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2
          w-52 rounded-lg bg-dark-tremor-background-subtle border border-dark-tremor-border px-3 py-2 text-left
          text-[11px] leading-snug text-gray-200 shadow-xl
          opacity-0 scale-95 origin-bottom transition-all duration-100
          group-hover/tip:opacity-100 group-hover/tip:scale-100"
      >
        {text}
        <span className="absolute left-1/2 -translate-x-1/2 top-full h-2 w-2 rotate-45 bg-dark-tremor-background-subtle border-r border-b border-dark-tremor-border" />
      </span>
    </span>
  );
}

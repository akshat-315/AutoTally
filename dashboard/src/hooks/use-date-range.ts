import { createContext, useContext, useState, type ReactNode } from "react";
import { createElement } from "react";
import { toISODate } from "@/lib/utils";

interface DateRangeCtx {
  startDate: string;
  endDate: string;
  setStartDate: (d: string) => void;
  setEndDate: (d: string) => void;
}

const now = new Date();
const defaultStart = toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
const defaultEnd = toISODate(now);

const DateRangeContext = createContext<DateRangeCtx>({
  startDate: defaultStart,
  endDate: defaultEnd,
  setStartDate: () => {},
  setEndDate: () => {},
});

export function useDateRange() {
  return useContext(DateRangeContext);
}

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  return createElement(
    DateRangeContext.Provider,
    { value: { startDate, endDate, setStartDate, setEndDate } },
    children,
  );
}

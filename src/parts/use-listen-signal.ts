import { ReadonlySignal } from "@preact/signals-react";
import { useEffect, useState } from "react";

export function useListenSignal<T>(signal: ReadonlySignal<T>) {
  const [value, setValue] = useState(signal.value)

  useEffect(() => {
    return signal.subscribe(setValue)
  }, [signal]);

  return value
}

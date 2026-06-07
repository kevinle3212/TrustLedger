"use client";

import { scan } from "react-scan";
import { useEffect } from "react";

/** Activates React Scan in development to highlight unnecessary re-renders. */
export function ReactScanMonitor(): null {
	useEffect(() => {
		scan({ enabled: true, log: false });
	}, []);
	return null;
}

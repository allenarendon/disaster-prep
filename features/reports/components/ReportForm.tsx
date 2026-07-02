"use client";

import { useState } from "react";
import type { EvacStatus, LocationRef, ReportType } from "@/features/shared/types";
import { Button } from "@/features/shared/components/Button";
import { ErrorState } from "@/features/shared/components/ErrorState";

function getClientHash(): string {
  const key = "disaster-prep-session";
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(key, sessionId);
  }
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = (hash << 5) - hash + sessionId.charCodeAt(i);
    hash |= 0;
  }
  return `hash-${Math.abs(hash).toString(36)}`;
}

export function ReportForm({ location }: { location: LocationRef }) {
  const [type, setType] = useState<ReportType>("EVAC_STATUS");
  const [message, setMessage] = useState("");
  const [targetEvacCenterId, setTargetEvacCenterId] = useState("");
  const [reportedStatus, setReportedStatus] = useState<EvacStatus>("OPEN");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    setErrorMessage("");

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          targetEvacCenterId:
            type === "EVAC_STATUS" ? targetEvacCenterId : undefined,
          location,
          message,
          reportedStatus: type === "EVAC_STATUS" ? reportedStatus : undefined,
          submittedAt: new Date().toISOString(),
          clientHash: getClientHash(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(
          data.error?.message ??
            "Your report could not be submitted. Please try again."
        );
        return;
      }

      setStatus("success");
      setMessage("");
      setTargetEvacCenterId("");
    } catch {
      setStatus("error");
      setErrorMessage(
        "Your report could not be submitted. Please check your connection."
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700">Report type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ReportType)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="EVAC_STATUS">Evacuation center status</option>
          <option value="ROAD_CONDITION">Road condition</option>
          <option value="OTHER_HAZARD">Other hazard</option>
        </select>
      </div>

      {type === "EVAC_STATUS" && (
        <>
          <div>
            <label className="text-sm font-medium text-slate-700">
              Evacuation center ID
            </label>
            <input
              type="text"
              value={targetEvacCenterId}
              onChange={(e) => setTargetEvacCenterId(e.target.value)}
              placeholder="e.g. evac-mandaluyong-001"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Status</label>
            <select
              value={reportedStatus}
              onChange={(e) =>
                setReportedStatus(e.target.value as EvacStatus)
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="OPEN">Open</option>
              <option value="FULL">Full</option>
              <option value="CLOSED">Closed</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </div>
        </>
      )}

      <div>
        <label className="text-sm font-medium text-slate-700">
          Message (max 280 characters)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 280))}
          maxLength={280}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          required
        />
        <p className="text-xs text-slate-500">{message.length}/280</p>
      </div>

      {status === "error" && (
        <ErrorState title="Report not submitted" message={errorMessage} />
      )}

      {status === "success" && (
        <p className="text-sm text-ph-blue">Thank you. Your report has been submitted and will be reviewed.</p>
      )}

      <Button type="submit">Submit report</Button>
    </form>
  );
}
